import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app';
import { registerUser } from './utils/register-user';
import { ProfileResponseDto } from '../src/modules/profiles/dto/profile-response.dto';

describe('Follow flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('anonymous can view a profile with following=false', async () => {
    const target = await registerUser(app);

    const res = await request(app.getHttpServer())
      .get(`/profiles/${target.username}`)
      .expect(200);

    const body = res.body as ProfileResponseDto;
    expect(body.profile).toMatchObject({
      username: target.username,
      following: false,
    });
  });

  it('GET profile for a non-existent username returns 404', async () => {
    await request(app.getHttpServer())
      .get('/profiles/does-not-exist-user')
      .expect(404);
  });

  it('follow requires authentication', async () => {
    const target = await registerUser(app);

    await request(app.getHttpServer())
      .post(`/profiles/${target.username}/follow`)
      .expect(401);
  });

  it('full follow -> profile -> unfollow -> profile cycle', async () => {
    const follower = await registerUser(app);
    const target = await registerUser(app);

    const followRes = await request(app.getHttpServer())
      .post(`/profiles/${target.username}/follow`)
      .set('Authorization', `Bearer ${follower.token}`)
      .expect(201);
    expect((followRes.body as ProfileResponseDto).profile).toMatchObject({
      username: target.username,
      following: true,
    });

    const profileAfterFollow = await request(app.getHttpServer())
      .get(`/profiles/${target.username}`)
      .set('Authorization', `Bearer ${follower.token}`)
      .expect(200);
    expect(
      (profileAfterFollow.body as ProfileResponseDto).profile.following,
    ).toBe(true);

    const unfollowRes = await request(app.getHttpServer())
      .delete(`/profiles/${target.username}/follow`)
      .set('Authorization', `Bearer ${follower.token}`)
      .expect(200);
    expect((unfollowRes.body as ProfileResponseDto).profile).toMatchObject({
      username: target.username,
      following: false,
    });

    const profileAfterUnfollow = await request(app.getHttpServer())
      .get(`/profiles/${target.username}`)
      .set('Authorization', `Bearer ${follower.token}`)
      .expect(200);
    expect(
      (profileAfterUnfollow.body as ProfileResponseDto).profile.following,
    ).toBe(false);
  });

  it('rejects following yourself with 409', async () => {
    const user = await registerUser(app);

    await request(app.getHttpServer())
      .post(`/profiles/${user.username}/follow`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(409);
  });

  it('rejects following the same user twice with 409', async () => {
    const follower = await registerUser(app);
    const target = await registerUser(app);

    await request(app.getHttpServer())
      .post(`/profiles/${target.username}/follow`)
      .set('Authorization', `Bearer ${follower.token}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/profiles/${target.username}/follow`)
      .set('Authorization', `Bearer ${follower.token}`)
      .expect(409);
  });

  it('rejects unfollowing a user you do not follow with 404', async () => {
    const follower = await registerUser(app);
    const target = await registerUser(app);

    await request(app.getHttpServer())
      .delete(`/profiles/${target.username}/follow`)
      .set('Authorization', `Bearer ${follower.token}`)
      .expect(404);
  });

  it('rejects follow of a non-existent username with 404', async () => {
    const follower = await registerUser(app);

    await request(app.getHttpServer())
      .post('/profiles/does-not-exist-user/follow')
      .set('Authorization', `Bearer ${follower.token}`)
      .expect(404);
  });
});

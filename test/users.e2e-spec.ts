import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { registerUser } from './utils/register-user';
import { UserResponseDto } from '../src/modules/users/dto/user-response.dto';
import { User } from '../src/modules/users/entities/user.entity';
import {
  Attachment,
  AttachmentOwnerType,
} from '../src/modules/attachments/entities/attachment.entity';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('Users flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects PUT /user without a token with 401', async () => {
    await request(app.getHttpServer())
      .put('/user')
      .send({ bio: 'hello' })
      .expect(401);
  });

  it('updates the current user bio', async () => {
    const user = await registerUser(app);

    const res = await request(app.getHttpServer())
      .put('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ bio: 'I like NestJS' })
      .expect(200);

    const body = res.body as UserResponseDto;
    expect(body.user).toMatchObject({
      username: user.username,
      bio: 'I like NestJS',
    });
  });

  it('is a no-op when the update body is empty', async () => {
    const user = await registerUser(app);

    const res = await request(app.getHttpServer())
      .put('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .send({})
      .expect(200);

    const body = res.body as UserResponseDto;
    expect(body.user).toMatchObject({
      username: user.username,
      email: user.email,
    });
  });

  it('rejects updating to a username already taken with 409', async () => {
    const other = await registerUser(app);
    const user = await registerUser(app);

    await request(app.getHttpServer())
      .put('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ username: other.username })
      .expect(409);
  });

  it('rejects an invalid update payload with 400', async () => {
    const user = await registerUser(app);

    await request(app.getHttpServer())
      .put('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('uploads a valid avatar and updates the image field', async () => {
    const user = await registerUser(app);

    const res = await request(app.getHttpServer())
      .put('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .attach('avatar', TINY_PNG, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(200);

    const body = res.body as UserResponseDto;
    expect(body.user.image).toMatch(/^\/attachments\/.+/);
  });

  it('rejects an avatar with a disallowed mime type with 400', async () => {
    const user = await registerUser(app);

    await request(app.getHttpServer())
      .put('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .attach('avatar', Buffer.from('not an image'), {
        filename: 'evil.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('rolls back the avatar swap when the rest of the update fails', async () => {
    const other = await registerUser(app);
    const user = await registerUser(app);

    const uploadRes = await request(app.getHttpServer())
      .put('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .attach('avatar', TINY_PNG, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(200);
    const originalImage = (uploadRes.body as UserResponseDto).user.image;

    await request(app.getHttpServer())
      .put('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .field('username', other.username)
      .attach('avatar', TINY_PNG, {
        filename: 'avatar-2.png',
        contentType: 'image/png',
      })
      .expect(409);

    const profileRes = await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect((profileRes.body as UserResponseDto).user.image).toBe(originalImage);

    const dataSource = app.get(DataSource);
    const userRow = await dataSource
      .getRepository(User)
      .findOneByOrFail({ username: user.username });
    const attachments = await dataSource.getRepository(Attachment).find({
      where: {
        ownerType: AttachmentOwnerType.USER_AVATAR,
        ownerId: userRow.id,
      },
    });
    // Exactly the original attachment must survive: the DB delete of the
    // old row and the insert of the failed replacement must both roll back
    // together with the failed username update, not just leave *some* row.
    const originalAttachmentId = originalImage?.split('/').pop();
    expect(attachments.map((a) => a.id)).toEqual([originalAttachmentId]);
  });
});

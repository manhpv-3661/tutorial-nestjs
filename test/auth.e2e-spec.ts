import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app';
import { registerUser } from './utils/register-user';
import { ErrorEnvelope, UserEnvelope } from './utils/response-types';

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new user and returns a token', async () => {
    const suffix = randomUUID().slice(0, 8);
    const username = `user_${suffix}`;
    const email = `${username}@example.com`;

    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ username, email, password: 'password123' })
      .expect(201);

    const body = res.body as UserEnvelope;
    expect(body.user).toMatchObject({ username, email });
    expect(typeof body.user.token).toBe('string');
    expect(body.user.token.length).toBeGreaterThan(0);
  });

  it('rejects registration with an already-registered email with 409', async () => {
    const existing = await registerUser(app);

    await request(app.getHttpServer())
      .post('/users')
      .send({
        username: `user_${randomUUID().slice(0, 8)}`,
        email: existing.email,
        password: 'password123',
      })
      .expect(409);
  });

  it('rejects registration with invalid payload with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ username: 'ab', email: 'not-an-email', password: 'short' })
      .expect(400);

    const body = res.body as ErrorEnvelope;
    expect(body.errors.body.length).toBeGreaterThan(0);
  });

  it('logs in with correct credentials', async () => {
    const user = await registerUser(app);

    const res = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: user.email, password: user.password })
      .expect(200);

    const body = res.body as UserEnvelope;
    expect(body.user).toMatchObject({
      username: user.username,
      email: user.email,
    });
  });

  it('rejects login with wrong password with 401', async () => {
    const user = await registerUser(app);

    await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects login with unknown email with 401', async () => {
    await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: 'nobody@example.com', password: 'password123' })
      .expect(401);
  });

  it('rejects GET /user without a token with 401', async () => {
    await request(app.getHttpServer()).get('/user').expect(401);
  });

  it('returns the current user for GET /user with a valid token', async () => {
    const user = await registerUser(app);

    const res = await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    const body = res.body as UserEnvelope;
    expect(body.user).toMatchObject({
      username: user.username,
      email: user.email,
    });
  });

  it('revokes the token on logout so it can no longer be used', async () => {
    const user = await registerUser(app);

    await request(app.getHttpServer())
      .post('/users/logout')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(401);
  });
});

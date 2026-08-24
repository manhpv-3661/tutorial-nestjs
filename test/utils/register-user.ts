import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserEnvelope } from './response-types';

export interface RegisteredUser {
  username: string;
  email: string;
  password: string;
  token: string;
}

export async function registerUser(
  app: INestApplication<App>,
): Promise<RegisteredUser> {
  const suffix = randomUUID().slice(0, 8);
  const username = `user_${suffix}`;
  const email = `${username}@example.com`;
  const password = 'password123';

  const res = await request(app.getHttpServer())
    .post('/users')
    .send({ username, email, password })
    .expect(201);

  const body = res.body as UserEnvelope;
  return { username, email, password, token: body.user.token };
}

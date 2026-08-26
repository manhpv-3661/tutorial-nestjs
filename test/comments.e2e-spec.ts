import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app';
import { registerUser } from './utils/register-user';
import { ArticleResponseDto } from '../src/modules/articles/dto/article-response.dto';
import { CommentResponseDto } from '../src/modules/comments/dto/comment-response.dto';
import { CommentsListResponseDto } from '../src/modules/comments/dto/comments-list-response.dto';

describe('Comments flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createArticle(token: string) {
    const res = await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'How to train your dragon',
        description: 'Ever wonder how?',
        body: 'It takes a Jacobian',
      })
      .expect(201);
    return (res.body as ArticleResponseDto).article;
  }

  it('create requires authentication', async () => {
    const author = await registerUser(app);
    const article = await createArticle(author.token);

    await request(app.getHttpServer())
      .post(`/articles/${article.slug}/comments`)
      .send({ body: 'nice article' })
      .expect(401);
  });

  it('returns 404 when the article does not exist', async () => {
    const author = await registerUser(app);

    await request(app.getHttpServer())
      .post('/articles/does-not-exist/comments')
      .set('Authorization', `Bearer ${author.token}`)
      .send({ body: 'nice article' })
      .expect(404);

    await request(app.getHttpServer())
      .get('/articles/does-not-exist/comments')
      .expect(404);
  });

  it('adds a comment and returns it with the author profile', async () => {
    const author = await registerUser(app);
    const commenter = await registerUser(app);
    const article = await createArticle(author.token);

    await request(app.getHttpServer())
      .post(`/profiles/${commenter.username}/follow`)
      .set('Authorization', `Bearer ${author.token}`)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/articles/${article.slug}/comments`)
      .set('Authorization', `Bearer ${author.token}`)
      .send({ body: 'nice article' })
      .expect(201);

    const comment = (res.body as CommentResponseDto).comment;
    expect(comment).toMatchObject({
      body: 'nice article',
      author: { username: author.username, following: false },
    });
  });

  it('lists comments oldest first, anonymous and authenticated', async () => {
    const author = await registerUser(app);
    const commenter = await registerUser(app);
    const article = await createArticle(author.token);

    await request(app.getHttpServer())
      .post(`/articles/${article.slug}/comments`)
      .set('Authorization', `Bearer ${author.token}`)
      .send({ body: 'first comment' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/articles/${article.slug}/comments`)
      .set('Authorization', `Bearer ${commenter.token}`)
      .send({ body: 'second comment' })
      .expect(201);

    const anonRes = await request(app.getHttpServer())
      .get(`/articles/${article.slug}/comments`)
      .expect(200);
    const anonComments = (anonRes.body as CommentsListResponseDto).comments;
    expect(anonComments.map((c) => c.body)).toEqual([
      'first comment',
      'second comment',
    ]);
    expect(anonComments[0].author.following).toBe(false);
  });

  it('delete requires authentication', async () => {
    const author = await registerUser(app);
    const article = await createArticle(author.token);
    const commentRes = await request(app.getHttpServer())
      .post(`/articles/${article.slug}/comments`)
      .set('Authorization', `Bearer ${author.token}`)
      .send({ body: 'nice article' })
      .expect(201);
    const comment = (commentRes.body as CommentResponseDto).comment;

    await request(app.getHttpServer())
      .delete(`/articles/${article.slug}/comments/${comment.id}`)
      .expect(401);
  });

  it('rejects deleting a comment you do not own with 403, then allows the author to delete it', async () => {
    const author = await registerUser(app);
    const other = await registerUser(app);
    const article = await createArticle(author.token);
    const commentRes = await request(app.getHttpServer())
      .post(`/articles/${article.slug}/comments`)
      .set('Authorization', `Bearer ${author.token}`)
      .send({ body: 'nice article' })
      .expect(201);
    const comment = (commentRes.body as CommentResponseDto).comment;

    await request(app.getHttpServer())
      .delete(`/articles/${article.slug}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/articles/${article.slug}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${author.token}`)
      .expect(204);

    const listRes = await request(app.getHttpServer())
      .get(`/articles/${article.slug}/comments`)
      .expect(200);
    expect((listRes.body as CommentsListResponseDto).comments).toEqual([]);
  });

  it('returns 404 when deleting an unknown comment id', async () => {
    const author = await registerUser(app);
    const article = await createArticle(author.token);

    await request(app.getHttpServer())
      .delete(
        `/articles/${article.slug}/comments/00000000-0000-0000-0000-000000000000`,
      )
      .set('Authorization', `Bearer ${author.token}`)
      .expect(404);
  });
});

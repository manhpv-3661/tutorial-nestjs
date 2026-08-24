import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app';
import { registerUser } from './utils/register-user';
import { ArticleResponseDto } from '../src/modules/articles/dto/article-response.dto';
import { ArticlesListResponseDto } from '../src/modules/articles/dto/articles-list-response.dto';

function uniqueTag(label: string): string {
  return `${label}-${randomUUID().slice(0, 8)}`;
}

describe('Articles flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createArticle(
    token: string,
    overrides: Partial<{
      title: string;
      description: string;
      body: string;
      tagList: string[];
    }> = {},
  ) {
    const res = await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'How to train your dragon',
        description: 'Ever wonder how?',
        body: 'It takes a Jacobian',
        tagList: ['dragons', 'training'],
        ...overrides,
      })
      .expect(201);
    return (res.body as ArticleResponseDto).article;
  }

  it('create requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/articles')
      .send({ title: 't', description: 'd', body: 'b' })
      .expect(401);
  });

  it('creates an article with a generated slug and default favorite state', async () => {
    const author = await registerUser(app);

    const article = await createArticle(author.token);

    expect(article).toMatchObject({
      title: 'How to train your dragon',
      description: 'Ever wonder how?',
      body: 'It takes a Jacobian',
      tagList: ['dragons', 'training'],
      favorited: false,
      favoritesCount: 0,
      author: { username: author.username, following: false },
    });
    expect(article.slug).toMatch(/^how-to-train-your-dragon-/);
  });

  it('GET /articles/:slug returns 404 for an unknown slug', async () => {
    await request(app.getHttpServer())
      .get('/articles/does-not-exist')
      .expect(404);
  });

  it('GET /articles/:slug returns the article anonymously', async () => {
    const author = await registerUser(app);
    const article = await createArticle(author.token);

    const res = await request(app.getHttpServer())
      .get(`/articles/${article.slug}`)
      .expect(200);

    expect((res.body as ArticleResponseDto).article.slug).toBe(article.slug);
  });

  it('lists articles, most recent first, and supports the tag filter', async () => {
    const author = await registerUser(app);
    const tagA = uniqueTag('tag-a');
    const tagB = uniqueTag('tag-b');
    const first = await createArticle(author.token, {
      title: 'first article',
      tagList: [tagA],
    });
    const second = await createArticle(author.token, {
      title: 'second article',
      tagList: [tagB],
    });

    const all = await request(app.getHttpServer()).get('/articles').expect(200);
    const allBody = all.body as ArticlesListResponseDto;
    const slugs = allBody.articles.map((a) => a.slug);
    expect(slugs.indexOf(second.slug)).toBeLessThan(slugs.indexOf(first.slug));

    const byTag = await request(app.getHttpServer())
      .get('/articles')
      .query({ tag: tagA })
      .expect(200);
    const byTagBody = byTag.body as ArticlesListResponseDto;
    expect(byTagBody.articles.map((a) => a.slug)).toEqual([first.slug]);
  });

  it('filters the list by author username, empty result for an unknown author', async () => {
    const author = await registerUser(app);
    const article = await createArticle(author.token);

    const byAuthor = await request(app.getHttpServer())
      .get('/articles')
      .query({ author: author.username })
      .expect(200);
    expect(
      (byAuthor.body as ArticlesListResponseDto).articles.map((a) => a.slug),
    ).toContain(article.slug);

    const byUnknownAuthor = await request(app.getHttpServer())
      .get('/articles')
      .query({ author: 'does-not-exist-user' })
      .expect(200);
    expect(byUnknownAuthor.body as ArticlesListResponseDto).toMatchObject({
      articles: [],
      articlesCount: 0,
    });
  });

  it('rejects updating an article you do not own with 403', async () => {
    const author = await registerUser(app);
    const other = await registerUser(app);
    const article = await createArticle(author.token);

    await request(app.getHttpServer())
      .put(`/articles/${article.slug}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ title: 'hijacked' })
      .expect(403);
  });

  it('updates an article and regenerates the slug when the title changes', async () => {
    const author = await registerUser(app);
    const article = await createArticle(author.token);

    const res = await request(app.getHttpServer())
      .put(`/articles/${article.slug}`)
      .set('Authorization', `Bearer ${author.token}`)
      .send({ title: 'a brand new title' })
      .expect(200);

    const updated = (res.body as ArticleResponseDto).article;
    expect(updated.title).toBe('a brand new title');
    expect(updated.slug).not.toBe(article.slug);
    expect(updated.slug).toMatch(/^a-brand-new-title-/);

    await request(app.getHttpServer())
      .get(`/articles/${article.slug}`)
      .expect(404);
  });

  it('rejects deleting an article you do not own with 403, then allows the author to delete it', async () => {
    const author = await registerUser(app);
    const other = await registerUser(app);
    const article = await createArticle(author.token);

    await request(app.getHttpServer())
      .delete(`/articles/${article.slug}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/articles/${article.slug}`)
      .set('Authorization', `Bearer ${author.token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/articles/${article.slug}`)
      .expect(404);
  });

  it('favorite requires authentication', async () => {
    const author = await registerUser(app);
    const article = await createArticle(author.token);

    await request(app.getHttpServer())
      .post(`/articles/${article.slug}/favorite`)
      .expect(401);
  });

  it('full favorite -> list(favorited) -> unfavorite cycle, rejecting duplicates', async () => {
    const author = await registerUser(app);
    const fan = await registerUser(app);
    const article = await createArticle(author.token);

    const favoriteRes = await request(app.getHttpServer())
      .post(`/articles/${article.slug}/favorite`)
      .set('Authorization', `Bearer ${fan.token}`)
      .expect(201);
    expect((favoriteRes.body as ArticleResponseDto).article).toMatchObject({
      favorited: true,
      favoritesCount: 1,
    });

    await request(app.getHttpServer())
      .post(`/articles/${article.slug}/favorite`)
      .set('Authorization', `Bearer ${fan.token}`)
      .expect(409);

    const byFavorited = await request(app.getHttpServer())
      .get('/articles')
      .query({ favorited: fan.username })
      .expect(200);
    expect(
      (byFavorited.body as ArticlesListResponseDto).articles.map((a) => a.slug),
    ).toEqual([article.slug]);

    const unfavoriteRes = await request(app.getHttpServer())
      .delete(`/articles/${article.slug}/favorite`)
      .set('Authorization', `Bearer ${fan.token}`)
      .expect(200);
    expect((unfavoriteRes.body as ArticleResponseDto).article).toMatchObject({
      favorited: false,
      favoritesCount: 0,
    });

    await request(app.getHttpServer())
      .delete(`/articles/${article.slug}/favorite`)
      .set('Authorization', `Bearer ${fan.token}`)
      .expect(404);
  });

  it('feed requires authentication', async () => {
    await request(app.getHttpServer()).get('/articles/feed').expect(401);
  });

  it('feed only returns articles from followed authors', async () => {
    const followed = await registerUser(app);
    const notFollowed = await registerUser(app);
    const reader = await registerUser(app);
    const followedArticle = await createArticle(followed.token, {
      title: 'followed author article',
    });
    await createArticle(notFollowed.token, {
      title: 'not followed author article',
    });

    await request(app.getHttpServer())
      .post(`/profiles/${followed.username}/follow`)
      .set('Authorization', `Bearer ${reader.token}`)
      .expect(201);

    const feedRes = await request(app.getHttpServer())
      .get('/articles/feed')
      .set('Authorization', `Bearer ${reader.token}`)
      .expect(200);

    const feedBody = feedRes.body as ArticlesListResponseDto;
    expect(feedBody.articles.map((a) => a.slug)).toEqual([
      followedArticle.slug,
    ]);
    expect(feedBody.articles[0].author.following).toBe(true);
  });
});

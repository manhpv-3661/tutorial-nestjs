import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../users/entities/user.entity';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let articlesService: {
    create: jest.Mock;
    list: jest.Mock;
    feed: jest.Mock;
    findBySlugOrThrow: jest.Mock;
    updateBySlug: jest.Mock;
    deleteBySlug: jest.Mock;
    favorite: jest.Mock;
    unfavorite: jest.Mock;
    toResponseDto: jest.Mock;
    toListResponseDto: jest.Mock;
  };

  const currentUser = { id: 'current-id' } as User;
  const article = { id: 'article-id', slug: 'a-slug' };
  const articleResponse = { article: { slug: 'a-slug' } };
  const listResponse = { articles: [], articlesCount: 0 };
  const page = { articles: [], total: 0 };

  beforeEach(async () => {
    articlesService = {
      create: jest.fn().mockResolvedValue(article),
      list: jest.fn().mockResolvedValue(page),
      feed: jest.fn().mockResolvedValue(page),
      findBySlugOrThrow: jest.fn().mockResolvedValue(article),
      updateBySlug: jest.fn().mockResolvedValue(article),
      deleteBySlug: jest.fn().mockResolvedValue(undefined),
      favorite: jest.fn().mockResolvedValue(article),
      unfavorite: jest.fn().mockResolvedValue(article),
      toResponseDto: jest.fn().mockResolvedValue(articleResponse),
      toListResponseDto: jest.fn().mockResolvedValue(listResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [{ provide: ArticlesService, useValue: articlesService }],
    }).compile();

    controller = module.get(ArticlesController);
  });

  it('create builds CreateArticleData (defaulting tagList) and returns the response dto', async () => {
    const result = await controller.create(currentUser, {
      title: 'title',
      description: 'desc',
      body: 'body',
    });

    expect(articlesService.create).toHaveBeenCalledWith('current-id', {
      title: 'title',
      description: 'desc',
      body: 'body',
      tagList: [],
    });
    expect(articlesService.toResponseDto).toHaveBeenCalledWith(
      article,
      'current-id',
    );
    expect(result).toBe(articleResponse);
  });

  it('list delegates to ArticlesService with the viewer id when present', async () => {
    const query = { limit: 20, offset: 0 };
    const result = await controller.list(query, currentUser);

    expect(articlesService.list).toHaveBeenCalledWith(query);
    expect(articlesService.toListResponseDto).toHaveBeenCalledWith(
      page,
      'current-id',
    );
    expect(result).toBe(listResponse);
  });

  it('list delegates with undefined viewer id for anonymous requests', async () => {
    const query = { limit: 20, offset: 0 };
    await controller.list(query, null);

    expect(articlesService.toListResponseDto).toHaveBeenCalledWith(
      page,
      undefined,
    );
  });

  it('feed delegates to ArticlesService with the current user id', async () => {
    const query = { limit: 20, offset: 0 };
    const result = await controller.feed(query, currentUser);

    expect(articlesService.feed).toHaveBeenCalledWith('current-id', query);
    expect(result).toBe(listResponse);
  });

  it('getBySlug delegates to ArticlesService and returns the response dto', async () => {
    const result = await controller.getBySlug('a-slug', currentUser);

    expect(articlesService.findBySlugOrThrow).toHaveBeenCalledWith('a-slug');
    expect(articlesService.toResponseDto).toHaveBeenCalledWith(
      article,
      'current-id',
    );
    expect(result).toBe(articleResponse);
  });

  it('update delegates to ArticlesService with slug, author id, and dto', async () => {
    const dto = { title: 'new title' };
    const result = await controller.update('a-slug', currentUser, dto);

    expect(articlesService.updateBySlug).toHaveBeenCalledWith(
      'a-slug',
      'current-id',
      dto,
    );
    expect(result).toBe(articleResponse);
  });

  it('delete delegates to ArticlesService with slug and author id', async () => {
    await controller.delete('a-slug', currentUser);

    expect(articlesService.deleteBySlug).toHaveBeenCalledWith(
      'a-slug',
      'current-id',
    );
  });

  it('favorite delegates to ArticlesService and returns the response dto', async () => {
    const result = await controller.favorite('a-slug', currentUser);

    expect(articlesService.favorite).toHaveBeenCalledWith(
      'a-slug',
      'current-id',
    );
    expect(result).toBe(articleResponse);
  });

  it('unfavorite delegates to ArticlesService and returns the response dto', async () => {
    const result = await controller.unfavorite('a-slug', currentUser);

    expect(articlesService.unfavorite).toHaveBeenCalledWith(
      'a-slug',
      'current-id',
    );
    expect(result).toBe(articleResponse);
  });
});

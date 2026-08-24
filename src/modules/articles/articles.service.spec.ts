import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import { FavoritesService } from '../favorites/favorites.service';
import { FollowsService } from '../follows/follows.service';
import { UsersService } from '../users/users.service';
import { Article } from './entities/article.entity';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  let articlesService: ArticlesService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findAndCount: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let usersService: { findByUsername: jest.Mock };
  let followsService: { isFollowing: jest.Mock; getFollowingIds: jest.Mock };
  let favoritesService: {
    isFavorited: jest.Mock;
    countForArticle: jest.Mock;
    favorite: jest.Mock;
    unfavorite: jest.Mock;
    getFavoritesCountMap: jest.Mock;
    getFavoritedArticleIds: jest.Mock;
  };

  const author = { id: 'author-id', username: 'jake', bio: null, image: null };

  beforeEach(async () => {
    repository = {
      create: jest.fn((data: object) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    usersService = { findByUsername: jest.fn() };
    followsService = { isFollowing: jest.fn(), getFollowingIds: jest.fn() };
    favoritesService = {
      isFavorited: jest.fn(),
      countForArticle: jest.fn(),
      favorite: jest.fn(),
      unfavorite: jest.fn(),
      getFavoritesCountMap: jest.fn(),
      getFavoritedArticleIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: getRepositoryToken(Article), useValue: repository },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
        { provide: UsersService, useValue: usersService },
        { provide: FollowsService, useValue: followsService },
        { provide: FavoritesService, useValue: favoritesService },
      ],
    }).compile();

    articlesService = module.get(ArticlesService);
  });

  describe('create', () => {
    it('generates a slug and saves the article', async () => {
      repository.findOne.mockResolvedValue({
        id: 'article-id',
        slug: 'how-to-train-your-dragon-abc123',
        title: 'How to train your dragon',
        author,
      });

      const article = await articlesService.create('author-id', {
        title: 'How to train your dragon',
        description: 'desc',
        body: 'body',
        tagList: ['dragons'],
      });

      expect(repository.save).toHaveBeenCalled();
      const [savedArticle] = repository.save.mock.calls[0] as [
        { slug: string; authorId: string },
      ];
      expect(savedArticle.authorId).toBe('author-id');
      expect(savedArticle.slug).toMatch(/^how-to-train-your-dragon-/);
      expect(article.title).toBe('How to train your dragon');
    });

    it('maps a slug unique-violation to a ConflictException', async () => {
      const dbError = new QueryFailedError('INSERT ...', [], {
        code: '23505',
      } as unknown as Error);
      repository.save.mockRejectedValue(dbError);

      await expect(
        articlesService.create('author-id', {
          title: 'title',
          description: 'desc',
          body: 'body',
          tagList: [],
        }),
      ).rejects.toBeInstanceOf(Error);
    });
  });

  describe('findBySlugOrThrow', () => {
    it('returns the article when found', async () => {
      const article = { id: 'article-id', slug: 'a-slug', author };
      repository.findOne.mockResolvedValue(article);

      await expect(
        articlesService.findBySlugOrThrow('a-slug'),
      ).resolves.toEqual(article);
    });

    it('throws NotFoundException when no article matches', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        articlesService.findBySlugOrThrow('ghost'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateBySlug', () => {
    it('throws ForbiddenException when the current user is not the author', async () => {
      repository.findOne.mockResolvedValue({
        id: 'article-id',
        slug: 'a-slug',
        title: 'Title',
        authorId: 'author-id',
        author,
      });

      await expect(
        articlesService.updateBySlug('a-slug', 'someone-else', {
          title: 'New title',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('regenerates the slug when the title changes', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          id: 'article-id',
          slug: 'old-title-abc123',
          title: 'Old title',
          authorId: 'author-id',
          author,
        })
        .mockResolvedValueOnce({
          id: 'article-id',
          slug: 'new-title-def456',
          title: 'New title',
          authorId: 'author-id',
          author,
        });
      repository.update.mockResolvedValue({ affected: 1 });

      await articlesService.updateBySlug('old-title-abc123', 'author-id', {
        title: 'New title',
      });

      const [, changes] = repository.update.mock.calls[0] as [
        string,
        { title: string; slug: string },
      ];
      expect(changes.title).toBe('New title');
      expect(changes.slug).toMatch(/^new-title-/);
    });

    it('skips the update call when there are no changes', async () => {
      repository.findOne.mockResolvedValue({
        id: 'article-id',
        slug: 'a-slug',
        title: 'Title',
        authorId: 'author-id',
        author,
      });

      await articlesService.updateBySlug('a-slug', 'author-id', {});

      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteBySlug', () => {
    it('throws ForbiddenException when the current user is not the author', async () => {
      repository.findOne.mockResolvedValue({
        id: 'article-id',
        slug: 'a-slug',
        authorId: 'author-id',
        author,
      });

      await expect(
        articlesService.deleteBySlug('a-slug', 'someone-else'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes the article when the current user is the author', async () => {
      repository.findOne.mockResolvedValue({
        id: 'article-id',
        slug: 'a-slug',
        authorId: 'author-id',
        author,
      });

      await articlesService.deleteBySlug('a-slug', 'author-id');

      expect(repository.delete).toHaveBeenCalledWith('article-id');
    });
  });

  describe('list', () => {
    function stubQueryBuilder(result: [unknown[], number]) {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue(result),
      };
      repository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('returns the paginated result with no filters', async () => {
      const qb = stubQueryBuilder([[{ id: 'article-1' }], 1]);

      const result = await articlesService.list({ limit: 20, offset: 0 });

      expect(result).toEqual({ articles: [{ id: 'article-1' }], total: 1 });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('returns an empty page when the author filter does not resolve to a user', async () => {
      stubQueryBuilder([[], 0]);
      usersService.findByUsername.mockResolvedValue(null);

      const result = await articlesService.list({
        limit: 20,
        offset: 0,
        author: 'ghost',
      });

      expect(result).toEqual({ articles: [], total: 0 });
    });

    it('returns an empty page when the favorited filter resolves to a user with no favorites', async () => {
      stubQueryBuilder([[], 0]);
      usersService.findByUsername.mockResolvedValue({ id: 'user-id' });
      favoritesService.getFavoritedArticleIds.mockResolvedValue(new Set());

      const result = await articlesService.list({
        limit: 20,
        offset: 0,
        favorited: 'jake',
      });

      expect(result).toEqual({ articles: [], total: 0 });
    });
  });

  describe('feed', () => {
    it('returns an empty page when the user follows nobody', async () => {
      followsService.getFollowingIds.mockResolvedValue(new Set());

      const result = await articlesService.feed('user-id', {
        limit: 20,
        offset: 0,
      });

      expect(result).toEqual({ articles: [], total: 0 });
      expect(repository.findAndCount).not.toHaveBeenCalled();
    });

    it('returns articles authored by followed users', async () => {
      followsService.getFollowingIds.mockResolvedValue(new Set(['author-id']));
      repository.findAndCount.mockResolvedValue([[{ id: 'article-1' }], 1]);

      const result = await articlesService.feed('user-id', {
        limit: 20,
        offset: 0,
      });

      expect(result).toEqual({ articles: [{ id: 'article-1' }], total: 1 });
    });
  });

  describe('favorite / unfavorite', () => {
    it('favorite delegates to FavoritesService and returns the article', async () => {
      const article = { id: 'article-id', slug: 'a-slug', author };
      repository.findOne.mockResolvedValue(article);

      const result = await articlesService.favorite('a-slug', 'user-id');

      expect(favoritesService.favorite).toHaveBeenCalledWith(
        'user-id',
        'article-id',
      );
      expect(result).toEqual(article);
    });

    it('unfavorite delegates to FavoritesService and returns the article', async () => {
      const article = { id: 'article-id', slug: 'a-slug', author };
      repository.findOne.mockResolvedValue(article);

      const result = await articlesService.unfavorite('a-slug', 'user-id');

      expect(favoritesService.unfavorite).toHaveBeenCalledWith(
        'user-id',
        'article-id',
      );
      expect(result).toEqual(article);
    });
  });

  describe('toResponseDto', () => {
    it('reports favorited=false and following=false for an anonymous viewer', async () => {
      favoritesService.countForArticle.mockResolvedValue(3);
      const article = {
        id: 'article-id',
        authorId: 'author-id',
        slug: 'a-slug',
        title: 't',
        description: 'd',
        body: 'b',
        tagList: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        author,
      } as unknown as Article;

      const dto = await articlesService.toResponseDto(article);

      expect(dto.article.favorited).toBe(false);
      expect(dto.article.favoritesCount).toBe(3);
      expect(dto.article.author.following).toBe(false);
      expect(favoritesService.isFavorited).not.toHaveBeenCalled();
      expect(followsService.isFollowing).not.toHaveBeenCalled();
    });

    it('reports the real favorited/following state for a logged-in viewer', async () => {
      favoritesService.isFavorited.mockResolvedValue(true);
      favoritesService.countForArticle.mockResolvedValue(1);
      followsService.isFollowing.mockResolvedValue(true);
      const article = {
        id: 'article-id',
        authorId: 'author-id',
        slug: 'a-slug',
        title: 't',
        description: 'd',
        body: 'b',
        tagList: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        author,
      } as unknown as Article;

      const dto = await articlesService.toResponseDto(article, 'viewer-id');

      expect(dto.article.favorited).toBe(true);
      expect(dto.article.author.following).toBe(true);
    });
  });
});

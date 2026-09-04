import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let favoritesService: FavoritesService;
  let repository: {
    exists: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      exists: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: getRepositoryToken(Favorite), useValue: repository },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
      ],
    }).compile();

    favoritesService = module.get(FavoritesService);
  });

  describe('isFavorited', () => {
    it('returns true when a favorite row exists', async () => {
      repository.exists.mockResolvedValue(true);

      await expect(favoritesService.isFavorited('a', 'b')).resolves.toBe(true);
      expect(repository.exists).toHaveBeenCalledWith({
        where: { userId: 'a', articleId: 'b' },
      });
    });

    it('returns false when no favorite row exists', async () => {
      repository.exists.mockResolvedValue(false);

      await expect(favoritesService.isFavorited('a', 'b')).resolves.toBe(false);
    });
  });

  describe('favorite', () => {
    it('inserts a new favorite row', async () => {
      await favoritesService.favorite('a', 'b');

      expect(repository.insert).toHaveBeenCalledWith({
        userId: 'a',
        articleId: 'b',
      });
    });

    it('maps a race-condition unique-violation on insert to ConflictException', async () => {
      const dbError = new QueryFailedError('INSERT ...', [], {
        code: '23505',
      } as unknown as Error);
      repository.insert.mockRejectedValue(dbError);

      await expect(favoritesService.favorite('a', 'b')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows any other database error from insert unchanged', async () => {
      const dbError = new QueryFailedError('INSERT ...', [], {
        code: '23502',
      } as unknown as Error);
      repository.insert.mockRejectedValue(dbError);

      await expect(favoritesService.favorite('a', 'b')).rejects.toBe(dbError);
    });
  });

  describe('unfavorite', () => {
    it('throws NotFoundException when no row was deleted', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(
        favoritesService.unfavorite('a', 'b'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resolves when a row was deleted', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await expect(
        favoritesService.unfavorite('a', 'b'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getFavoritesCountMap', () => {
    it('returns an empty map without querying when given no article ids', async () => {
      const result = await favoritesService.getFavoritesCountMap([]);

      expect(result).toEqual(new Map());
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('builds a map of articleId to favorite count', async () => {
      const getRawMany = jest.fn().mockResolvedValue([
        { articleId: 'article-1', count: '2' },
        { articleId: 'article-2', count: '0' },
      ]);
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany,
      };
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await favoritesService.getFavoritesCountMap([
        'article-1',
        'article-2',
      ]);

      expect(result).toEqual(
        new Map([
          ['article-1', 2],
          ['article-2', 0],
        ]),
      );
    });
  });

  describe('getFavoritedArticleIds', () => {
    it('returns an empty set without querying when given an empty article id filter', async () => {
      const result = await favoritesService.getFavoritedArticleIds('a', []);

      expect(result).toEqual(new Set());
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('returns the set of article ids favorited by the user', async () => {
      repository.find.mockResolvedValue([
        { articleId: 'article-1' },
        { articleId: 'article-2' },
      ]);

      const result = await favoritesService.getFavoritedArticleIds('a');

      expect(result).toEqual(new Set(['article-1', 'article-2']));
    });
  });
});

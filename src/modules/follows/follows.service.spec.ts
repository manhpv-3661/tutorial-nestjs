import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { FollowsService } from './follows.service';

describe('FollowsService', () => {
  let followsService: FollowsService;
  let repository: {
    findOne: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        { provide: getRepositoryToken(Follow), useValue: repository },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
      ],
    }).compile();

    followsService = module.get(FollowsService);
  });

  describe('isFollowing', () => {
    it('returns true when a follow row exists', async () => {
      repository.findOne.mockResolvedValue({
        followerId: 'a',
        followingId: 'b',
      });

      await expect(followsService.isFollowing('a', 'b')).resolves.toBe(true);
    });

    it('returns false when no follow row exists', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(followsService.isFollowing('a', 'b')).resolves.toBe(false);
    });
  });

  describe('follow', () => {
    it('throws ConflictException when following yourself', async () => {
      await expect(followsService.follow('a', 'a')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.insert).not.toHaveBeenCalled();
    });

    it('throws ConflictException when already following', async () => {
      repository.findOne.mockResolvedValue({
        followerId: 'a',
        followingId: 'b',
      });

      await expect(followsService.follow('a', 'b')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.insert).not.toHaveBeenCalled();
    });

    it('inserts a new follow row otherwise', async () => {
      repository.findOne.mockResolvedValue(null);

      await followsService.follow('a', 'b');

      expect(repository.insert).toHaveBeenCalledWith({
        followerId: 'a',
        followingId: 'b',
      });
    });

    it('maps a race-condition unique-violation on insert to ConflictException', async () => {
      repository.findOne.mockResolvedValue(null);
      const dbError = new QueryFailedError('INSERT ...', [], {
        code: '23505',
      } as unknown as Error);
      repository.insert.mockRejectedValue(dbError);

      await expect(followsService.follow('a', 'b')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows any other database error from insert unchanged', async () => {
      repository.findOne.mockResolvedValue(null);
      const dbError = new QueryFailedError('INSERT ...', [], {
        code: '23502',
      } as unknown as Error);
      repository.insert.mockRejectedValue(dbError);

      await expect(followsService.follow('a', 'b')).rejects.toBe(dbError);
    });
  });

  describe('unfollow', () => {
    it('throws NotFoundException when no row was deleted', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(followsService.unfollow('a', 'b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('resolves when a row was deleted', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await expect(followsService.unfollow('a', 'b')).resolves.toBeUndefined();
    });
  });

  describe('getFollowingIds', () => {
    it('returns an empty set without querying when given an empty target filter', async () => {
      const result = await followsService.getFollowingIds('a', []);

      expect(result).toEqual(new Set());
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('returns every followee when no target filter is given', async () => {
      repository.find.mockResolvedValue([
        { followingId: 'b' },
        { followingId: 'c' },
      ]);

      const result = await followsService.getFollowingIds('a');

      expect(result).toEqual(new Set(['b', 'c']));
    });

    it('returns only the followees present in the target filter', async () => {
      repository.find.mockResolvedValue([{ followingId: 'b' }]);

      const result = await followsService.getFollowingIds('a', ['b', 'c']);

      expect(result).toEqual(new Set(['b']));
    });
  });
});

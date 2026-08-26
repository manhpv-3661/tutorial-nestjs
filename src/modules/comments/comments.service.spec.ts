import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { FollowsService } from '../follows/follows.service';
import { Comment } from './entities/comment.entity';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let commentsService: CommentsService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };
  let followsService: { isFollowing: jest.Mock; getFollowingIds: jest.Mock };

  const author = { id: 'author-id', username: 'jake', bio: null, image: null };

  beforeEach(async () => {
    repository = {
      create: jest.fn((data: object) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    followsService = { isFollowing: jest.fn(), getFollowingIds: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getRepositoryToken(Comment), useValue: repository },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
        { provide: FollowsService, useValue: followsService },
      ],
    }).compile();

    commentsService = module.get(CommentsService);
  });

  describe('create', () => {
    it('saves the comment and returns it with the author loaded', async () => {
      repository.findOne.mockResolvedValue({
        id: 'comment-id',
        body: 'nice article',
        articleId: 'article-id',
        authorId: 'author-id',
        author,
      });

      const comment = await commentsService.create('article-id', 'author-id', {
        body: 'nice article',
      });

      expect(repository.save).toHaveBeenCalled();
      const [savedComment] = repository.save.mock.calls[0] as [
        { articleId: string; authorId: string; body: string },
      ];
      expect(savedComment.articleId).toBe('article-id');
      expect(savedComment.authorId).toBe('author-id');
      expect(comment.body).toBe('nice article');
    });
  });

  describe('findByIdOrThrow', () => {
    it('returns the comment when found', async () => {
      const comment = { id: 'comment-id', body: 'b', author };
      repository.findOne.mockResolvedValue(comment);

      await expect(
        commentsService.findByIdOrThrow('comment-id'),
      ).resolves.toEqual(comment);
    });

    it('throws NotFoundException when no comment matches', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        commentsService.findByIdOrThrow('ghost'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listByArticle', () => {
    it('returns comments ordered oldest first', async () => {
      repository.find.mockResolvedValue([{ id: 'comment-1' }]);

      const comments = await commentsService.listByArticle('article-id');

      expect(repository.find).toHaveBeenCalledWith({
        where: { articleId: 'article-id' },
        relations: ['author'],
        order: { createdAt: 'ASC' },
      });
      expect(comments).toEqual([{ id: 'comment-1' }]);
    });
  });

  describe('deleteByIdForArticle', () => {
    it('throws NotFoundException when no comment matches the article', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        commentsService.deleteByIdForArticle(
          'article-id',
          'comment-id',
          'author-id',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the current user is not the author', async () => {
      repository.findOne.mockResolvedValue({
        id: 'comment-id',
        articleId: 'article-id',
        authorId: 'author-id',
      });

      await expect(
        commentsService.deleteByIdForArticle(
          'article-id',
          'comment-id',
          'someone-else',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes the comment when the current user is the author', async () => {
      repository.findOne.mockResolvedValue({
        id: 'comment-id',
        articleId: 'article-id',
        authorId: 'author-id',
      });

      await commentsService.deleteByIdForArticle(
        'article-id',
        'comment-id',
        'author-id',
      );

      expect(repository.delete).toHaveBeenCalledWith('comment-id');
    });
  });

  describe('toResponseDto', () => {
    it('reports following=false for an anonymous viewer', async () => {
      const comment = {
        id: 'comment-id',
        body: 'b',
        authorId: 'author-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        author,
      } as unknown as Comment;

      const dto = await commentsService.toResponseDto(comment);

      expect(dto.comment.author.following).toBe(false);
      expect(followsService.isFollowing).not.toHaveBeenCalled();
    });

    it('reports the real following state for a logged-in viewer', async () => {
      followsService.isFollowing.mockResolvedValue(true);
      const comment = {
        id: 'comment-id',
        body: 'b',
        authorId: 'author-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        author,
      } as unknown as Comment;

      const dto = await commentsService.toResponseDto(comment, 'viewer-id');

      expect(dto.comment.author.following).toBe(true);
      expect(followsService.isFollowing).toHaveBeenCalledWith(
        'viewer-id',
        'author-id',
      );
    });
  });

  describe('toListResponseDto', () => {
    it('returns comments with following=false for an anonymous viewer', async () => {
      const comments = [
        {
          id: 'comment-id',
          body: 'b',
          authorId: 'author-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          author,
        },
      ] as unknown as Comment[];

      const dto = await commentsService.toListResponseDto(comments);

      expect(dto.comments[0].author.following).toBe(false);
      expect(followsService.getFollowingIds).not.toHaveBeenCalled();
    });

    it('batches the following lookup for a logged-in viewer', async () => {
      followsService.getFollowingIds.mockResolvedValue(new Set(['author-id']));
      const comments = [
        {
          id: 'comment-id',
          body: 'b',
          authorId: 'author-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          author,
        },
      ] as unknown as Comment[];

      const dto = await commentsService.toListResponseDto(
        comments,
        'viewer-id',
      );

      expect(followsService.getFollowingIds).toHaveBeenCalledWith('viewer-id', [
        'author-id',
      ]);
      expect(dto.comments[0].author.following).toBe(true);
    });
  });
});

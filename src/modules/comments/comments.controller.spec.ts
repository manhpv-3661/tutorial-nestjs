import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from '../articles/articles.service';
import { User } from '../users/entities/user.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: {
    create: jest.Mock;
    listByArticle: jest.Mock;
    deleteByIdForArticle: jest.Mock;
    toResponseDto: jest.Mock;
    toListResponseDto: jest.Mock;
  };
  let articlesService: { findBySlugOrThrow: jest.Mock };

  const currentUser = { id: 'current-id' } as User;
  const article = { id: 'article-id', slug: 'a-slug' };
  const comment = { id: 'comment-id', body: 'nice article' };
  const commentResponse = { comment: { id: 'comment-id' } };
  const listResponse = { comments: [] };

  beforeEach(async () => {
    commentsService = {
      create: jest.fn().mockResolvedValue(comment),
      listByArticle: jest.fn().mockResolvedValue([comment]),
      deleteByIdForArticle: jest.fn().mockResolvedValue(undefined),
      toResponseDto: jest.fn().mockResolvedValue(commentResponse),
      toListResponseDto: jest.fn().mockResolvedValue(listResponse),
    };
    articlesService = {
      findBySlugOrThrow: jest.fn().mockResolvedValue(article),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentsService, useValue: commentsService },
        { provide: ArticlesService, useValue: articlesService },
      ],
    }).compile();

    controller = module.get(CommentsController);
  });

  it('create resolves the article by slug and returns the response dto', async () => {
    const result = await controller.create('a-slug', currentUser, {
      body: 'nice article',
    });

    expect(articlesService.findBySlugOrThrow).toHaveBeenCalledWith('a-slug');
    expect(commentsService.create).toHaveBeenCalledWith(
      'article-id',
      'current-id',
      { body: 'nice article' },
    );
    expect(commentsService.toResponseDto).toHaveBeenCalledWith(
      comment,
      'current-id',
    );
    expect(result).toBe(commentResponse);
  });

  it('list resolves the article by slug and delegates with the viewer id when present', async () => {
    const result = await controller.list('a-slug', currentUser);

    expect(articlesService.findBySlugOrThrow).toHaveBeenCalledWith('a-slug');
    expect(commentsService.listByArticle).toHaveBeenCalledWith('article-id');
    expect(commentsService.toListResponseDto).toHaveBeenCalledWith(
      [comment],
      'current-id',
    );
    expect(result).toBe(listResponse);
  });

  it('list delegates with undefined viewer id for anonymous requests', async () => {
    await controller.list('a-slug', null);

    expect(commentsService.toListResponseDto).toHaveBeenCalledWith(
      [comment],
      undefined,
    );
  });

  it('delete resolves the article by slug and delegates with slug/id/author id', async () => {
    await controller.delete('a-slug', 'comment-id', currentUser);

    expect(articlesService.findBySlugOrThrow).toHaveBeenCalledWith('a-slug');
    expect(commentsService.deleteByIdForArticle).toHaveBeenCalledWith(
      'article-id',
      'comment-id',
      'current-id',
    );
  });
});

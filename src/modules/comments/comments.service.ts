import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { FollowsService } from '../follows/follows.service';
import { Comment } from './entities/comment.entity';
import {
  CommentResponseDto,
  CommentResponseMeta,
} from './dto/comment-response.dto';
import { CommentsListResponseDto } from './dto/comments-list-response.dto';
import { CreateCommentData } from './interfaces';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    private readonly i18n: I18nService,
    private readonly followsService: FollowsService,
  ) {}

  async create(
    articleId: string,
    authorId: string,
    data: CreateCommentData,
  ): Promise<Comment> {
    const comment = this.commentsRepository.create({
      body: data.body,
      articleId,
      authorId,
    });
    await this.commentsRepository.save(comment);
    return this.findByIdOrThrow(comment.id);
  }

  async findByIdOrThrow(id: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!comment) {
      throw new NotFoundException(this.i18n.t('errors.commentNotFound'));
    }
    return comment;
  }

  async listByArticle(articleId: string): Promise<Comment[]> {
    // Intentionally unpaginated: matches the RealWorld spec, which does not
    // paginate comments. Fetches every comment for the article, so a viral
    // article with tens of thousands of comments pulls them all in one query.
    return this.commentsRepository.find({
      where: { articleId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async deleteByIdForArticle(
    articleId: string,
    commentId: string,
    currentUserId: string,
  ): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, articleId },
    });
    if (!comment) {
      throw new NotFoundException(this.i18n.t('errors.commentNotFound'));
    }
    if (comment.authorId !== currentUserId) {
      throw new ForbiddenException(this.i18n.t('errors.notCommentAuthor'));
    }
    await this.commentsRepository.delete(comment.id);
  }

  async toResponseDto(
    comment: Comment,
    currentUserId?: string,
  ): Promise<CommentResponseDto> {
    const authorFollowing = currentUserId
      ? await this.followsService.isFollowing(currentUserId, comment.authorId)
      : false;
    const meta: CommentResponseMeta = { authorFollowing };
    return CommentResponseDto.fromEntity(comment, meta);
  }

  async toListResponseDto(
    comments: Comment[],
    currentUserId?: string,
  ): Promise<CommentsListResponseDto> {
    const authorIds = [...new Set(comments.map((comment) => comment.authorId))];
    const followingIds = currentUserId
      ? await this.followsService.getFollowingIds(currentUserId, authorIds)
      : new Set<string>();
    return CommentsListResponseDto.fromEntities(comments, followingIds);
  }
}

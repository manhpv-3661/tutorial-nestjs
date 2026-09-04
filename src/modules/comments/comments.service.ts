import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../articles/dto/pagination-query.dto';
import { FollowsService } from '../follows/follows.service';
import { User } from '../users/entities/user.entity';
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
    author: User,
    data: CreateCommentData,
  ): Promise<Comment> {
    const comment = this.commentsRepository.create({
      body: data.body,
      articleId,
      authorId: author.id,
    });
    await this.commentsRepository.save(comment);
    // The author is already the caller's own User entity — assign it
    // directly instead of re-querying the row we just inserted.
    comment.author = author;
    return comment;
  }

  async listByArticle(
    articleId: string,
    pagination: PaginationQueryDto,
  ): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { articleId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
      skip: pagination.offset,
      take: pagination.limit,
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
    // A user can never follow themselves (enforced in FollowsService.follow),
    // so skip the query entirely when the viewer is the comment's own author.
    const authorFollowing =
      currentUserId && currentUserId !== comment.authorId
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

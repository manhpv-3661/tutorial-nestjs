import { ApiProperty } from '@nestjs/swagger';
import { Comment } from '../entities/comment.entity';
import { CommentResponseFields } from './comment-response.dto';

export class CommentsListResponseDto {
  @ApiProperty({ type: [CommentResponseFields] })
  comments: CommentResponseFields[];

  static fromEntities(
    comments: Comment[],
    followingIds: Set<string>,
  ): CommentsListResponseDto {
    const dto = new CommentsListResponseDto();
    dto.comments = comments.map((comment) =>
      CommentResponseFields.fromEntity(comment, {
        authorFollowing: followingIds.has(comment.authorId),
      }),
    );
    return dto;
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { Comment } from '../entities/comment.entity';

export interface CommentResponseMeta {
  authorFollowing: boolean;
}

class CommentAuthorFields {
  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ nullable: true })
  image: string | null;

  @ApiProperty()
  following: boolean;
}

export class CommentResponseFields {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  body: string;

  @ApiProperty({ type: CommentAuthorFields })
  author: CommentAuthorFields;

  static fromEntity(
    comment: Comment,
    meta: CommentResponseMeta,
  ): CommentResponseFields {
    const fields = new CommentResponseFields();
    fields.id = comment.id;
    fields.createdAt = comment.createdAt;
    fields.updatedAt = comment.updatedAt;
    fields.body = comment.body;
    fields.author = {
      username: comment.author.username,
      bio: comment.author.bio,
      image: comment.author.image,
      following: meta.authorFollowing,
    };
    return fields;
  }
}

export class CommentResponseDto {
  @ApiProperty({ type: CommentResponseFields })
  comment: CommentResponseFields;

  static fromEntity(
    comment: Comment,
    meta: CommentResponseMeta,
  ): CommentResponseDto {
    const dto = new CommentResponseDto();
    dto.comment = CommentResponseFields.fromEntity(comment, meta);
    return dto;
  }
}

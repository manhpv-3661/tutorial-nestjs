import { ApiProperty } from '@nestjs/swagger';
import { Article } from '../entities/article.entity';

export interface ArticleResponseMeta {
  favorited: boolean;
  favoritesCount: number;
  authorFollowing: boolean;
}

class ArticleAuthorFields {
  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ nullable: true })
  image: string | null;

  @ApiProperty()
  following: boolean;
}

export class ArticleResponseFields {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ type: [String] })
  tagList: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  favorited: boolean;

  @ApiProperty()
  favoritesCount: number;

  @ApiProperty({ type: ArticleAuthorFields })
  author: ArticleAuthorFields;

  static fromEntity(
    article: Article,
    meta: ArticleResponseMeta,
  ): ArticleResponseFields {
    const fields = new ArticleResponseFields();
    fields.slug = article.slug;
    fields.title = article.title;
    fields.description = article.description;
    fields.body = article.body;
    fields.tagList = article.tagList;
    fields.createdAt = article.createdAt;
    fields.updatedAt = article.updatedAt;
    fields.favorited = meta.favorited;
    fields.favoritesCount = meta.favoritesCount;
    fields.author = {
      username: article.author.username,
      bio: article.author.bio,
      image: article.author.image,
      following: meta.authorFollowing,
    };
    return fields;
  }
}

export class ArticleResponseDto {
  @ApiProperty({ type: ArticleResponseFields })
  article: ArticleResponseFields;

  static fromEntity(
    article: Article,
    meta: ArticleResponseMeta,
  ): ArticleResponseDto {
    const dto = new ArticleResponseDto();
    dto.article = ArticleResponseFields.fromEntity(article, meta);
    return dto;
  }
}

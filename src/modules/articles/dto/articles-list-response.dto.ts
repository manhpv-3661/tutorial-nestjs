import { ApiProperty } from '@nestjs/swagger';
import { Article } from '../entities/article.entity';
import { ArticleResponseFields } from './article-response.dto';

export interface ArticlesListResponseMeta {
  favoritesCountMap: Map<string, number>;
  favoritedIds: Set<string>;
  followingIds: Set<string>;
}

export class ArticlesListResponseDto {
  @ApiProperty({ type: [ArticleResponseFields] })
  articles: ArticleResponseFields[];

  @ApiProperty()
  articlesCount: number;

  static fromEntities(
    articles: Article[],
    articlesCount: number,
    meta: ArticlesListResponseMeta,
  ): ArticlesListResponseDto {
    const dto = new ArticlesListResponseDto();
    dto.articlesCount = articlesCount;
    dto.articles = articles.map((article) =>
      ArticleResponseFields.fromEntity(article, {
        favorited: meta.favoritedIds.has(article.id),
        favoritesCount: meta.favoritesCountMap.get(article.id) ?? 0,
        authorFollowing: meta.followingIds.has(article.authorId),
      }),
    );
    return dto;
  }
}

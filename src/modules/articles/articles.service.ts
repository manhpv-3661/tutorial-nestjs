import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/utils/postgres-unique-violation.util';
import { FavoritesService } from '../favorites/favorites.service';
import { FollowsService } from '../follows/follows.service';
import { UsersService } from '../users/users.service';
import { generateSlug } from './utils/slug.util';
import { Article } from './entities/article.entity';
import {
  ArticleResponseDto,
  ArticleResponseMeta,
} from './dto/article-response.dto';
import { ArticlesListResponseDto } from './dto/articles-list-response.dto';
import {
  CreateArticleData,
  FeedArticlesFilter,
  ListArticlesFilter,
  UpdateArticleData,
} from './interfaces';

export interface ArticlesPage {
  articles: Article[];
  total: number;
}

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    private readonly i18n: I18nService,
    private readonly usersService: UsersService,
    private readonly followsService: FollowsService,
    private readonly favoritesService: FavoritesService,
  ) {}

  async create(authorId: string, data: CreateArticleData): Promise<Article> {
    const article = this.articlesRepository.create({
      title: data.title,
      description: data.description,
      body: data.body,
      tagList: data.tagList,
      authorId,
      slug: generateSlug(data.title),
    });

    try {
      await this.articlesRepository.save(article);
    } catch (error) {
      throw this.toConflictOrRethrow(error);
    }
    return this.findBySlugOrThrow(article.slug);
  }

  async findBySlugOrThrow(slug: string): Promise<Article> {
    const article = await this.articlesRepository.findOne({
      where: { slug },
      relations: ['author'],
    });
    if (!article) {
      throw new NotFoundException(this.i18n.t('errors.articleNotFound'));
    }
    return article;
  }

  async updateBySlug(
    slug: string,
    currentUserId: string,
    data: UpdateArticleData,
  ): Promise<Article> {
    const article = await this.findBySlugOrThrow(slug);
    this.assertIsAuthor(article, currentUserId);

    const changes: UpdateArticleData & { slug?: string } = { ...data };
    if (data.title !== undefined && data.title !== article.title) {
      changes.slug = generateSlug(data.title);
    }

    if (Object.keys(changes).length > 0) {
      try {
        await this.articlesRepository.update(article.id, changes);
      } catch (error) {
        throw this.toConflictOrRethrow(error);
      }
    }
    return this.findBySlugOrThrow(changes.slug ?? slug);
  }

  async deleteBySlug(slug: string, currentUserId: string): Promise<void> {
    const article = await this.findBySlugOrThrow(slug);
    this.assertIsAuthor(article, currentUserId);
    await this.articlesRepository.delete(article.id);
  }

  async list(filter: ListArticlesFilter): Promise<ArticlesPage> {
    const query = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .orderBy('article.createdAt', 'DESC')
      .skip(filter.offset)
      .take(filter.limit);

    if (filter.tag) {
      query.andWhere(':tag = ANY(article.tagList)', { tag: filter.tag });
    }

    if (filter.author) {
      const author = await this.usersService.findByUsername(filter.author);
      if (!author) {
        return { articles: [], total: 0 };
      }
      query.andWhere('article.authorId = :authorId', {
        authorId: author.id,
      });
    }

    if (filter.favorited) {
      const favoritedBy = await this.usersService.findByUsername(
        filter.favorited,
      );
      if (!favoritedBy) {
        return { articles: [], total: 0 };
      }
      // EXISTS keeps the id list inside SQL instead of pulling every
      // favorited article id into app memory and binding it as an IN(...)
      // param list, which errors past Postgres's ~65k bind-parameter limit.
      query.andWhere(
        'EXISTS (SELECT 1 FROM article_favorites f WHERE f.article_id = article.id AND f.user_id = :favoritedById)',
        { favoritedById: favoritedBy.id },
      );
    }

    const [articles, total] = await query.getManyAndCount();
    return { articles, total };
  }

  async feed(
    currentUserId: string,
    filter: FeedArticlesFilter,
  ): Promise<ArticlesPage> {
    const [articles, total] = await this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .where(
        'EXISTS (SELECT 1 FROM follows f WHERE f.following_id = article.authorId AND f.follower_id = :currentUserId)',
        { currentUserId },
      )
      .orderBy('article.createdAt', 'DESC')
      .skip(filter.offset)
      .take(filter.limit)
      .getManyAndCount();

    return { articles, total };
  }

  async favorite(slug: string, userId: string): Promise<Article> {
    const article = await this.findBySlugOrThrow(slug);
    await this.favoritesService.favorite(userId, article.id);
    return article;
  }

  async unfavorite(slug: string, userId: string): Promise<Article> {
    const article = await this.findBySlugOrThrow(slug);
    await this.favoritesService.unfavorite(userId, article.id);
    return article;
  }

  async toResponseDto(
    article: Article,
    currentUserId?: string,
  ): Promise<ArticleResponseDto> {
    const [favorited, favoritesCount, authorFollowing] = await Promise.all([
      currentUserId
        ? this.favoritesService.isFavorited(currentUserId, article.id)
        : Promise.resolve(false),
      this.favoritesService.countForArticle(article.id),
      currentUserId
        ? this.followsService.isFollowing(currentUserId, article.authorId)
        : Promise.resolve(false),
    ]);

    const meta: ArticleResponseMeta = {
      favorited,
      favoritesCount,
      authorFollowing,
    };
    return ArticleResponseDto.fromEntity(article, meta);
  }

  async toListResponseDto(
    page: ArticlesPage,
    currentUserId?: string,
    options?: { allAuthorsFollowed?: boolean },
  ): Promise<ArticlesListResponseDto> {
    const articleIds = page.articles.map((article) => article.id);
    const authorIds = [
      ...new Set(page.articles.map((article) => article.authorId)),
    ];

    const [favoritesCountMap, favoritedIds, followingIds] = await Promise.all([
      this.favoritesService.getFavoritesCountMap(articleIds),
      currentUserId
        ? this.favoritesService.getFavoritedArticleIds(
            currentUserId,
            articleIds,
          )
        : Promise.resolve(new Set<string>()),
      // feed() already filters to articles whose author is followed, so
      // every author on this page is followed by definition — skip the
      // redundant lookup FollowsService just did to build the feed.
      options?.allAuthorsFollowed
        ? Promise.resolve(new Set(authorIds))
        : currentUserId
          ? this.followsService.getFollowingIds(currentUserId, authorIds)
          : Promise.resolve(new Set<string>()),
    ]);

    return ArticlesListResponseDto.fromEntities(page.articles, page.total, {
      favoritesCountMap,
      favoritedIds,
      followingIds,
    });
  }

  private assertIsAuthor(article: Article, currentUserId: string): void {
    if (article.authorId !== currentUserId) {
      throw new ForbiddenException(this.i18n.t('errors.notArticleAuthor'));
    }
  }

  private toConflictOrRethrow(error: unknown): unknown {
    if (!isUniqueViolation(error)) {
      return error;
    }
    return new ConflictException(this.i18n.t('errors.articleSlugConflict'));
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/utils/postgres-unique-violation.util';
import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    private readonly i18n: I18nService,
  ) {}

  async isFavorited(userId: string, articleId: string): Promise<boolean> {
    return this.favoritesRepository.exists({
      where: { userId, articleId },
    });
  }

  async favorite(userId: string, articleId: string): Promise<void> {
    try {
      // .insert() issues a plain INSERT; .save() would SELECT-then-UPDATE
      // when the full composite primary key is already set, silently
      // no-oping on a duplicate instead of raising a unique violation.
      await this.favoritesRepository.insert({ userId, articleId });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(this.i18n.t('errors.alreadyFavorited'));
      }
      throw error;
    }
  }

  async unfavorite(userId: string, articleId: string): Promise<void> {
    const result = await this.favoritesRepository.delete({
      userId,
      articleId,
    });
    if (!result.affected) {
      throw new NotFoundException(this.i18n.t('errors.notFavorited'));
    }
  }

  async countForArticle(articleId: string): Promise<number> {
    return this.favoritesRepository.count({ where: { articleId } });
  }

  async getFavoritesCountMap(
    articleIds: string[],
  ): Promise<Map<string, number>> {
    if (articleIds.length === 0) {
      return new Map();
    }

    const rows = await this.favoritesRepository
      .createQueryBuilder('favorite')
      .select('favorite.articleId', 'articleId')
      .addSelect('COUNT(*)', 'count')
      .where('favorite.articleId IN (:...articleIds)', { articleIds })
      .groupBy('favorite.articleId')
      .getRawMany<{ articleId: string; count: string }>();

    return new Map(rows.map((row) => [row.articleId, Number(row.count)]));
  }

  async getFavoritedArticleIds(
    userId: string,
    articleIds?: string[],
  ): Promise<Set<string>> {
    if (articleIds && articleIds.length === 0) {
      return new Set();
    }

    const where = articleIds
      ? { userId, articleId: In(articleIds) }
      : { userId };
    const favorites = await this.favoritesRepository.find({
      where,
      select: ['articleId'],
    });
    return new Set(favorites.map((favorite) => favorite.articleId));
  }
}

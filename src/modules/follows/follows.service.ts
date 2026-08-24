import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/utils/postgres-unique-violation.util';
import { Follow } from './entities/follow.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
    private readonly i18n: I18nService,
  ) {}

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followsRepository.findOne({
      where: { followerId, followingId },
    });
    return follow !== null;
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new ConflictException(this.i18n.t('errors.cannotFollowSelf'));
    }

    const alreadyFollowing = await this.isFollowing(followerId, followingId);
    if (alreadyFollowing) {
      throw new ConflictException(this.i18n.t('errors.alreadyFollowing'));
    }

    try {
      // .insert() issues a plain INSERT; .save() would SELECT-then-UPDATE
      // when the full composite primary key is already set, silently
      // no-oping on a duplicate instead of raising a unique violation.
      await this.followsRepository.insert({ followerId, followingId });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(this.i18n.t('errors.alreadyFollowing'));
      }
      throw error;
    }
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const result = await this.followsRepository.delete({
      followerId,
      followingId,
    });
    if (!result.affected) {
      throw new NotFoundException(this.i18n.t('errors.notFollowing'));
    }
  }

  async getFollowingIds(
    followerId: string,
    targetIds?: string[],
  ): Promise<Set<string>> {
    if (targetIds && targetIds.length === 0) {
      return new Set();
    }

    const where = targetIds
      ? { followerId, followingId: In(targetIds) }
      : { followerId };
    const follows = await this.followsRepository.find({
      where,
      select: ['followingId'],
    });
    return new Set(follows.map((follow) => follow.followingId));
  }
}

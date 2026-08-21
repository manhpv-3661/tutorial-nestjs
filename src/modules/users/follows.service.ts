import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';

const POSTGRES_UNIQUE_VIOLATION = '23505';

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
      await this.followsRepository.save(
        this.followsRepository.create({ followerId, followingId }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
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
}

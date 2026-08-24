import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, Repository, DataSource } from 'typeorm';
import { AttachmentOwnerType } from '../attachments/entities/attachment.entity';
import { AttachmentsService } from '../attachments/attachments.service';
import { User } from './entities/user.entity';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly i18n: I18nService,
    private readonly attachmentsService: AttachmentsService,
    private readonly dataSource: DataSource,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    const user = this.usersRepository.create(data);
    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      throw this.toConflictOrRethrow(error);
    }
  }

  async updateById(
    id: string,
    data: Partial<{
      username: string;
      email: string;
      password: string;
      bio: string;
      image: string;
    }>,
  ): Promise<User> {
    if (Object.keys(data).length > 0) {
      try {
        await this.usersRepository.update(id, data);
      } catch (error) {
        throw this.toConflictOrRethrow(error);
      }
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(this.i18n.t('errors.userNotFound'));
    }
    return user;
  }

  async updateWithAvatar(
    userId: string,
    data: Partial<{
      username: string;
      email: string;
      password: string;
      bio: string;
      image: string;
    }>,
    avatar?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (avatar) {
        await this.attachmentsService.deleteAllForOwner(
          AttachmentOwnerType.USER_AVATAR,
          userId,
        );
        const attachment = await this.attachmentsService.saveFile(
          AttachmentOwnerType.USER_AVATAR,
          userId,
          avatar,
        );
        data.image = `/attachments/${attachment.id}`;
      }

      const updated = await this.updateById(userId, data);
      await queryRunner.commitTransaction();
      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private toConflictOrRethrow(error: unknown): unknown {
    if (
      !(error instanceof QueryFailedError) ||
      (error.driverError as { code?: string })?.code !==
        POSTGRES_UNIQUE_VIOLATION
    ) {
      return error;
    }

    const constraint = (error.driverError as { constraint?: string })
      ?.constraint;
    if (constraint === 'UQ_users_username') {
      return new ConflictException(this.i18n.t('errors.usernameAlreadyTaken'));
    }
    if (constraint === 'UQ_users_email') {
      return new ConflictException(
        this.i18n.t('errors.emailAlreadyRegistered'),
      );
    }
    return new ConflictException(
      this.i18n.t('errors.usernameOrEmailAlreadyRegistered'),
    );
  }
}

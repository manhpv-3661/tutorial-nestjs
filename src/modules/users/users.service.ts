import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  getViolatedConstraint,
  isUniqueViolation,
} from '../../common/utils/postgres-unique-violation.util';
import { AttachmentOwnerType } from '../attachments/entities/attachment.entity';
import { AttachmentsService } from '../attachments/attachments.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserData, UpdateUserData } from './interfaces';
import { SALT_ROUNDS } from './constants/users.constants';

const UNIQUE_CONSTRAINT_USERNAME = 'UQ_users_username';
const UNIQUE_CONSTRAINT_EMAIL = 'UQ_users_email';

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

  async findByUsernameOrThrow(username: string): Promise<User> {
    const user = await this.findByUsername(username);
    if (!user) {
      throw new NotFoundException(this.i18n.t('errors.userNotFound'));
    }
    return user;
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.usersRepository.create(data);
    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      throw this.toConflictOrRethrow(error);
    }
  }

  async updateById(
    id: string,
    data: UpdateUserData,
    manager?: EntityManager,
  ): Promise<User> {
    const repository = manager
      ? manager.getRepository(User)
      : this.usersRepository;

    if (Object.keys(data).length > 0) {
      try {
        await repository.update(id, data);
      } catch (error) {
        throw this.toConflictOrRethrow(error);
      }
    }

    const user = await repository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(this.i18n.t('errors.userNotFound'));
    }
    return user;
  }

  async updateWithAvatar(
    userId: string,
    dto: UpdateUserDto,
    avatar?: Express.Multer.File,
  ): Promise<User> {
    const data = await this.buildUpdateData(dto);

    return this.dataSource.transaction(async (manager) => {
      if (avatar) {
        await this.attachmentsService.deleteAllForOwner(
          AttachmentOwnerType.USER_AVATAR,
          userId,
          manager,
        );
        const attachment = await this.attachmentsService.saveFile(
          AttachmentOwnerType.USER_AVATAR,
          userId,
          avatar,
          manager,
        );
        data.image = `/attachments/${attachment.id}`;
      }

      return this.updateById(userId, data, manager);
    });
  }

  private async buildUpdateData(dto: UpdateUserDto): Promise<UpdateUserData> {
    const data: UpdateUserData = {};
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }
    return data;
  }

  private toConflictOrRethrow(error: unknown): unknown {
    if (!isUniqueViolation(error)) {
      return error;
    }

    const constraint = getViolatedConstraint(error);
    if (constraint === UNIQUE_CONSTRAINT_USERNAME) {
      return new ConflictException(this.i18n.t('errors.usernameAlreadyTaken'));
    }
    if (constraint === UNIQUE_CONSTRAINT_EMAIL) {
      return new ConflictException(
        this.i18n.t('errors.emailAlreadyRegistered'),
      );
    }
    return new ConflictException(
      this.i18n.t('errors.usernameOrEmailAlreadyRegistered'),
    );
  }
}

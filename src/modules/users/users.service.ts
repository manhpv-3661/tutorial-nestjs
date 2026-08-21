import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './entities/user.entity';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly i18n: I18nService,
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
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          this.i18n.t('errors.usernameOrEmailAlreadyRegistered'),
        );
      }
      throw error;
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
    await this.usersRepository.update(id, data).catch((error: unknown) => {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          this.i18n.t('errors.usernameOrEmailAlreadyRegistered'),
        );
      }
      throw error;
    });

    return (await this.findById(id))!;
  }
}

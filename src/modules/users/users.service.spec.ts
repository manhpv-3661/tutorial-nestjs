import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  type CreateUserInput = {
    username: string;
    email: string;
    password: string;
  };

  let usersService: UsersService;
  let repository: {
    create: jest.Mock<CreateUserInput, [CreateUserInput]>;
    save: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn((data: CreateUserInput) => data),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
      ],
    }).compile();

    usersService = module.get(UsersService);
  });

  describe('create', () => {
    const data = {
      username: 'jake',
      email: 'jake@jake.jake',
      password: 'hashed',
    };

    it('saves and returns the new user on success', async () => {
      repository.save.mockResolvedValue({ id: 'user-id', ...data });

      const result = await usersService.create(data);

      expect(result).toEqual({ id: 'user-id', ...data });
    });

    it('maps a Postgres unique-violation into a ConflictException', async () => {
      const dbError = new QueryFailedError('INSERT ...', [], {
        code: '23505',
      } as unknown as Error);
      repository.save.mockRejectedValue(dbError);

      await expect(usersService.create(data)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows any other database error unchanged', async () => {
      const dbError = new QueryFailedError('INSERT ...', [], {
        code: '23502',
      } as unknown as Error);
      repository.save.mockRejectedValue(dbError);

      await expect(usersService.create(data)).rejects.toBe(dbError);
    });
  });

  describe('findByEmail / findById', () => {
    it('delegates to the repository with the right where clause', async () => {
      repository.findOne.mockResolvedValue(null);

      await usersService.findByEmail('jake@jake.jake');
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'jake@jake.jake' },
      });

      await usersService.findById('user-id');
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
    });
  });
});

import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, DataSource } from 'typeorm';
import { AttachmentsService } from '../attachments/attachments.service';
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
    update: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn((data: CreateUserInput) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
        {
          provide: AttachmentsService,
          useValue: { deleteAllForOwner: jest.fn(), saveFile: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
            })),
          },
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

  describe('updateById', () => {
    it('skips the update call and returns the current user when data is empty', async () => {
      repository.findOne.mockResolvedValue({ id: 'user-id' });

      const result = await usersService.updateById('user-id', {});

      expect(repository.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'user-id' });
    });

    it('throws NotFoundException when the user no longer exists', async () => {
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOne.mockResolvedValue(null);

      await expect(
        usersService.updateById('missing-id', { bio: 'hi' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps a username unique-violation to usernameAlreadyTaken', async () => {
      const dbError = new QueryFailedError('UPDATE ...', [], {
        code: '23505',
        constraint: 'UQ_users_username',
      } as unknown as Error);
      repository.update.mockRejectedValue(dbError);

      await expect(
        usersService.updateById('user-id', { username: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps an email unique-violation to emailAlreadyRegistered', async () => {
      const dbError = new QueryFailedError('UPDATE ...', [], {
        code: '23505',
        constraint: 'UQ_users_email',
      } as unknown as Error);
      repository.update.mockRejectedValue(dbError);

      await expect(
        usersService.updateById('user-id', { email: 'taken@jake.jake' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates and returns the user on success', async () => {
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOne.mockResolvedValue({ id: 'user-id', bio: 'hi' });

      const result = await usersService.updateById('user-id', { bio: 'hi' });

      expect(repository.update).toHaveBeenCalledWith('user-id', { bio: 'hi' });
      expect(result).toEqual({ id: 'user-id', bio: 'hi' });
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

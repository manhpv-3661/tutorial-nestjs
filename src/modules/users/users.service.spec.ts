import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError, DataSource, EntityManager } from 'typeorm';
import { AttachmentsService } from '../attachments/attachments.service';
import { AttachmentOwnerType } from '../attachments/entities/attachment.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserData } from './interfaces';

describe('UsersService', () => {
  let usersService: UsersService;
  let repository: {
    create: jest.Mock<CreateUserData, [CreateUserData]>;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let attachmentsService: {
    deleteAllForOwner: jest.Mock;
    saveFile: jest.Mock;
  };
  let fakeManager: EntityManager;

  beforeEach(async () => {
    repository = {
      create: jest.fn((data: CreateUserData) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    attachmentsService = {
      deleteAllForOwner: jest.fn(),
      saveFile: jest.fn(),
    };
    fakeManager = {
      getRepository: jest.fn(() => repository),
    } as unknown as EntityManager;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        {
          provide: I18nService,
          useValue: { t: jest.fn((key: string) => key) },
        },
        { provide: AttachmentsService, useValue: attachmentsService },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((work: (manager: EntityManager) => unknown) =>
              work(fakeManager),
            ),
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

  describe('findByUsernameOrThrow', () => {
    it('returns the user when found', async () => {
      repository.findOne.mockResolvedValue({ id: 'user-id', username: 'jake' });

      await expect(usersService.findByUsernameOrThrow('jake')).resolves.toEqual(
        { id: 'user-id', username: 'jake' },
      );
    });

    it('throws NotFoundException when no user matches', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        usersService.findByUsernameOrThrow('ghost'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateWithAvatar', () => {
    const dto: UpdateUserDto = { bio: 'new bio' };

    it('updates fields without touching attachments when no avatar is given', async () => {
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOne.mockResolvedValue({ id: 'user-id', bio: 'new bio' });

      const result = await usersService.updateWithAvatar('user-id', dto);

      expect(attachmentsService.deleteAllForOwner).not.toHaveBeenCalled();
      expect(attachmentsService.saveFile).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith('user-id', {
        bio: 'new bio',
      });
      expect(result).toEqual({ id: 'user-id', bio: 'new bio' });
    });

    it('deletes the old avatar, saves the new one, and sets image on the update payload', async () => {
      const avatar = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 100,
        buffer: Buffer.from('fake'),
      } as Express.Multer.File;
      attachmentsService.saveFile.mockResolvedValue({ id: 'attachment-id' });
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOne.mockResolvedValue({
        id: 'user-id',
        image: '/attachments/attachment-id',
      });

      const result = await usersService.updateWithAvatar('user-id', {}, avatar);

      expect(attachmentsService.deleteAllForOwner).toHaveBeenCalledWith(
        AttachmentOwnerType.USER_AVATAR,
        'user-id',
        fakeManager,
      );
      expect(attachmentsService.saveFile).toHaveBeenCalledWith(
        AttachmentOwnerType.USER_AVATAR,
        'user-id',
        avatar,
        fakeManager,
      );
      expect(repository.update).toHaveBeenCalledWith('user-id', {
        image: '/attachments/attachment-id',
      });
      expect(result).toEqual({
        id: 'user-id',
        image: '/attachments/attachment-id',
      });
    });

    it('hashes the password before saving when a new password is provided', async () => {
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOne.mockResolvedValue({ id: 'user-id' });

      await usersService.updateWithAvatar('user-id', { password: 'newpass1' });

      const [, updatePayload] = repository.update.mock.calls[0] as [
        string,
        { password?: string },
      ];
      expect(updatePayload.password).toBeDefined();
      expect(updatePayload.password).not.toBe('newpass1');
    });
  });
});

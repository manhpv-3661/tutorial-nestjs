import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { updateWithAvatar: jest.Mock };

  const currentUser = { id: 'user-id' } as User;
  const updatedUser = {
    id: 'user-id',
    username: 'jake',
    email: 'jake@jake.jake',
    bio: 'new bio',
    image: null,
  } as User;
  const req = { token: 'jwt-token' } as Request & { token?: string };

  beforeEach(async () => {
    usersService = {
      updateWithAvatar: jest.fn().mockResolvedValue(updatedUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('delegates dto and avatar straight to UsersService.updateWithAvatar', async () => {
    const dto: UpdateUserDto = { bio: 'new bio' };

    await controller.updateCurrentUser(currentUser, dto, undefined, req);

    expect(usersService.updateWithAvatar).toHaveBeenCalledWith(
      'user-id',
      dto,
      undefined,
    );
  });

  it('passes the uploaded avatar through untouched', async () => {
    const avatar = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 10,
      buffer: Buffer.from('x'),
    } as Express.Multer.File;

    await controller.updateCurrentUser(currentUser, {}, avatar, req);

    expect(usersService.updateWithAvatar).toHaveBeenCalledWith(
      'user-id',
      {},
      avatar,
    );
  });

  it('returns the updated user wrapped in UserResponseDto using the request token', async () => {
    const result = await controller.updateCurrentUser(
      currentUser,
      {},
      undefined,
      req,
    );

    expect(result.user).toMatchObject({
      username: 'jake',
      email: 'jake@jake.jake',
      token: 'jwt-token',
    });
  });

  it('falls back to an empty token when the request has none', async () => {
    const result = await controller.updateCurrentUser(
      currentUser,
      {},
      undefined,
      {} as Request & { token?: string },
    );

    expect(result.user.token).toBe('');
  });
});

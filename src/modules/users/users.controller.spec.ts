import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { updateWithAvatar: jest.Mock; toResponseDto: jest.Mock };

  const currentUser = { id: 'user-id' } as User;
  const updatedUser = {
    id: 'user-id',
    username: 'jake',
    email: 'jake@jake.jake',
    bio: 'new bio',
    image: null,
  } as User;
  const responseDto = {
    user: { username: 'jake', email: 'jake@jake.jake', token: 'jwt-token' },
  };
  const req = { token: 'jwt-token' } as Request & { token?: string };

  beforeEach(async () => {
    usersService = {
      updateWithAvatar: jest.fn().mockResolvedValue(updatedUser),
      toResponseDto: jest.fn().mockReturnValue(responseDto),
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

  it('composes the response via UsersService.toResponseDto with the updated user and request token', async () => {
    const result = await controller.updateCurrentUser(
      currentUser,
      {},
      undefined,
      req,
    );

    expect(usersService.toResponseDto).toHaveBeenCalledWith(
      updatedUser,
      'jwt-token',
    );
    expect(result).toBe(responseDto);
  });

  it('falls back to an empty token when the request has none', async () => {
    await controller.updateCurrentUser(
      currentUser,
      {},
      undefined,
      {} as Request & { token?: string },
    );

    expect(usersService.toResponseDto).toHaveBeenCalledWith(updatedUser, '');
  });
});

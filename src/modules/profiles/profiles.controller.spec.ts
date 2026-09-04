import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../users/entities/user.entity';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let profilesService: {
    getProfile: jest.Mock;
    follow: jest.Mock;
    unfollow: jest.Mock;
  };

  const currentUser = { id: 'current-id' } as User;
  const expectedResponse = { profile: { username: 'jake', following: true } };

  beforeEach(async () => {
    profilesService = {
      getProfile: jest.fn().mockResolvedValue(expectedResponse),
      follow: jest.fn().mockResolvedValue(expectedResponse),
      unfollow: jest.fn().mockResolvedValue(expectedResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: profilesService }],
    }).compile();

    controller = module.get(ProfilesController);
  });

  it('getProfile delegates to ProfilesService with the viewer id when present', async () => {
    const result = await controller.getProfile('jake', currentUser);

    expect(profilesService.getProfile).toHaveBeenCalledWith(
      'jake',
      'current-id',
    );
    expect(result).toBe(expectedResponse);
  });

  it('getProfile delegates with undefined viewer id for anonymous requests', async () => {
    await controller.getProfile('jake', null);

    expect(profilesService.getProfile).toHaveBeenCalledWith('jake', undefined);
  });

  it('follow delegates to ProfilesService with currentUser id and username', async () => {
    const result = await controller.follow('jake', currentUser);

    expect(profilesService.follow).toHaveBeenCalledWith('current-id', 'jake');
    expect(result).toBe(expectedResponse);
  });

  it('unfollow delegates to ProfilesService with currentUser id and username', async () => {
    const result = await controller.unfollow('jake', currentUser);

    expect(profilesService.unfollow).toHaveBeenCalledWith('current-id', 'jake');
    expect(result).toBe(expectedResponse);
  });
});

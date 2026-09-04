import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { FollowsService } from '../follows/follows.service';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  let profilesService: ProfilesService;
  let usersService: { findByUsernameOrThrow: jest.Mock };
  let followsService: {
    isFollowing: jest.Mock;
    follow: jest.Mock;
    unfollow: jest.Mock;
  };

  const profileUser = {
    id: 'target-id',
    username: 'jake',
    bio: 'hi',
    image: null,
  };

  beforeEach(async () => {
    usersService = {
      findByUsernameOrThrow: jest.fn().mockResolvedValue(profileUser),
    };
    followsService = {
      isFollowing: jest.fn(),
      follow: jest.fn(),
      unfollow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: UsersService, useValue: usersService },
        { provide: FollowsService, useValue: followsService },
      ],
    }).compile();

    profilesService = module.get(ProfilesService);
  });

  describe('getProfile', () => {
    it('returns following=false for an anonymous viewer', async () => {
      const result = await profilesService.getProfile('jake');

      expect(followsService.isFollowing).not.toHaveBeenCalled();
      expect(result.profile).toMatchObject({
        username: 'jake',
        following: false,
      });
    });

    it('checks follow status when a viewer id is given', async () => {
      followsService.isFollowing.mockResolvedValue(true);

      const result = await profilesService.getProfile('jake', 'viewer-id');

      expect(followsService.isFollowing).toHaveBeenCalledWith(
        'viewer-id',
        'target-id',
      );
      expect(result.profile.following).toBe(true);
    });
  });

  describe('follow', () => {
    it('resolves the target user then delegates to FollowsService', async () => {
      const result = await profilesService.follow('viewer-id', 'jake');

      expect(usersService.findByUsernameOrThrow).toHaveBeenCalledWith('jake');
      expect(followsService.follow).toHaveBeenCalledWith(
        'viewer-id',
        'target-id',
      );
      expect(result.profile).toMatchObject({
        username: 'jake',
        following: true,
      });
    });
  });

  describe('unfollow', () => {
    it('resolves the target user then delegates to FollowsService', async () => {
      const result = await profilesService.unfollow('viewer-id', 'jake');

      expect(followsService.unfollow).toHaveBeenCalledWith(
        'viewer-id',
        'target-id',
      );
      expect(result.profile).toMatchObject({
        username: 'jake',
        following: false,
      });
    });
  });
});

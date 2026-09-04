import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { FollowsService } from '../follows/follows.service';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly followsService: FollowsService,
  ) {}

  async getProfile(
    username: string,
    currentUserId?: string,
  ): Promise<ProfileResponseDto> {
    const profileUser = await this.usersService.findByUsernameOrThrow(username);
    const following = currentUserId
      ? await this.followsService.isFollowing(currentUserId, profileUser.id)
      : false;
    return ProfileResponseDto.fromEntity(profileUser, following);
  }

  async follow(
    currentUserId: string,
    username: string,
  ): Promise<ProfileResponseDto> {
    const profileUser = await this.usersService.findByUsernameOrThrow(username);
    await this.followsService.follow(currentUserId, profileUser.id);
    return ProfileResponseDto.fromEntity(profileUser, true);
  }

  async unfollow(
    currentUserId: string,
    username: string,
  ): Promise<ProfileResponseDto> {
    const profileUser = await this.usersService.findByUsernameOrThrow(username);
    await this.followsService.unfollow(currentUserId, profileUser.id);
    return ProfileResponseDto.fromEntity(profileUser, false);
  }
}

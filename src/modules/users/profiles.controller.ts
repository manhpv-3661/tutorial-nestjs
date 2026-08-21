import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { User } from './entities/user.entity';
import { FollowsService } from './follows.service';
import { UsersService } from './users.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly usersService: UsersService,
    private readonly followsService: FollowsService,
    private readonly i18n: I18nService,
  ) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':username')
  async getProfile(
    @Param('username') username: string,
    @CurrentUser() currentUser: User | null,
  ): Promise<ProfileResponseDto> {
    const profileUser = await this.findProfileUserOrThrow(username);
    const following = currentUser
      ? await this.followsService.isFollowing(currentUser.id, profileUser.id)
      : false;
    return ProfileResponseDto.fromEntity(profileUser, following);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':username/follow')
  async follow(
    @Param('username') username: string,
    @CurrentUser() currentUser: User,
  ): Promise<ProfileResponseDto> {
    const profileUser = await this.findProfileUserOrThrow(username);
    await this.followsService.follow(currentUser.id, profileUser.id);
    return ProfileResponseDto.fromEntity(profileUser, true);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':username/follow')
  async unfollow(
    @Param('username') username: string,
    @CurrentUser() currentUser: User,
  ): Promise<ProfileResponseDto> {
    const profileUser = await this.findProfileUserOrThrow(username);
    await this.followsService.unfollow(currentUser.id, profileUser.id);
    return ProfileResponseDto.fromEntity(profileUser, false);
  }

  private async findProfileUserOrThrow(username: string): Promise<User> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException(this.i18n.t('errors.userNotFound'));
    }
    return user;
  }
}

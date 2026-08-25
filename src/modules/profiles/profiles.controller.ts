import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { User } from '../users/entities/user.entity';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':username')
  async getProfile(
    @Param('username') username: string,
    @CurrentUser() currentUser: User | null,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.getProfile(username, currentUser?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':username/follow')
  async follow(
    @Param('username') username: string,
    @CurrentUser() currentUser: User,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.follow(currentUser.id, username);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':username/follow')
  async unfollow(
    @Param('username') username: string,
    @CurrentUser() currentUser: User,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.unfollow(currentUser.id, username);
  }
}

import {
  Body,
  Controller,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UPDATE_USER_SCHEMA } from './constants/users.constants';
import { createAvatarUploadInterceptor } from './interceptors/avatar-upload.interceptor';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: UPDATE_USER_SCHEMA })
  @UseInterceptors(createAvatarUploadInterceptor())
  async updateCurrentUser(
    @CurrentUser() currentUser: User,
    @Body() dto: UpdateUserDto,
    @UploadedFile() avatar: Express.Multer.File | undefined,
    @Req() req: Request & { token?: string },
  ): Promise<UserResponseDto> {
    const updated = await this.usersService.updateWithAvatar(
      currentUser.id,
      dto,
      avatar,
    );
    return UserResponseDto.fromEntity(updated, req.token ?? '');
  }
}

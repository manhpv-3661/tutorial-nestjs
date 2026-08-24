import {
  BadRequestException,
  Body,
  Controller,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { AvatarFile } from './interfaces';
import {
  SALT_ROUNDS,
  ALLOWED_AVATAR_MIME_TYPES,
  UPDATE_USER_SCHEMA,
} from './constants/users.constants';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: UPDATE_USER_SCHEMA })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              `Avatar must be one of: ${ALLOWED_AVATAR_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async updateCurrentUser(
    @CurrentUser() currentUser: User,
    @Body() dto: UpdateUserDto,
    @UploadedFile() avatar: AvatarFile | undefined,
    @Req() req: Request & { token?: string },
  ): Promise<UserResponseDto> {
    const data: Partial<{
      username: string;
      email: string;
      password: string;
      bio: string;
      image: string;
    }> = {};

    if (dto.username !== undefined) data.username = dto.username;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    const updated = await this.usersService.updateWithAvatar(
      currentUser.id,
      data,
      avatar,
    );
    return UserResponseDto.fromEntity(updated, req.token ?? '');
  }
}

import {
  Body,
  Controller,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { AttachmentOwnerType } from '../attachments/entities/attachment.entity';
import { AttachmentsService } from '../attachments/attachments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

const SALT_ROUNDS = 10;

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Put()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async updateCurrentUser(
    @CurrentUser() currentUser: User,
    @Body() dto: UpdateUserDto,
    @UploadedFile()
    avatar:
      | {
          originalname: string;
          mimetype: string;
          size: number;
          buffer: Buffer;
        }
      | undefined,
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

    if (avatar) {
      const attachment = await this.attachmentsService.saveFile(
        AttachmentOwnerType.USER_AVATAR,
        currentUser.id,
        avatar,
      );
      data.image = `/attachments/${attachment.id}`;
    }

    const updated = await this.usersService.updateById(currentUser.id, data);
    return UserResponseDto.fromEntity(updated, req.token ?? '');
  }
}

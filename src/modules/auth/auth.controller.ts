import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import type { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users')
  register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(dto);
  }

  @Post('users/login')
  login(@Body() dto: LoginDto): Promise<UserResponseDto> {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('users/logout')
  @HttpCode(204)
  async logout(@Req() req: Request & { token?: string }): Promise<void> {
    if (req.token) {
      await this.authService.logout(req.token);
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('user')
  getCurrentUser(
    @CurrentUser() user: User,
    @Req() req: Request & { token?: string },
  ): UserResponseDto {
    return UserResponseDto.fromEntity(user, req.token ?? '');
  }
}

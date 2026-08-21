import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsModule } from '../attachments/attachments.module';
import { Follow } from './entities/follow.entity';
import { User } from './entities/user.entity';
import { FollowsService } from './follows.service';
import { ProfilesController } from './profiles.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Follow]), AttachmentsModule],
  controllers: [UsersController, ProfilesController],
  providers: [UsersService, FollowsService],
  exports: [UsersService, FollowsService],
})
export class UsersModule {}

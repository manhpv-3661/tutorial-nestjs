import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from './entities/follow.entity';
import { FollowsService } from './follows.service';

@Module({
  imports: [TypeOrmModule.forFeature([Follow])],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}

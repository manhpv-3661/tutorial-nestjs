import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ArticlesService } from '../articles/articles.service';
import { PaginationQueryDto } from '../articles/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CommentsService } from './comments.service';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CommentsListResponseDto } from './dto/comments-list-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@Controller('articles/:slug/comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly articlesService: ArticlesService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const article = await this.articlesService.findBySlugOrThrow(slug);
    const comment = await this.commentsService.create(article.id, currentUser, {
      body: dto.body,
    });
    return this.commentsService.toResponseDto(comment, currentUser.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async list(
    @Param('slug') slug: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() currentUser: User | null,
  ): Promise<CommentsListResponseDto> {
    const article = await this.articlesService.findBySlugOrThrow(slug);
    const comments = await this.commentsService.listByArticle(
      article.id,
      query,
    );
    return this.commentsService.toListResponseDto(comments, currentUser?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    const article = await this.articlesService.findBySlugOrThrow(slug);
    await this.commentsService.deleteByIdForArticle(
      article.id,
      id,
      currentUser.id,
    );
  }
}

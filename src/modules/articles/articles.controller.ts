import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ArticlesService } from './articles.service';
import { ArticleResponseDto } from './dto/article-response.dto';
import { ArticlesListResponseDto } from './dto/articles-list-response.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { FeedArticlesQueryDto } from './dto/feed-articles-query.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() currentUser: User,
    @Body() dto: CreateArticleDto,
  ): Promise<ArticleResponseDto> {
    const article = await this.articlesService.create(currentUser.id, {
      title: dto.title,
      description: dto.description,
      body: dto.body,
      tagList: dto.tagList ?? [],
    });
    return this.articlesService.toResponseDto(article, currentUser.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async list(
    @Query() query: ListArticlesQueryDto,
    @CurrentUser() currentUser: User | null,
  ): Promise<ArticlesListResponseDto> {
    const page = await this.articlesService.list(query);
    return this.articlesService.toListResponseDto(page, currentUser?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('feed')
  async feed(
    @Query() query: FeedArticlesQueryDto,
    @CurrentUser() currentUser: User,
  ): Promise<ArticlesListResponseDto> {
    const page = await this.articlesService.feed(currentUser.id, query);
    return this.articlesService.toListResponseDto(page, currentUser.id, {
      allAuthorsFollowed: true,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  async getBySlug(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User | null,
  ): Promise<ArticleResponseDto> {
    const article = await this.articlesService.findBySlugOrThrow(slug);
    return this.articlesService.toResponseDto(article, currentUser?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':slug')
  async update(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User,
    @Body() dto: UpdateArticleDto,
  ): Promise<ArticleResponseDto> {
    const article = await this.articlesService.updateBySlug(
      slug,
      currentUser.id,
      dto,
    );
    return this.articlesService.toResponseDto(article, currentUser.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    await this.articlesService.deleteBySlug(slug, currentUser.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':slug/favorite')
  async favorite(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User,
  ): Promise<ArticleResponseDto> {
    const article = await this.articlesService.favorite(slug, currentUser.id);
    return this.articlesService.toResponseDto(article, currentUser.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':slug/favorite')
  async unfavorite(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User,
  ): Promise<ArticleResponseDto> {
    const article = await this.articlesService.unfavorite(slug, currentUser.id);
    return this.articlesService.toResponseDto(article, currentUser.id);
  }
}

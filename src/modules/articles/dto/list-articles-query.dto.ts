import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListArticlesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  favorited?: string;
}

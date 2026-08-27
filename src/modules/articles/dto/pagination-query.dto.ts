import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  DEFAULT_ARTICLES_LIMIT,
  MAX_ARTICLES_LIMIT,
} from '../constants/articles.constants';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: DEFAULT_ARTICLES_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN_LIMIT') })
  @Max(MAX_ARTICLES_LIMIT, {
    message: i18nValidationMessage('validation.MAX_LIMIT'),
  })
  limit: number = DEFAULT_ARTICLES_LIMIT;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN_OFFSET') })
  offset: number = 0;
}

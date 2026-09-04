import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsNonBlankString } from '../../../common/decorators/is-non-blank-string.decorator';
import {
  MAX_BODY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../constants/articles.constants';

export class UpdateArticleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNonBlankString(MAX_TITLE_LENGTH, {
    minLength: 'validation.MIN_LENGTH_TITLE',
    maxLength: 'validation.MAX_LENGTH_TITLE',
  })
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNonBlankString(MAX_DESCRIPTION_LENGTH, {
    minLength: 'validation.MIN_LENGTH_DESCRIPTION',
    maxLength: 'validation.MAX_LENGTH_DESCRIPTION',
  })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNonBlankString(MAX_BODY_LENGTH, {
    minLength: 'validation.MIN_LENGTH_BODY',
    maxLength: 'validation.MAX_LENGTH_BODY',
  })
  body?: string;
}

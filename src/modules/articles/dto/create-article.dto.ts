import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsNonBlankString } from '../../../common/decorators/is-non-blank-string.decorator';
import {
  MAX_BODY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../constants/articles.constants';

export class CreateArticleDto {
  @ApiProperty()
  @IsNonBlankString(MAX_TITLE_LENGTH, {
    minLength: 'validation.MIN_LENGTH_TITLE',
    maxLength: 'validation.MAX_LENGTH_TITLE',
  })
  title: string;

  @ApiProperty()
  @IsNonBlankString(MAX_DESCRIPTION_LENGTH, {
    minLength: 'validation.MIN_LENGTH_DESCRIPTION',
    maxLength: 'validation.MAX_LENGTH_DESCRIPTION',
  })
  description: string;

  @ApiProperty()
  @IsNonBlankString(MAX_BODY_LENGTH, {
    minLength: 'validation.MIN_LENGTH_BODY',
    maxLength: 'validation.MAX_LENGTH_BODY',
  })
  body: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @IsString({
    each: true,
    message: i18nValidationMessage('validation.IS_STRING'),
  })
  tagList?: string[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  MAX_BODY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../constants/articles.constants';

export class CreateArticleDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_TITLE'),
  })
  @MaxLength(MAX_TITLE_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH_TITLE'),
  })
  title: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_DESCRIPTION'),
  })
  @MaxLength(MAX_DESCRIPTION_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH_DESCRIPTION'),
  })
  description: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_BODY'),
  })
  @MaxLength(MAX_BODY_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH_BODY'),
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

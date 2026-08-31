import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  MAX_BODY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../constants/articles.constants';

export class UpdateArticleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @Matches(/\S/, {
    message: i18nValidationMessage('validation.MIN_LENGTH_TITLE'),
  })
  @MaxLength(MAX_TITLE_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH_TITLE'),
  })
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @Matches(/\S/, {
    message: i18nValidationMessage('validation.MIN_LENGTH_DESCRIPTION'),
  })
  @MaxLength(MAX_DESCRIPTION_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH_DESCRIPTION'),
  })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @Matches(/\S/, {
    message: i18nValidationMessage('validation.MIN_LENGTH_BODY'),
  })
  @MaxLength(MAX_BODY_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH_BODY'),
  })
  body?: string;
}

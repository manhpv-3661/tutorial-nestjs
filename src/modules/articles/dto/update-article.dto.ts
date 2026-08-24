import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateArticleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_TITLE'),
  })
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_DESCRIPTION'),
  })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_BODY'),
  })
  body?: string;
}

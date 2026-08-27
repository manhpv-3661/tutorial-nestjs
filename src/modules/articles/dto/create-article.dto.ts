import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateArticleDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_TITLE'),
  })
  title: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_DESCRIPTION'),
  })
  description: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_BODY'),
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

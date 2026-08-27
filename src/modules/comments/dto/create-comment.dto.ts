import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MAX_BODY_LENGTH } from '../constants/comments.constants';

export class CreateCommentDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, {
    message: i18nValidationMessage('validation.MIN_LENGTH_BODY'),
  })
  @MaxLength(MAX_BODY_LENGTH, {
    message: i18nValidationMessage('validation.MAX_LENGTH_COMMENT_BODY'),
  })
  body: string;
}

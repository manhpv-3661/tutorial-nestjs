import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export function IsNonBlankString(
  maxLength: number,
  messageKeys: { minLength: string; maxLength: string },
) {
  return applyDecorators(
    IsString({ message: i18nValidationMessage('validation.IS_STRING') }),
    Matches(/\S/, { message: i18nValidationMessage(messageKeys.minLength) }),
    MaxLength(maxLength, {
      message: i18nValidationMessage(messageKeys.maxLength),
    }),
  );
}

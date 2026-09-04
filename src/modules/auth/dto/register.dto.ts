import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(3, {
    message: i18nValidationMessage('validation.MIN_LENGTH_USERNAME'),
  })
  username: string;

  @ApiProperty()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  email: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, {
    message: i18nValidationMessage('validation.MIN_LENGTH_PASSWORD'),
  })
  password: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @ApiProperty()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  email: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  password: string;
}

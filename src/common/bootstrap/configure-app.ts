import { ClassSerializerInterceptor, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nValidationPipe } from 'nestjs-i18n';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new I18nValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());
}

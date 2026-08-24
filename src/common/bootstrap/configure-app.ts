import { ClassSerializerInterceptor, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nValidationPipe } from 'nestjs-i18n';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new I18nValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());
}

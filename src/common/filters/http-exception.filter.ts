import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { I18nValidationException } from 'nestjs-i18n';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body =
      exception instanceof I18nValidationException
        ? this.flattenI18nValidationErrors(exception)
        : this.extractMessages(exception.getResponse());

    response.status(status).json({ errors: { body } });
  }

  private flattenI18nValidationErrors(
    exception: I18nValidationException,
  ): string[] {
    return exception.errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .map(String);
  }

  private extractMessages(exceptionResponse: string | object): string[] {
    if (typeof exceptionResponse === 'string') {
      return [exceptionResponse];
    }

    const { message, statusCode } = exceptionResponse as {
      message?: unknown;
      statusCode?: number;
    };
    if (Array.isArray(message)) {
      return message.map(String);
    }
    if (typeof message === 'string') {
      return [message];
    }
    return [
      (statusCode !== undefined ? HttpStatus[statusCode] : undefined) ??
        'Error',
    ];
  }
}

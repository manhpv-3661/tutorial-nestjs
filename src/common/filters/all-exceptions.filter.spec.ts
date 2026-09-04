import {
  ArgumentsHost,
  ConflictException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { I18nValidationException } from 'nestjs-i18n';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('wraps an HttpException message in the error envelope', () => {
    filter.catch(new ConflictException('Username already taken'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      errors: { body: ['Username already taken'] },
    });
  });

  it('flattens i18n validation constraints', () => {
    const exception = new I18nValidationException([
      { property: 'email', constraints: { isEmail: 'Email is invalid' } },
      {
        property: 'password',
        constraints: { minLength: 'Password too short' },
      },
    ]);

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith({
      errors: { body: ['Email is invalid', 'Password too short'] },
    });
  });

  it('maps an unhandled non-HTTP error to a 500 in the same envelope', () => {
    filter.catch(new Error('connect ECONNREFUSED'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      errors: { body: ['Internal server error'] },
    });
  });

  it('does not leak the internal error message to the client', () => {
    filter.catch(new Error('password=secret in connection string'), host);

    expect(JSON.stringify(json.mock.calls)).not.toContain('secret');
  });
});

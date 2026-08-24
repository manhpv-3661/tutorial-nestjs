import { QueryFailedError } from 'typeorm';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): error is QueryFailedError {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string })?.code === POSTGRES_UNIQUE_VIOLATION
  );
}

export function getViolatedConstraint(
  error: QueryFailedError,
): string | undefined {
  return (error.driverError as { constraint?: string })?.constraint;
}

import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export function buildDataSourceOptions(
  baseDir: string,
  options: { forMigrations?: boolean } = {},
): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [baseDir + '/**/*.entity{.ts,.js}'],
    migrations: [baseDir + '/database/migrations/*{.ts,.js}'],
    synchronize: false,
    // The pool/timeout guard below is for the long-lived app connection
    // pool only. The CLI migration runner (data-source.ts/data-source.test.ts)
    // opts out via forMigrations - a future migration that legitimately runs
    // longer than 10s (e.g. backfilling a column on a large table) must not
    // get killed by the same timeout that protects app requests.
    ...(options.forMigrations
      ? {}
      : {
          extra: {
            // pg.Pool default is already 10 - kept the same value, just made it an
            // explicit decision instead of a silent default (see CODING_STANDARD.md §18.7).
            max: 10,
            // No timeout by default means a runaway/stuck query never releases its
            // connection back to the pool, slowly starving it. 10s covers every
            // query this app issues today (single-row lookups, paginated lists)
            // with margin to spare.
            statement_timeout: 10_000,
          },
        }),
  };
}

export const typeormConfig = registerAs('typeorm', () =>
  buildDataSourceOptions(__dirname + '/..'),
);

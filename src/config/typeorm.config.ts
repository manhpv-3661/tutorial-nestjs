import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export function buildDataSourceOptions(baseDir: string): DataSourceOptions {
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
  };
}

export const typeormConfig = registerAs('typeorm', () =>
  buildDataSourceOptions(__dirname + '/..'),
);

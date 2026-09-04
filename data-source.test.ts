import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './src/config/typeorm.config';

config({ path: __dirname + '/.env.test' });

export default new DataSource(
  buildDataSourceOptions(__dirname + '/src', { forMigrations: true }),
);

import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './src/config/typeorm.config';

config();

export default new DataSource(
  buildDataSourceOptions(__dirname + '/src', { forMigrations: true }),
);

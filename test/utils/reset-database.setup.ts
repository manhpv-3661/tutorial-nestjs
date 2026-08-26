import { getActiveDataSource } from './create-test-app';
import { truncateAllTables } from './db-reset';
import { seedDatabase } from './seed-database';

beforeEach(async () => {
  const dataSource = getActiveDataSource();
  if (dataSource) {
    await seedDatabase(dataSource);
  }
});

afterEach(async () => {
  const dataSource = getActiveDataSource();
  if (dataSource) {
    await truncateAllTables(dataSource);
  }
});

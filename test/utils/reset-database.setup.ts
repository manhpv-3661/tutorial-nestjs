import { getActiveDataSource } from './create-test-app';
import { truncateAllTables } from './db-reset';
import { seedDatabase } from './seed-database';

beforeEach(async () => {
  const dataSource = getActiveDataSource();
  if (dataSource) {
    // Truncate before seeding, not just after each test, so a crashed or
    // interrupted prior run (Ctrl+C, timeout, OOM) can never leave dirty
    // rows that make the next run's first test fail on a unique violation.
    await truncateAllTables(dataSource);
    await seedDatabase(dataSource);
  }
});

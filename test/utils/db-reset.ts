import { DataSource } from 'typeorm';

function assertIsTestDatabase(dataSource: DataSource): void {
  const database = (dataSource.options as { database?: string }).database;
  if (!database?.includes('test')) {
    throw new Error(
      `Refusing to truncate database "${String(database)}" - its name does not ` +
        'contain "test". This guard exists so the e2e suite cannot wipe a real ' +
        'dev/prod database if a DB_NAME env var leaks in from the shell instead ' +
        'of .env.test.',
    );
  }
}

export async function truncateAllTables(dataSource: DataSource): Promise<void> {
  assertIsTestDatabase(dataSource);

  const tables = await dataSource.query<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations'`,
  );
  if (tables.length === 0) {
    return;
  }

  const tableNames = tables.map((table) => `"${table.tablename}"`).join(', ');
  await dataSource.query(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
  );
}

import { DataSource } from 'typeorm';

export async function truncateAllTables(dataSource: DataSource): Promise<void> {
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

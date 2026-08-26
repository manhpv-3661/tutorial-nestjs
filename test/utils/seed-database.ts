import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { SALT_ROUNDS } from '../../src/modules/users/constants/users.constants';
import { User } from '../../src/modules/users/entities/user.entity';

export const SEED_USERS = [
  { username: 'seed_alice', email: 'seed_alice@example.com' },
  { username: 'seed_bob', email: 'seed_bob@example.com' },
];

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  const password = await bcrypt.hash('seed-password-123', SALT_ROUNDS);
  await dataSource.getRepository(User).insert(
    SEED_USERS.map((seedUser) => ({
      username: seedUser.username,
      email: seedUser.email,
      password,
    })),
  );
}

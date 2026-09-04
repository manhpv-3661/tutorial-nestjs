import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { SALT_ROUNDS } from '../../src/modules/users/constants/users.constants';
import { User } from '../../src/modules/users/entities/user.entity';

export const SEED_USERS = [
  { username: 'seed_alice', email: 'seed_alice@example.com' },
  { username: 'seed_bob', email: 'seed_bob@example.com' },
];

// The seed password is a fixed constant, so its hash never changes across
// the ~50+ e2e test cases that call seedDatabase() in a global beforeEach -
// compute it once per process instead of re-hashing on every test.
let cachedPasswordHash: Promise<string> | undefined;

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  cachedPasswordHash ??= bcrypt.hash('seed-password-123', SALT_ROUNDS);
  const password = await cachedPasswordHash;
  await dataSource.getRepository(User).insert(
    SEED_USERS.map((seedUser) => ({
      username: seedUser.username,
      email: seedUser.email,
      password,
    })),
  );
}

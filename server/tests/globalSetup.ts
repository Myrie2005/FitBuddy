import { execSync } from 'node:child_process';
import { getTestDatabaseUrl } from './testDb.js';

/** Before the whole run: bring the test database's tables in line with the .prisma files. */
export default function setup() {
  const url = getTestDatabaseUrl();
  if (process.env.TEST_SKIP_DB_PUSH === '1') return; // schema already up to date

  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}

/**
 * Finds the test database URL and refuses anything that looks like the shared development database,
 * because the tests delete all data on every run.
 */
import 'dotenv/config';

export function getTestDatabaseUrl(): string {
  const testUrl = process.env.TEST_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;

  if (!testUrl) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Tests delete all data, so they need their own database.\n' +
        'Neon → Branches → create a "test" branch → Connect → copy its URL into TEST_DATABASE_URL in .env',
    );
  }
  if (devUrl && hostOf(testUrl) === hostOf(devUrl)) {
    throw new Error(
      'TEST_DATABASE_URL points to the same database as DATABASE_URL. ' +
        'Use the Neon "test" branch, never development or production.',
    );
  }
  return testUrl;
}

function hostOf(url: string) {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}

import { getTestDatabaseUrl } from './testDb.js';

// Must run before the server code is imported: src/config/all.ts reads DATABASE_URL when it loads.
process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.JWT_SECRET ??= 'test-secret';

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Not needed for `prisma generate` (runs on npm install); only for db push / seed / studio.
    url: process.env.DATABASE_URL ?? '',
  },
});

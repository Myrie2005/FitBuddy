import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const config = {
  // --- Environment (.env) ---
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  /** Comma-separated list of allowed client origins. Empty = allow all (fine for development). */
  clientOrigins: (process.env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === 'production',

  // --- App constants ---
  jwtExpiresIn: '7d',
  jsonBodyLimit: '100kb',

  workout: {
    minParticipants: 2,
    maxParticipants: 50,
    maxCost: 1000,
    titleMinLength: 3,
    titleMaxLength: 80,
    descriptionMaxLength: 500,
    locationMaxLength: 120,
  },

  /** GET /api/workouts: default and max number of results */
  listLimit: { default: 50, max: 100 },
} as const;

// Safety checks for the deployed server: refuse to start with settings that are fine locally but unsafe online
if (config.isProduction) {
  if (config.clientOrigins.length === 0) {
    throw new Error('CLIENT_ORIGIN must be set in production (the address of the client app).');
  }
  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
}

/** CORS setting used by both Express and Socket.IO */
export const corsOrigin = config.clientOrigins.length > 0 ? [...config.clientOrigins] : true;

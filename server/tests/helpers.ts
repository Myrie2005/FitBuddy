import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/core/prisma.js';
import { signToken } from '../src/middleware/auth.js';
import type { Role } from '../src/generated/prisma/enums.js';

export const app = createApp();
export const api = () => request(app);
export { prisma };

/** Deletes all data. Call in beforeEach so every test starts from an empty database. */
export async function resetDb() {
  await prisma.report.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.user.deleteMany();
}

let userCounter = 0;

/** Creates a user directly in the DB and returns it with a ready-to-use auth header. */
export async function createUser(
  overrides: {
    name?: string;
    role?: Role;
    isBlocked?: boolean;
    isTrainer?: boolean;
  } = {}
) {
  userCounter += 1;
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `User ${userCounter}`,
      email: `user${userCounter}-${Date.now()}@test.dev`,
      passwordHash: 'test',
      role: overrides.role ?? 'USER',
      isBlocked: overrides.isBlocked ?? false,
      isTrainer: overrides.isTrainer ?? false,
    },
  });
  return {
    ...user,
    auth: { Authorization: `Bearer ${signToken(user.id)}` },
  };
}

export type TestUser = Awaited<ReturnType<typeof createUser>>;

/** A date `hours` from now, as an ISO string. */
export const inHours = (hours: number) =>
  new Date(Date.now() + hours * 3600_000).toISOString();

export const validWorkout = (overrides: Record<string, unknown> = {}) => ({
  title: 'ריצת ערב',
  category: 'RUNNING',
  location: 'גן סאקר, ירושלים',
  startTime: inHours(24),
  maxParticipants: 5,
  ...overrides,
});

/** Creates a workout through the API (so the organizer is registered like in real use). */
export async function createWorkout(
  organizer: TestUser,
  overrides: Record<string, unknown> = {}
) {
  const res = await api()
    .post('/api/workouts')
    .set(organizer.auth)
    .send(validWorkout(overrides));

  if (res.status !== 201) {
    throw new Error(
      `createWorkout failed: ${res.status} ${JSON.stringify(res.body)}`
    );
  }

  return res.body as {
    id: string;
    participants: number;
    [key: string]: unknown;
  };
}
import { Router } from 'express';
import { notFound } from '../core/errors.js';
import { prisma } from '../core/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { updateProfileSchema } from '../schemas/user.js';
import { idParam } from '../schemas/common.js';
import { toWorkoutDto, workoutInclude } from '../core/workoutDto.js';

export const usersRouter = Router();

/** Fields that are safe to send to the client (never passwordHash). */
const publicUser = {
  id: true,
  name: true,
  area: true,
  level: true,
  bio: true,
  preferredCategory: true,
  preferredTime: true,
  createdAt: true,
} as const;
const privateUser = { ...publicUser, email: true, role: true } as const;

// GET /api/users/me
usersRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: privateUser });
  res.json(user);
});

// PATCH /api/users/me
usersRouter.patch('/me', requireAuth, async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data, select: privateUser });
  res.json(user);
});

// GET /api/users/me/workouts  -> { organized: [...], joined: [...] }
usersRouter.get('/me/workouts', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const include = workoutInclude(userId);

  const [organized, joined] = await Promise.all([
    prisma.workout.findMany({ where: { creatorId: userId }, include, orderBy: { startTime: 'asc' } }),
    prisma.workout.findMany({
      where: { registrations: { some: { userId } }, NOT: { creatorId: userId } },
      include,
      orderBy: { startTime: 'asc' },
    }),
  ]);

  res.json({
    organized: organized.map((w) => toWorkoutDto(w, userId)),
    joined: joined.map((w) => toWorkoutDto(w, userId)),
  });
});

// GET /api/users/:id  - public profile
usersRouter.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...publicUser, _count: { select: { createdWorkouts: true, registrations: true } } },
  });
  if (!user) throw notFound('User');

  const { _count, ...rest } = user;
  res.json({ ...rest, workoutsOrganized: _count.createdWorkouts, workoutsJoined: _count.registrations });
});

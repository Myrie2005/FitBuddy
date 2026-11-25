import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { HttpError, forbidden, notFound } from '../core/errors.js';
import { prisma } from '../core/prisma.js';
import { emit } from '../core/socket.js';
import { optionalAuth, requireAuth, requireTrainer } from '../middleware/auth.js';
import { idParam } from '../schemas/common.js';
import { createWorkoutSchema, listWorkoutsQuery, updateWorkoutSchema } from '../schemas/workout.js';
import { toWorkoutDto, workoutInclude } from '../core/workoutDto.js';

export const workoutsRouter = Router();

async function getWorkoutDto(id: string, viewerId?: string) {
  const workout = await prisma.workout.findUnique({ where: { id }, include: workoutInclude(viewerId) });
  if (!workout) throw notFound('Workout');
  return toWorkoutDto(workout, viewerId);
}

/** Sends the updated workout to every connected client (no per-viewer fields). */
async function broadcastWorkoutUpdate(id: string) {
  emit('workout:updated', await getWorkoutDto(id));
}

async function assertCanEdit(workoutId: string, user: NonNullable<Express.Request['user']>) {
  const workout = await prisma.workout.findUnique({ where: { id: workoutId }, select: { creatorId: true } });
  if (!workout) throw notFound('Workout');
  if (workout.creatorId !== user.id && user.role !== 'ADMIN') {
    throw forbidden('Only the organizer or an admin can change this workout');
  }
}

// GET /api/workouts?category=RUNNING&level=ALL&q=פארק&from=...&to=...&includePast=true&limit=50
workoutsRouter.get('/', optionalAuth, async (req, res) => {
  const query = listWorkoutsQuery.parse(req.query);
  const viewerId = req.user?.id;

  const where: Prisma.WorkoutWhereInput = {
    // Workouts of blocked users are hidden
    creator: { isBlocked: false },
    category: query.category,
    level: query.level,
    startTime: {
      gte: query.from ?? (query.includePast ? undefined : new Date()),
      lte: query.to,
    },
    ...(query.q && {
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };

  const workouts = await prisma.workout.findMany({
    where,
    include: workoutInclude(viewerId),
    orderBy: { startTime: 'asc' },
    take: query.limit,
  });
  res.json(workouts.map((w) => toWorkoutDto(w, viewerId)));
});

// GET /api/workouts/:id
workoutsRouter.get('/:id', optionalAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await getWorkoutDto(id, req.user?.id));
});

// GET /api/workouts/:id/participants
workoutsRouter.get('/:id/participants', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const exists = await prisma.workout.count({ where: { id } });
  if (!exists) throw notFound('Workout');

  const registrations = await prisma.registration.findMany({
    where: { workoutId: id },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true, user: { select: { id: true, name: true, level: true } } },
  });
  res.json(registrations.map((r) => ({ ...r.user, joinedAt: r.createdAt.toISOString() })));
});

// POST /api/workouts - approved trainers and admins only.
// The organizer is registered automatically.
workoutsRouter.post('/', requireAuth, requireTrainer, async (req, res) => {
  const data = createWorkoutSchema.parse(req.body);
  const userId = req.user!.id;

  const workout = await prisma.workout.create({
    data: {
      ...data,
      creatorId: userId,
      registrations: { create: { userId } },
    },
    include: workoutInclude(userId),
  });

  emit('workout:created', toWorkoutDto(workout));
  res.status(201).json(toWorkoutDto(workout, userId));
});

// PATCH /api/workouts/:id  - organizer or admin
workoutsRouter.patch('/:id', requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = updateWorkoutSchema.parse(req.body);
  await assertCanEdit(id, req.user!);

  if (data.maxParticipants !== undefined) {
    const registered = await prisma.registration.count({ where: { workoutId: id } });
    if (data.maxParticipants < registered) {
      throw new HttpError(409, `${registered} people are already registered`, 'MAX_BELOW_REGISTERED');
    }
  }

  await prisma.workout.update({ where: { id }, data });
  await broadcastWorkoutUpdate(id);
  res.json(await getWorkoutDto(id, req.user!.id));
});

// DELETE /api/workouts/:id  - organizer or admin
workoutsRouter.delete('/:id', requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await assertCanEdit(id, req.user!);

  await prisma.workout.delete({ where: { id } });
  emit('workout:deleted', { id });
  res.status(204).end();
});

// POST /api/workouts/:id/register
workoutsRouter.post('/:id/register', requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const userId = req.user!.id;

  try {
    await prisma.$transaction(async (tx) => {
      // Lock the workout row so two people can't take the last spot at the same moment.
      // Other registrations for this workout wait here until this transaction finishes.
      const rows = await tx.$queryRaw<{ maxParticipants: number; startTime: Date; organizerBlocked: boolean }[]>`
        SELECT w."maxParticipants", w."startTime", u."isBlocked" AS "organizerBlocked"
        FROM "Workout" w JOIN "User" u ON u.id = w."creatorId"
        WHERE w.id = ${id}
        FOR UPDATE OF w`;
      const workout = rows[0];
      if (!workout) throw notFound('Workout');
      if (workout.organizerBlocked) {
        throw new HttpError(400, 'This workout is no longer available', 'WORKOUT_UNAVAILABLE');
      }
      if (workout.startTime.getTime() < Date.now()) {
        throw new HttpError(400, 'This workout already started', 'WORKOUT_STARTED');
      }

      const registered = await tx.registration.count({ where: { workoutId: id } });
      if (registered >= workout.maxParticipants) {
        throw new HttpError(409, 'This workout is full', 'WORKOUT_FULL');
      }

      await tx.registration.create({ data: { userId, workoutId: id } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'You are already registered to this workout', 'ALREADY_REGISTERED');
    }
    throw err;
  }

  await broadcastWorkoutUpdate(id);
  res.status(201).json(await getWorkoutDto(id, userId));
});

// DELETE /api/workouts/:id/register  - cancel my registration
workoutsRouter.delete('/:id/register', requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const userId = req.user!.id;

  const workout = await prisma.workout.findUnique({ where: { id }, select: { creatorId: true } });
  if (!workout) throw notFound('Workout');
  if (workout.creatorId === userId) {
    throw new HttpError(400, 'The organizer cannot leave. Delete the workout instead.', 'ORGANIZER_CANNOT_LEAVE');
  }

  const { count } = await prisma.registration.deleteMany({ where: { workoutId: id, userId } });
  if (count === 0) throw new HttpError(404, 'You are not registered to this workout', 'NOT_REGISTERED');

  await broadcastWorkoutUpdate(id);
  res.json(await getWorkoutDto(id, userId));
});
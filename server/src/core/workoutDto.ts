import type { Prisma } from '../generated/prisma/client.js';

/** What to load from the DB for every workout we send to the client. */
export function workoutInclude(viewerId?: string) {
  return {
    creator: { select: { id: true, name: true } },
    _count: { select: { registrations: true } },
    // Only the viewer's own registration (0 or 1 rows) - used for isRegistered
    registrations: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
  } satisfies Prisma.WorkoutInclude;
}

type WorkoutWithRelations = Prisma.WorkoutGetPayload<{ include: ReturnType<typeof workoutInclude> }>;

/** The shape of a workout in every API response and socket event. */
export function toWorkoutDto(w: WorkoutWithRelations, viewerId?: string) {
  const participants = w._count.registrations;
  return {
    id: w.id,
    title: w.title,
    description: w.description,
    category: w.category,
    level: w.level,
    location: w.location,
    lat: w.lat,
    lng: w.lng,
    wazeUrl: w.wazeUrl,
    startTime: w.startTime.toISOString(),
    maxParticipants: w.maxParticipants,
    cost: w.cost,
    participants,
    spotsLeft: Math.max(0, w.maxParticipants - participants),
    isFull: participants >= w.maxParticipants,
    organizer: w.creator,
    createdAt: w.createdAt.toISOString(),
    // Per-viewer fields: only present when the request was authenticated.
    // Socket broadcasts go to everyone, so they never include these.
    ...(viewerId !== undefined && {
      isOrganizer: w.creatorId === viewerId,
      isRegistered: Array.isArray(w.registrations) && w.registrations.length > 0,
    }),
  };
}

export type WorkoutDto = ReturnType<typeof toWorkoutDto>;

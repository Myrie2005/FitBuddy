import { z } from 'zod';
import { config } from '../config/all.js';
import { Category, Level } from '../generated/prisma/enums.js';

const limits = config.workout;

const workoutFields = {
  title: z
    .string()
    .trim()
    .min(limits.titleMinLength, `Title must be at least ${limits.titleMinLength} characters`)
    .max(limits.titleMaxLength),
  description: z.string().trim().max(limits.descriptionMaxLength).optional(),
  category: z.enum(Category),
  level: z.enum(Level).default('ALL'),
  location: z.string().trim().min(2, 'Location is required').max(limits.locationMaxLength),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  wazeUrl: z.url().max(500).optional(),
  /** ISO date-time, e.g. "2026-11-20T19:00:00.000Z" */
  startTime: z.coerce.date().refine((d) => d.getTime() > Date.now(), 'Workout must start in the future'),
  maxParticipants: z.number().int().min(limits.minParticipants).max(limits.maxParticipants),
  /** Price in shekels, 0 = free */
  cost: z.number().int().min(0).max(limits.maxCost).default(0),
};

export const createWorkoutSchema = z.object(workoutFields);

export const updateWorkoutSchema = z
  .object(workoutFields)
  .omit({ level: true, cost: true, wazeUrl: true, description: true, lat: true, lng: true })
  .extend({
    level: z.enum(Level),
    cost: z.number().int().min(0).max(limits.maxCost),
    // Optional fields can be cleared by sending null
    wazeUrl: workoutFields.wazeUrl.unwrap().nullable(),
    description: workoutFields.description.unwrap().nullable(),
    lat: workoutFields.lat.unwrap().nullable(),
    lng: workoutFields.lng.unwrap().nullable(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

export const listWorkoutsQuery = z
  .object({
    category: z.enum(Category).optional(),
    level: z.enum(Level).optional(),
    /** Free-text search on title and location */
    q: z.string().trim().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    /** Past workouts are hidden unless includePast=true */
    includePast: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    limit: z.coerce.number().int().min(1).max(config.listLimit.max).default(config.listLimit.default),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '`from` must be before `to`', path: ['to'] });

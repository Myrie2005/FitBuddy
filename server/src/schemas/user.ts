import { z } from 'zod';
import { Category, Level, Role } from '../generated/prisma/enums.js';

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(50),
    area: z.string().trim().max(60).nullable(),
    level: z.enum(Level).nullable(),
    bio: z.string().trim().max(300).nullable(),
    preferredCategory: z.enum(Category).nullable(),
    preferredTime: z.string().trim().max(50).nullable(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

export const adminUpdateUserSchema = z
  .object({
    role: z.enum(Role),
    isBlocked: z.boolean(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

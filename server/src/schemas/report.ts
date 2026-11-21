import { z } from 'zod';
import { ReportStatus } from '../generated/prisma/enums.js';

export const createReportSchema = z
  .object({
    reason: z.string().trim().min(5, 'Please describe the problem').max(500),
    workoutId: z.uuid().optional(),
    reportedUserId: z.uuid().optional(),
  })
  .refine((o) => o.workoutId || o.reportedUserId, 'Report a workout or a user');

export const updateReportSchema = z.object({ status: z.enum(ReportStatus) });

export const listReportsQuery = z.object({ status: z.enum(ReportStatus).optional() });

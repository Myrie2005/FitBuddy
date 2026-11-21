import { Router } from 'express';
import { HttpError, notFound } from '../core/errors.js';
import { prisma } from '../core/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createReportSchema } from '../schemas/report.js';

export const reportsRouter = Router();

// POST /api/reports  { reason, workoutId?, reportedUserId? }
reportsRouter.post('/', requireAuth, async (req, res) => {
  const data = createReportSchema.parse(req.body);
  const reporterId = req.user!.id;

  if (data.reportedUserId === reporterId) {
    throw new HttpError(400, 'You cannot report yourself', 'CANNOT_REPORT_SELF');
  }

  if (data.workoutId && !(await prisma.workout.count({ where: { id: data.workoutId } }))) {
    throw notFound('Workout');
  }
  if (data.reportedUserId && !(await prisma.user.count({ where: { id: data.reportedUserId } }))) {
    throw notFound('User');
  }

  // One open report per reporter and target is enough
  const alreadyOpen = await prisma.report.count({
    where: {
      reporterId,
      status: 'OPEN',
      workoutId: data.workoutId ?? null,
      reportedUserId: data.reportedUserId ?? null,
    },
  });
  if (alreadyOpen) {
    throw new HttpError(409, 'You already reported this and it is still being handled', 'ALREADY_REPORTED');
  }

  const report = await prisma.report.create({ data: { ...data, reporterId } });
  res.status(201).json(report);
});

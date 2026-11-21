import { Router } from 'express';
import { HttpError } from '../core/errors.js';
import { prisma } from '../core/prisma.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { idParam } from '../schemas/common.js';
import { listReportsQuery, updateReportSchema } from '../schemas/report.js';
import { adminUpdateUserSchema } from '../schemas/user.js';

export const adminRouter = Router();

// Every route below requires an admin
adminRouter.use(requireAuth, requireAdmin);

// GET /api/admin/users
adminRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBlocked: true,
      createdAt: true,
      _count: { select: { createdWorkouts: true, reportsAgainst: true } },
    },
  });
  res.json(users);
});

// PATCH /api/admin/users/:id  { role?, isBlocked? }
adminRouter.patch('/users/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = adminUpdateUserSchema.parse(req.body);
  if (id === req.user!.id) throw new HttpError(400, 'You cannot change your own role or block yourself');

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isBlocked: true },
  });
  res.json(user);
});

// GET /api/admin/reports?status=OPEN
adminRouter.get('/reports', async (req, res) => {
  const { status } = listReportsQuery.parse(req.query);
  const reports = await prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, name: true } },
      reportedUser: { select: { id: true, name: true } },
      workout: { select: { id: true, title: true } },
    },
  });
  res.json(reports);
});

// PATCH /api/admin/reports/:id  { status }
adminRouter.patch('/reports/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { status } = updateReportSchema.parse(req.body);
  res.json(await prisma.report.update({ where: { id }, data: { status } }));
});

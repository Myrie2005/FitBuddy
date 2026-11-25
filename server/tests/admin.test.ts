import { beforeEach, describe, expect, it } from 'vitest';
import {
  api,
  prisma,
  createUser,
  createWorkout,
  resetDb,
  validWorkout,
  type TestUser,
} from './helpers.js';

let admin: TestUser;
let user: TestUser;

beforeEach(async () => {
  await resetDb();
  admin = await createUser({ role: 'ADMIN' });
  user = await createUser();
});

describe('access', () => {
  it('every admin route is closed to regular users and anonymous requests', async () => {
    for (const path of ['/api/admin/users', '/api/admin/reports']) {
      expect((await api().get(path)).status).toBe(401);
      expect((await api().get(path).set(user.auth)).status).toBe(403);
      expect((await api().get(path).set(admin.auth)).status).toBe(200);
    }
  });
});

describe('users', () => {
  it('lists users without password hashes', async () => {
    const res = await api()
      .get('/api/admin/users')
      .set(admin.auth);

    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });

  it('blocks and unblocks a user, and promotes to admin', async () => {
    const blocked = await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(admin.auth)
      .send({ isBlocked: true });

    expect(blocked.body.isBlocked).toBe(true);

    expect(
      (await api().get('/api/users/me').set(user.auth)).status
    ).toBe(403);

    await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(admin.auth)
      .send({ isBlocked: false });

    expect(
      (await api().get('/api/users/me').set(user.auth)).status
    ).toBe(200);

    const promoted = await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(admin.auth)
      .send({ role: 'ADMIN' });

    expect(promoted.body.role).toBe('ADMIN');

    expect(
      (await api().get('/api/admin/users').set(user.auth)).status
    ).toBe(200);
  });

  it('cannot change your own account', async () => {
    const res = await api()
      .patch(`/api/admin/users/${admin.id}`)
      .set(admin.auth)
      .send({ role: 'USER' });

    expect(res.status).toBe(400);
  });

  it('404 for a missing user', async () => {
    const res = await api()
      .patch('/api/admin/users/01a1fdc3-0000-7000-8000-000000000000')
      .set(admin.auth)
      .send({ isBlocked: true });

    expect(res.status).toBe(404);
  });
});

describe('trainer permissions', () => {
  it('lists trainer permissions for all users', async () => {
    const trainer = await createUser({
      isTrainer: true,
    });

    const res = await api()
      .get('/api/admin/users')
      .set(admin.auth);

    expect(res.status).toBe(200);

    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: user.id,
          isTrainer: false,
        }),
        expect.objectContaining({
          id: trainer.id,
          isTrainer: true,
        }),
      ])
    );
  });

  it('allows an admin to approve a trainer', async () => {
    const res = await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(admin.auth)
      .send({ isTrainer: true });

    expect(res.status).toBe(200);
    expect(res.body.isTrainer).toBe(true);
    expect(res.body.role).toBe('USER');

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(updatedUser.isTrainer).toBe(true);
  });

  it('allows an admin to revoke trainer permissions', async () => {
    const trainer = await createUser({
      isTrainer: true,
    });

    const res = await api()
      .patch(`/api/admin/users/${trainer.id}`)
      .set(admin.auth)
      .send({ isTrainer: false });

    expect(res.status).toBe(200);
    expect(res.body.isTrainer).toBe(false);

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: trainer.id },
    });

    expect(updatedUser.isTrainer).toBe(false);
  });

  it('rejects trainer permission changes by non-admin users', async () => {
    const trainer = await createUser({
      isTrainer: true,
    });

    const anonymous = await api()
      .patch(`/api/admin/users/${user.id}`)
      .send({ isTrainer: true });

    expect(anonymous.status).toBe(401);

    const regularUser = await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(user.auth)
      .send({ isTrainer: true });

    expect(regularUser.status).toBe(403);

    const trainerRequest = await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(trainer.auth)
      .send({ isTrainer: true });

    expect(trainerRequest.status).toBe(403);

    const unchangedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(unchangedUser.isTrainer).toBe(false);
  });

  it('rejects invalid trainer permission values', async () => {
    const res = await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(admin.auth)
      .send({ isTrainer: 'true' });

    expect(res.status).toBe(400);
  });

  it('applies trainer permission changes immediately without a new token', async () => {
    const beforeApproval = await api()
      .post('/api/workouts')
      .set(user.auth)
      .send(validWorkout());

    expect(beforeApproval.status).toBe(403);

    const approved = await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(admin.auth)
      .send({ isTrainer: true });

    expect(approved.status).toBe(200);

    const afterApproval = await api()
      .post('/api/workouts')
      .set(user.auth)
      .send(validWorkout());

    expect(afterApproval.status).toBe(201);

    const revoked = await api()
      .patch(`/api/admin/users/${user.id}`)
      .set(admin.auth)
      .send({ isTrainer: false });

    expect(revoked.status).toBe(200);

    const afterRevocation = await api()
      .post('/api/workouts')
      .set(user.auth)
      .send(validWorkout());

    expect(afterRevocation.status).toBe(403);
  });
});

describe('reports', () => {
  it('lists open reports with names and resolves them', async () => {
    const trainer = await createUser({
      isTrainer: true,
    });

    const w = await createWorkout(trainer, {
      title: 'אימון חשוד',
    });

    const reporter = await createUser({
      name: 'המדווח',
    });

    await api()
      .post('/api/reports')
      .set(reporter.auth)
      .send({
        reason: 'ספאם ספאם',
        workoutId: w.id,
      });

    const open = await api()
      .get('/api/admin/reports?status=OPEN')
      .set(admin.auth);

    expect(open.body).toHaveLength(1);

    expect(open.body[0]).toMatchObject({
      reporter: { name: 'המדווח' },
      workout: { title: 'אימון חשוד' },
    });

    const resolved = await api()
      .patch(`/api/admin/reports/${open.body[0].id}`)
      .set(admin.auth)
      .send({ status: 'RESOLVED' });

    expect(resolved.body.status).toBe('RESOLVED');

    expect(
      (await api()
        .get('/api/admin/reports?status=OPEN')
        .set(admin.auth)).body
    ).toHaveLength(0);
  });

  it('rejects an invalid status', async () => {
    expect(
      (await api()
        .get('/api/admin/reports?status=MAYBE')
        .set(admin.auth)).status
    ).toBe(400);
  });
});
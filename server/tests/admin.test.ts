import { beforeEach, describe, expect, it } from 'vitest';
import { api, createUser, createWorkout, resetDb, type TestUser } from './helpers.js';

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
    const res = await api().get('/api/admin/users').set(admin.auth);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });

  it('blocks and unblocks a user, and promotes to admin', async () => {
    const blocked = await api().patch(`/api/admin/users/${user.id}`).set(admin.auth).send({ isBlocked: true });
    expect(blocked.body.isBlocked).toBe(true);
    expect((await api().get('/api/users/me').set(user.auth)).status).toBe(403);

    await api().patch(`/api/admin/users/${user.id}`).set(admin.auth).send({ isBlocked: false });
    expect((await api().get('/api/users/me').set(user.auth)).status).toBe(200);

    const promoted = await api().patch(`/api/admin/users/${user.id}`).set(admin.auth).send({ role: 'ADMIN' });
    expect(promoted.body.role).toBe('ADMIN');
    expect((await api().get('/api/admin/users').set(user.auth)).status).toBe(200); // takes effect immediately
  });

  it('cannot change your own account', async () => {
    const res = await api().patch(`/api/admin/users/${admin.id}`).set(admin.auth).send({ role: 'USER' });
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

describe('reports', () => {
  it('lists open reports with names and resolves them', async () => {
    const w = await createWorkout(user, { title: 'אימון חשוד' });
    const reporter = await createUser({ name: 'המדווח' });
    await api().post('/api/reports').set(reporter.auth).send({ reason: 'ספאם ספאם', workoutId: w.id });

    const open = await api().get('/api/admin/reports?status=OPEN').set(admin.auth);
    expect(open.body).toHaveLength(1);
    expect(open.body[0]).toMatchObject({ reporter: { name: 'המדווח' }, workout: { title: 'אימון חשוד' } });

    const resolved = await api().patch(`/api/admin/reports/${open.body[0].id}`).set(admin.auth).send({ status: 'RESOLVED' });
    expect(resolved.body.status).toBe('RESOLVED');
    expect((await api().get('/api/admin/reports?status=OPEN').set(admin.auth)).body).toHaveLength(0);
  });

  it('rejects an invalid status', async () => {
    expect((await api().get('/api/admin/reports?status=MAYBE').set(admin.auth)).status).toBe(400);
  });
});

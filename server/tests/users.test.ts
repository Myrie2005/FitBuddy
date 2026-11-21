import { beforeEach, describe, expect, it } from 'vitest';
import { signToken } from '../src/middleware/auth.js';
import { api, createUser, createWorkout, prisma, resetDb, type TestUser } from './helpers.js';

let user: TestUser;
let other: TestUser;

beforeEach(async () => {
  await resetDb();
  user = await createUser({ name: 'מירי' });
  other = await createUser({ name: 'שרה' });
});

describe('authentication', () => {
  it('rejects a missing, malformed or expired token', async () => {
    expect((await api().get('/api/users/me')).status).toBe(401);
    expect((await api().get('/api/users/me').set('Authorization', 'Bearer junk')).body.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token of a user that was deleted', async () => {
    const token = signToken(user.id);
    await prisma.user.delete({ where: { id: user.id } });
    const res = await api().get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('blocks a blocked user from every protected route', async () => {
    await prisma.user.update({ where: { id: user.id }, data: { isBlocked: true } });
    const res = await api().get('/api/users/me').set(user.auth);
    expect(res.status).toBe(403);
  });
});

describe('/api/users/me', () => {
  it('returns my profile without the password hash', async () => {
    const res = await api().get('/api/users/me').set(user.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, name: 'מירי', email: user.email, role: 'USER' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('updates profile fields including preferences, and clears them with null', async () => {
    const set = await api()
      .patch('/api/users/me')
      .set(user.auth)
      .send({ area: 'ירושלים', level: 'ADVANCED', preferredCategory: 'YOGA', preferredTime: 'ערב', bio: 'שלום' });
    expect(set.status).toBe(200);
    expect(set.body).toMatchObject({ area: 'ירושלים', preferredCategory: 'YOGA', preferredTime: 'ערב' });

    const cleared = await api().patch('/api/users/me').set(user.auth).send({ preferredCategory: null });
    expect(cleared.body.preferredCategory).toBeNull();
  });

  it('validates the profile', async () => {
    expect((await api().patch('/api/users/me').set(user.auth).send({})).status).toBe(400);
    expect((await api().patch('/api/users/me').set(user.auth).send({ preferredCategory: 'SWIM' })).status).toBe(400);
    expect((await api().patch('/api/users/me').set(user.auth).send({ name: 'א' })).status).toBe(400);
  });

  it('cannot change role through the profile', async () => {
    await api().patch('/api/users/me').set(user.auth).send({ name: 'מירי', role: 'ADMIN' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('USER');
  });

  it('lists workouts I organize and workouts I joined separately', async () => {
    await createWorkout(user, { title: 'שלי' });
    const theirs = await createWorkout(other, { title: 'של שרה' });
    await api().post(`/api/workouts/${theirs.id}/register`).set(user.auth);

    const res = await api().get('/api/users/me/workouts').set(user.auth);
    expect(res.body.organized.map((w: { title: string }) => w.title)).toEqual(['שלי']);
    expect(res.body.joined.map((w: { title: string }) => w.title)).toEqual(['של שרה']);
  });
});

describe('GET /api/users/:id', () => {
  it('returns a public profile without email', async () => {
    await createWorkout(user);
    const res = await api().get(`/api/users/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'מירי', workoutsOrganized: 1, workoutsJoined: 1 });
    expect(res.body).not.toHaveProperty('email');
  });

  it('404 for a missing user', async () => {
    expect((await api().get('/api/users/01a1fdc3-0000-7000-8000-000000000000')).status).toBe(404);
  });
});

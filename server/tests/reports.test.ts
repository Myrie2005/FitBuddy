import { beforeEach, describe, expect, it } from 'vitest';
import { api, createUser, createWorkout, resetDb, type TestUser } from './helpers.js';

let reporter: TestUser;
let organizer: TestUser;

beforeEach(async () => {
  await resetDb();
  reporter = await createUser();
  organizer = await createUser();
});

describe('POST /api/reports', () => {
  it('reports a workout and a user', async () => {
    const w = await createWorkout(organizer);
    const res = await api()
      .post('/api/reports')
      .set(reporter.auth)
      .send({ reason: 'האימון לא התקיים', workoutId: w.id, reportedUserId: organizer.id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'OPEN', reporterId: reporter.id, workoutId: w.id });
  });

  it('requires a token, a reason and a target', async () => {
    expect((await api().post('/api/reports').send({ reason: 'ספאם ספאם' })).status).toBe(401);
    expect((await api().post('/api/reports').set(reporter.auth).send({ reason: 'ספאם ספאם' })).status).toBe(400);
    const w = await createWorkout(organizer);
    expect((await api().post('/api/reports').set(reporter.auth).send({ reason: 'x', workoutId: w.id })).status).toBe(400);
  });

  it('404 when the reported workout or user does not exist', async () => {
    const missing = '01a1fdc3-0000-7000-8000-000000000000';
    expect((await api().post('/api/reports').set(reporter.auth).send({ reason: 'ספאם ספאם', workoutId: missing })).status).toBe(404);
    expect((await api().post('/api/reports').set(reporter.auth).send({ reason: 'ספאם ספאם', reportedUserId: missing })).status).toBe(404);
  });

  it('cannot report yourself', async () => {
    const res = await api().post('/api/reports').set(reporter.auth).send({ reason: 'בדיקה עצמית', reportedUserId: reporter.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CANNOT_REPORT_SELF');
  });

  it('cannot send the same report twice while it is open', async () => {
    const w = await createWorkout(organizer);
    const body = { reason: 'ספאם ספאם', workoutId: w.id };
    expect((await api().post('/api/reports').set(reporter.auth).send(body)).status).toBe(201);
    const again = await api().post('/api/reports').set(reporter.auth).send(body);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ALREADY_REPORTED');

    // someone else can still report the same workout
    const third = await createUser();
    expect((await api().post('/api/reports').set(third.auth).send(body)).status).toBe(201);
  });
});

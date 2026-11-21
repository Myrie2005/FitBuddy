import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initSocket } from '../src/core/socket.js';
import {
  api,
  app,
  createUser,
  createWorkout,
  inHours,
  prisma,
  resetDb,
  validWorkout,
  type TestUser,
} from './helpers.js';

const MISSING_ID = '01a1fdc3-0000-7000-8000-000000000000';

let organizer: TestUser;
let member: TestUser;
let admin: TestUser;

beforeEach(async () => {
  await resetDb();
  organizer = await createUser({ name: 'Organizer' });
  member = await createUser({ name: 'Member' });
  admin = await createUser({ name: 'Admin', role: 'ADMIN' });
});

describe('GET /api/workouts', () => {
  it('is public and lists upcoming workouts sorted by start time', async () => {
    await createWorkout(organizer, { title: 'מחרתיים', startTime: inHours(48) });
    await createWorkout(organizer, { title: 'מחר', startTime: inHours(24) });

    const res = await api().get('/api/workouts');
    expect(res.status).toBe(200);
    expect(res.body.map((w: { title: string }) => w.title)).toEqual(['מחר', 'מחרתיים']);
    expect(res.body[0]).not.toHaveProperty('isRegistered'); // anonymous request
  });

  it('adds isRegistered / isOrganizer when a token is sent', async () => {
    await createWorkout(organizer);
    const res = await api().get('/api/workouts').set(organizer.auth);
    expect(res.body[0]).toMatchObject({ isOrganizer: true, isRegistered: true });
  });

  it('filters by category and searches Hebrew text in title and location', async () => {
    await createWorkout(organizer, { title: 'יוגה בפארק', category: 'YOGA', location: 'פארק הירקון' });
    await createWorkout(organizer, { title: 'ריצה', category: 'RUNNING' });

    const byCategory = await api().get('/api/workouts?category=YOGA');
    expect(byCategory.body).toHaveLength(1);

    const bySearch = await api().get(`/api/workouts?q=${encodeURIComponent('ירקון')}`);
    expect(bySearch.body).toHaveLength(1);
    expect(bySearch.body[0].title).toBe('יוגה בפארק');
  });

  it('hides past workouts unless includePast=true', async () => {
    await prisma.workout.create({
      data: { ...validWorkout(), category: 'RUNNING', startTime: new Date(Date.now() - 3600_000), creatorId: organizer.id },
    });
    expect((await api().get('/api/workouts')).body).toHaveLength(0);
    expect((await api().get('/api/workouts?includePast=true')).body).toHaveLength(1);
  });

  it('hides workouts of blocked organizers', async () => {
    await createWorkout(organizer);
    await prisma.user.update({ where: { id: organizer.id }, data: { isBlocked: true } });
    expect((await api().get('/api/workouts')).body).toHaveLength(0);
  });

  it('rejects invalid filters', async () => {
    expect((await api().get('/api/workouts?category=SWIMMING')).status).toBe(400);
    const res = await api().get('/api/workouts?from=2027-01-01&to=2026-01-01');
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('to');
  });
});

describe('GET /api/workouts/:id', () => {
  it('returns one workout', async () => {
    const w = await createWorkout(organizer);
    const res = await api().get(`/api/workouts/${w.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: w.id, participants: 1, organizer: { id: organizer.id } });
  });

  it('400 for an invalid id, 404 for a missing one', async () => {
    expect((await api().get('/api/workouts/abc')).status).toBe(400);
    expect((await api().get(`/api/workouts/${MISSING_ID}`)).status).toBe(404);
  });

  it('lists participants in join order', async () => {
    const w = await createWorkout(organizer);
    await api().post(`/api/workouts/${w.id}/register`).set(member.auth);
    const res = await api().get(`/api/workouts/${w.id}/participants`);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Organizer', 'Member']);
  });
});

describe('POST /api/workouts', () => {
  it('requires a token', async () => {
    const res = await api().post('/api/workouts').send(validWorkout());
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('creates a workout with defaults and registers the organizer', async () => {
    const res = await api().post('/api/workouts').set(organizer.auth).send(validWorkout());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      level: 'ALL',
      cost: 0,
      wazeUrl: null,
      participants: 1,
      spotsLeft: 4,
      isOrganizer: true,
      isRegistered: true,
    });
  });

  it('accepts all optional fields', async () => {
    const res = await api()
      .post('/api/workouts')
      .set(organizer.auth)
      .send(
        validWorkout({
          category: 'TENNIS',
          level: 'BEGINNER',
          cost: 30,
          wazeUrl: 'https://waze.com/ul?q=test',
          lat: 31.78,
          lng: 35.2,
          description: 'להביא מחבט',
          maxParticipants: 50,
        }),
      );
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ cost: 30, wazeUrl: 'https://waze.com/ul?q=test', maxParticipants: 50 });
  });

  it('validates every field', async () => {
    const res = await api()
      .post('/api/workouts')
      .set(organizer.auth)
      .send({
        title: 'א',
        category: 'SWIMMING',
        location: '',
        startTime: '2020-01-01',
        maxParticipants: 51,
        cost: -1,
        wazeUrl: 'not a url',
      });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(
      expect.arrayContaining(['title', 'category', 'location', 'startTime', 'maxParticipants', 'cost', 'wazeUrl']),
    );
  });

  it('rejects a body that is not JSON', async () => {
    const res = await api().post('/api/workouts').set(organizer.auth).set('Content-Type', 'text/plain').send('hi');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/workouts/:id', () => {
  it('lets the organizer edit and keeps fields that were not sent', async () => {
    const w = await createWorkout(organizer, { cost: 20 });
    const res = await api().patch(`/api/workouts/${w.id}`).set(organizer.auth).send({ title: 'כותרת חדשה' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'כותרת חדשה', cost: 20 });
  });

  it('clears optional fields with null', async () => {
    const w = await createWorkout(organizer, {
      description: 'תיאור',
      lat: 31.7,
      lng: 35.2,
      wazeUrl: 'https://waze.com/ul?q=x',
    });
    const res = await api()
      .patch(`/api/workouts/${w.id}`)
      .set(organizer.auth)
      .send({ description: null, lat: null, lng: null, wazeUrl: null });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ description: null, lat: null, lng: null, wazeUrl: null });
  });

  it('allows admins but not other users', async () => {
    const w = await createWorkout(organizer);
    expect((await api().patch(`/api/workouts/${w.id}`).set(member.auth).send({ title: 'שלי' })).status).toBe(403);
    expect((await api().patch(`/api/workouts/${w.id}`).set(admin.auth).send({ title: 'אדמין' })).status).toBe(200);
  });

  it('cannot lower maxParticipants below the number registered', async () => {
    const w = await createWorkout(organizer, { maxParticipants: 5 });
    await api().post(`/api/workouts/${w.id}/register`).set(member.auth);
    await api().post(`/api/workouts/${w.id}/register`).set(admin.auth);
    const res = await api().patch(`/api/workouts/${w.id}`).set(organizer.auth).send({ maxParticipants: 2 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MAX_BELOW_REGISTERED');
  });

  it('rejects an empty update and moving the workout to the past', async () => {
    const w = await createWorkout(organizer);
    expect((await api().patch(`/api/workouts/${w.id}`).set(organizer.auth).send({})).status).toBe(400);
    const past = await api().patch(`/api/workouts/${w.id}`).set(organizer.auth).send({ startTime: inHours(-1) });
    expect(past.status).toBe(400);
  });
});

describe('DELETE /api/workouts/:id', () => {
  it('organizer and admin can delete, others cannot', async () => {
    const w1 = await createWorkout(organizer);
    const w2 = await createWorkout(organizer);
    expect((await api().delete(`/api/workouts/${w1.id}`).set(member.auth)).status).toBe(403);
    expect((await api().delete(`/api/workouts/${w1.id}`).set(organizer.auth)).status).toBe(204);
    expect((await api().delete(`/api/workouts/${w2.id}`).set(admin.auth)).status).toBe(204);
    expect((await api().get(`/api/workouts/${w1.id}`)).status).toBe(404);
  });
});

describe('registration', () => {
  it('join and leave', async () => {
    const w = await createWorkout(organizer);

    const join = await api().post(`/api/workouts/${w.id}/register`).set(member.auth);
    expect(join.status).toBe(201);
    expect(join.body).toMatchObject({ participants: 2, isRegistered: true });

    const leave = await api().delete(`/api/workouts/${w.id}/register`).set(member.auth);
    expect(leave.status).toBe(200);
    expect(leave.body).toMatchObject({ participants: 1, isRegistered: false });
  });

  it('cannot join twice', async () => {
    const w = await createWorkout(organizer);
    await api().post(`/api/workouts/${w.id}/register`).set(member.auth);
    const res = await api().post(`/api/workouts/${w.id}/register`).set(member.auth);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_REGISTERED');
  });

  it('cannot join a full workout', async () => {
    const w = await createWorkout(organizer, { maxParticipants: 2 });
    await api().post(`/api/workouts/${w.id}/register`).set(member.auth);
    const res = await api().post(`/api/workouts/${w.id}/register`).set(admin.auth);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('WORKOUT_FULL');
  });

  it('only one person gets the last spot when several join at the same moment', async () => {
    const w = await createWorkout(organizer, { maxParticipants: 2 }); // organizer + 1 spot
    const racers = await Promise.all([1, 2, 3, 4, 5].map(() => createUser()));

    const results = await Promise.all(racers.map((u) => api().post(`/api/workouts/${w.id}/register`).set(u.auth)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.body.code === 'WORKOUT_FULL')).toHaveLength(4);
    expect(await prisma.registration.count({ where: { workoutId: w.id } })).toBe(2);
  });

  it('cannot join a workout that already started', async () => {
    const past = await prisma.workout.create({
      data: { ...validWorkout(), category: 'RUNNING', startTime: new Date(Date.now() - 60_000), creatorId: organizer.id },
    });
    const res = await api().post(`/api/workouts/${past.id}/register`).set(member.auth);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WORKOUT_STARTED');
  });

  it('cannot join a workout whose organizer is blocked', async () => {
    const w = await createWorkout(organizer);
    await prisma.user.update({ where: { id: organizer.id }, data: { isBlocked: true } });
    const res = await api().post(`/api/workouts/${w.id}/register`).set(member.auth);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WORKOUT_UNAVAILABLE');
  });

  it('the organizer cannot leave, and leaving when not registered → 404', async () => {
    const w = await createWorkout(organizer);
    const own = await api().delete(`/api/workouts/${w.id}/register`).set(organizer.auth);
    expect(own.body.code).toBe('ORGANIZER_CANNOT_LEAVE');
    const notIn = await api().delete(`/api/workouts/${w.id}/register`).set(member.auth);
    expect(notIn.status).toBe(404);
    expect(notIn.body.code).toBe('NOT_REGISTERED');
  });
});

describe('live updates (Socket.IO)', () => {
  let server: Server;
  let client: Socket;

  beforeAll(async () => {
    server = createServer(app);
    initSocket(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    client = connect(`http://localhost:${port}`, { transports: ['websocket'] });
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));
  });

  afterAll(async () => {
    client.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const nextEvent = <T>(name: string) => new Promise<T>((resolve) => client.once(name, resolve));

  it('broadcasts created, updated and deleted workouts', async () => {
    const created = nextEvent<{ id: string; participants: number }>('workout:created');
    const w = await createWorkout(organizer);
    expect((await created).id).toBe(w.id);

    const updated = nextEvent<{ id: string; participants: number; isRegistered?: boolean }>('workout:updated');
    await api().post(`/api/workouts/${w.id}/register`).set(member.auth);
    const event = await updated;
    expect(event).toMatchObject({ id: w.id, participants: 2 });
    expect(event).not.toHaveProperty('isRegistered'); // broadcasts have no per-viewer fields

    const deleted = nextEvent<{ id: string }>('workout:deleted');
    await api().delete(`/api/workouts/${w.id}`).set(organizer.auth);
    expect(await deleted).toEqual({ id: w.id });
  });
});

import { describe, expect, it } from 'vitest';
import { api, createUser, resetDb } from './helpers.js';

describe('app', () => {
  it('health check reports the database as up', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, database: 'up' });
  });

  it('unknown route → 404', async () => {
    const res = await api().get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  describe('request body errors', () => {
    it('malformed JSON → 400 BAD_JSON', async () => {
      await resetDb();
      const user = await createUser();
      const res = await api()
        .post('/api/workouts')
        .set(user.auth)
        .set('Content-Type', 'application/json')
        .send('{not json');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_JSON');
    });

    it('body over the size limit → 413', async () => {
      const res = await api()
        .post('/api/workouts')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ title: 'x'.repeat(200_000) }));
      expect(res.status).toBe(413);
      expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('unsupported charset → 415', async () => {
      const res = await api()
        .post('/api/workouts')
        .set('Content-Type', 'application/json; charset=latin9')
        .send('{}');
      expect(res.status).toBe(415);
    });
  });
});

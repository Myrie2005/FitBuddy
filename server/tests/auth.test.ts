
import { beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { api, prisma, resetDb } from './helpers.js';

const testUser = {
  name: 'Test User',
  email: 'auth-test@example.com',
  password: 'Fit1234!',
};

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/register', () => {
  it('registers a new user successfully', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: testUser.name,
      email: testUser.email,
      role: 'USER',
    });

    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('stores a hashed password instead of plain text', async () => {
    await api().post('/api/auth/register').send(testUser);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: testUser.email },
    });

    expect(user.passwordHash).not.toBe(testUser.password);

    expect(
      await bcrypt.compare(testUser.password, user.passwordHash)
    ).toBe(true);
  });

  it('rejects registration with an existing email', async () => {
    await api().post('/api/auth/register').send(testUser);

    const res = await api()
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });

  it('rejects duplicate emails with different capitalization', async () => {
    await api().post('/api/auth/register').send(testUser);

    const res = await api()
      .post('/api/auth/register')
      .send({
        ...testUser,
        email: testUser.email.toUpperCase(),
      });

    expect(res.status).toBe(409);
  });

  it('rejects passwords that do not meet the requirements', async () => {
    const invalidPasswords = [
      'A1234!',
      'Password1!',
      'Password1234',
    ];

    for (const password of invalidPasswords) {
      const res = await api()
        .post('/api/auth/register')
        .send({ ...testUser, password });

      expect(res.status).toBe(400);
    }
  });

  it('rejects an invalid email', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...testUser, email: 'invalid-email' });

    expect(res.status).toBe(400);
  });

  it('does not allow registration as an admin', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...testUser, role: 'ADMIN' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('USER');

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: testUser.email },
    });

    expect(user.role).toBe('USER');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    const res = await api()
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
  });

  it('logs in successfully and returns a JWT', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects an incorrect password', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'Wrong1234!',
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({
        email: 'unknown@example.com',
        password: testUser.password,
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('allows a registered user to log in more than once', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await api()
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
    }
  });

  it('rejects a blocked user', async () => {
    await prisma.user.update({
      where: { email: testUser.email },
      data: { isBlocked: true },
    });

    const res = await api()
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(403);
  });

  it('allows access to a protected route using the JWT', async () => {
    const login = await api()
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(login.status).toBe(200);

    const res = await api()
      .get('/api/users/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
  });
});

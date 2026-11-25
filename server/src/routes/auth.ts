import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../core/prisma.js';
import { HttpError } from '../core/errors.js';
import { signToken } from '../middleware/auth.js';

export const authRouter = Router();

// Password requirements must also be checked on the server.
const passwordSchema = z.string()
  .min(8, 'Password must contain at least 8 characters')
  .refine(
    (password) => (password.match(/[0-9]/g) || []).length >= 4,
    'Password must contain at least 4 digits'
  )
  .refine(
    (password) => /[^a-zA-Z0-9\u0590-\u05FF\s]/.test(password),
    'Password must contain a special character'
  );

const registerSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const { name, email, password } =
    registerSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new HttpError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;

  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        isTrainer: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTrainer: true,
      },
    });
  } catch (error) {
    // Also handle simultaneous registrations with the same email.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new HttpError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    throw error;
  }

  res.status(201).json({
    message: 'Registration successful',
    user,
  });
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.isBlocked) {
    throw new HttpError(403, 'This account is blocked', 'FORBIDDEN');
  }

  const token = signToken(user.id);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isTrainer: user.isTrainer,
    },
  });
});
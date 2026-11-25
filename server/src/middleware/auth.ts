/**
 * Auth middleware.
 *
 * Contract with the auth module (register / login, owned by Efrat):
 *   - Login returns a JWT signed with JWT_SECRET whose payload is { sub: <user id> }.
 *   - The client sends it on every request: Authorization: Bearer <token>
 *
 * The user's role, trainer permissions and blocked status are read
 * from the database on every request, so permission changes take
 * effect immediately, without a new token.
 */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/all.js';
import { HttpError, forbidden } from '../core/errors.js';
import { prisma } from '../core/prisma.js';
import type { Role } from '../generated/prisma/enums.js';

// Adds req.user to Express's Request type.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        name: string;
        isTrainer: boolean;
      };
    }
  }
}

export function signToken(userId: string) {
  return jwt.sign(
    { sub: userId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

async function loadUserFromRequest(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;

  let userId: string | undefined;

  try {
    const payload = jwt.verify(
      header.slice(7),
      config.jwtSecret
    );

    userId = typeof payload === 'string'
      ? undefined
      : payload.sub;
  } catch {
    throw new HttpError(
      401,
      'Invalid or expired token',
      'INVALID_TOKEN'
    );
  }

  if (!userId) {
    throw new HttpError(
      401,
      'Invalid token',
      'INVALID_TOKEN'
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      name: true,
      isTrainer: true,
      isBlocked: true,
    },
  });

  if (!user) {
    throw new HttpError(
      401,
      'User no longer exists',
      'INVALID_TOKEN'
    );
  }

  if (user.isBlocked) {
    throw forbidden('This account is blocked');
  }

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    isTrainer: user.isTrainer,
  };
}

/** Rejects the request with 401 unless a valid token is sent. Sets req.user. */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const user = await loadUserFromRequest(req);

  if (!user) {
    throw new HttpError(
      401,
      'Authentication required',
      'UNAUTHENTICATED'
    );
  }

  req.user = user;
  next();
}

/** Like requireAuth but lets anonymous requests through. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  req.user = (await loadUserFromRequest(req)) ?? undefined;
  next();
}

/** Use after requireAuth. */
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'ADMIN') {
    throw forbidden('Admins only');
  }

  next();
}

/** Allows approved trainers and admins. Use after requireAuth. */
export function requireTrainer(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (
    !req.user ||
    (req.user.role !== 'ADMIN' && !req.user.isTrainer)
  ) {
    throw forbidden('Approved trainers and admins only');
  }

  next();
}
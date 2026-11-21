import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../core/errors.js';

/**
 * Every error thrown in a route ends up here (Express 5 forwards async errors automatically).
 * Response shape is always: { error: string, code?: string, details?: [...] }
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid input',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already exists', code: 'CONFLICT' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  }

  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON body', code: 'BAD_JSON' });
  }

  // Other errors thrown by Express itself while reading the request
  // (body over the size limit, unsupported charset, ...) carry their own HTTP status.
  if (isClientError(err)) {
    const code = err.status === 413 ? 'PAYLOAD_TOO_LARGE' : err.status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'BAD_REQUEST';
    return res.status(err.status).json({ error: err.message, code });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
}

function isClientError(err: unknown): err is { status: number; message: string } {
  if (typeof err !== 'object' || err === null || !('status' in err)) return false;
  const status = (err as { status: unknown }).status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}`, code: 'NOT_FOUND' });
}

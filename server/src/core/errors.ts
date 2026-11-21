/** Throw this from a route to send a specific HTTP status, e.g. `throw new HttpError(404, 'Workout not found')`. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`, 'NOT_FOUND');
export const forbidden = (message = 'Forbidden') => new HttpError(403, message, 'FORBIDDEN');

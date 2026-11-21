import { z } from 'zod';

/** `:id` in a URL path. All ids are UUID strings. */
export const idParam = z.object({ id: z.uuid() });

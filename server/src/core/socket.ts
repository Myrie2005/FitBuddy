import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { corsOrigin } from '../config/all.js';
import type { WorkoutDto } from './workoutDto.js';

/**
 * Real-time events the server sends to every connected client.
 * The client listens with: socket.on('workout:updated', (workout) => ...)
 */
export interface ServerToClientEvents {
  'workout:created': (workout: WorkoutDto) => void;
  'workout:updated': (workout: WorkoutDto) => void;
  'workout:deleted': (payload: { id: string }) => void;
}

let io: Server<Record<string, never>, ServerToClientEvents> | null = null;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, { cors: { origin: corsOrigin } });
  io.on('connection', (socket) => {
    console.log(`[socket] connected ${socket.id}`);
    socket.on('disconnect', () => console.log(`[socket] disconnected ${socket.id}`));
  });
  return io;
}

export function emit<E extends keyof ServerToClientEvents>(
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) {
  io?.emit(event, ...args);
}

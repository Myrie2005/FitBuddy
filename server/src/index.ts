import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config } from './config/all.js';
import { prisma } from './core/prisma.js';
import { initSocket } from './core/socket.js';

// Fail fast with a clear message if the database can't be reached (wrong DATABASE_URL, no internet, ...)
try {
  await prisma.$queryRaw`SELECT 1`;
} catch (err) {
  console.error('Cannot connect to the database. Check DATABASE_URL in .env.\n', err);
  process.exit(1);
}

const app = createApp();
const httpServer = createServer(app);
const io = initSocket(httpServer);

httpServer.listen(config.port, () => {
  console.log(`FitBuddy server listening on http://localhost:${config.port}`);
});

async function shutdown() {
  await io.close(); // closes Socket.IO connections and the HTTP server
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

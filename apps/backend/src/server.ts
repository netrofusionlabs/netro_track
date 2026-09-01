import http from 'http';
import { app } from './app';
import { initSocketServer } from './shared/config/socket';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const PORT = process.env.PORT || 3000;

// Create HTTP server manually so Socket.IO can share it
const httpServer = http.createServer(app);

let server: http.Server;

(async () => {
  // Log Postgres connection type
  const dbUrl = process.env.DATABASE_URL || '';
  const isPgTunnel = dbUrl.includes(':5433');
  const pgConnectionType = isPgTunnel ? 'TUNNEL (Production DB)' : (dbUrl.includes('.neon.tech') ? 'REMOTE (Neon DB)' : 'LOCAL (Local DB)');
  const maskedDbUrl = dbUrl.replace(/:[^:@]+@/, ':***@');
  logger.info(`Database: Connected to PostgreSQL via ${pgConnectionType} [${maskedDbUrl}]`);

  await initSocketServer(httpServer);

  server = httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV ?? 'development'} mode`);
  });
})();

// Graceful cleanup for ts-node-dev hot-reloading and termination signals
const handleShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Closing HTTP server gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed cleanly.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.once('SIGUSR2', () => handleShutdown('SIGUSR2 (ts-node-dev restart)'));
process.once('SIGINT', () => handleShutdown('SIGINT'));
process.once('SIGTERM', () => handleShutdown('SIGTERM'));

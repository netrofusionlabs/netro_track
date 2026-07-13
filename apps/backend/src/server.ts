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

(async () => {
  await initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV ?? 'development'} mode`);
  });
})();

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        details: err.details
      },
      meta: { timestamp }
    });
    return;
  }

  // Handle database and unexpected system errors
  logger.error(err);

  res.status(500).json({
    success: false,
    message: 'An unexpected internal error occurred',
    error: {
      code: 'INTERNAL_SERVER_ERROR'
    },
    meta: { timestamp }
  });
}

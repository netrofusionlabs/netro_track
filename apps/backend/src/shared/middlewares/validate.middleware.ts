import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.name === 'ZodError') {
        const details = error.errors ? error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        })) : [];
        next(new AppError('VALIDATION_ERROR', 'Request validation failed', 400, details));
        return;
      }
      next(error);
    }
  };
}

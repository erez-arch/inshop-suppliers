import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  code?: string;
  httpStatus?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'שגיאת אימות נתונים',
      details: err.errors,
    });
    return;
  }

  const httpStatus = err.httpStatus ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  if (httpStatus >= 500) {
    console.error('[Server Error]', err);
  }

  res.status(httpStatus).json({
    error: code,
    message: err.message || 'שגיאה פנימית בשרת',
  });
}

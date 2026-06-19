import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import prisma from '../db';

// Idempotency middleware: on matching key+actor+operation, return cached response
export function idempotency(operation: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      next();
      return;
    }

    const actorKey =
      req.user?.id ?? req.session?.userId ?? req.ip ?? 'anonymous';
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body))
      .digest('hex');

    try {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: {
          actorKey_idempotencyKey_operation: {
            actorKey,
            idempotencyKey,
            operation,
          },
        },
      });

      if (existing) {
        if (existing.requestHash !== requestHash) {
          res.status(409).json({
            error: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
            message: 'מפתח הidempotency שימש לבקשה שונה',
          });
          return;
        }
        // Return cached response
        res.status(existing.responseStatus ?? 200).json(
          existing.responseBody ? JSON.parse(existing.responseBody) : null
        );
        return;
      }

      // Store the record before processing; intercept response
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        prisma.idempotencyRecord
          .create({
            data: {
              actorKey,
              idempotencyKey,
              operation,
              requestHash,
              responseStatus: res.statusCode,
              responseBody: JSON.stringify(body),
            },
          })
          .catch((err) => console.error('[Idempotency] Failed to save record:', err));
        return originalJson(body);
      };

      next();
    } catch (err) {
      // Don't block request on idempotency failure
      console.error('[Idempotency] Error:', err);
      next();
    }
  };
}

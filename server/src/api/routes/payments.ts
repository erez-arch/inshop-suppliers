import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { PaymentStatus, LedgerEntryType } from '../../domain/statuses';
import { guardPaymentPost, guardPaymentCancel } from '../../domain/guards';

const router = Router();

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val || undefined;
  if (Array.isArray(val) && val.length > 0) return String(val[0]);
  return undefined;
}

// ─── Supplier ledger ────────────────────────────────────────────────────────

router.get('/ledger/:supplierId', requireAuth, async (req, res, next) => {
  try {
    const supplierId = req.params.supplierId as string;
    const entries = await prisma.supplierLedgerEntry.findMany({
      where: { supplierId },
      orderBy: { occurredAt: 'desc' },
    });
    const balance = entries.reduce((sum, e) => sum + parseFloat(e.amountSigned), 0);
    res.json({ entries, balance: balance.toFixed(2) });
  } catch (err) {
    next(err);
  }
});

// ─── Payments ────────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supplierId = qs(req.query.supplierId);
    const status = qs(req.query.status);
    const payments = await prisma.payment.findMany({
      where: {
        supplierId: supplierId ?? undefined,
        status: status ?? undefined,
      },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        supplier: true,
        allocations: { include: { ledgerEntry: true } },
        documents: { include: { media: true } },
      },
    });
    if (!payment) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'תשלום לא נמצא' });
      return;
    }
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

const CreatePaymentSchema = z.object({
  supplierId: z.string().uuid(),
  expectedAmount: z.string(),
  method: z.enum(['bank_transfer', 'check', 'other']).optional(),
  paymentDate: z.string().optional(),
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = CreatePaymentSchema.parse(req.body);
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const payment = await prisma.payment.create({
      data: {
        reference,
        supplierId: data.supplierId,
        status: PaymentStatus.DRAFT,
        expectedAmount: data.expectedAmount,
        confirmedAmount: '0',
        method: data.method ?? null,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        createdBy: req.user!.id,
      },
    });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
});

// Confirm payment details
router.post('/:id/confirm', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const paymentId = req.params.id as string;
    const ConfirmSchema = z.object({
      confirmedAmount: z.string(),
      method: z.enum(['bank_transfer', 'check', 'other']),
      paymentDate: z.string(),
      externalReference: z.string().optional(),
      version: z.number().int().min(0),
    });
    const { confirmedAmount, method, paymentDate, externalReference, version } =
      ConfirmSchema.parse(req.body);

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'תשלום לא נמצא' });
      return;
    }
    if (payment.version !== version) {
      res.status(409).json({ error: 'VERSION_CONFLICT', message: 'גרסה לא תואמת' });
      return;
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        confirmedAmount,
        method,
        paymentDate: new Date(paymentDate),
        externalReference: externalReference ?? null,
        status: PaymentStatus.READY_TO_POST,
        version: { increment: 1 },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Post payment
router.post('/:id/post', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const paymentId = req.params.id as string;
    const { version } = z.object({ version: z.number().int().min(0) }).parse(req.body);

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'תשלום לא נמצא' });
      return;
    }

    guardPaymentPost(payment.status);

    if (payment.version !== version) {
      res.status(409).json({ error: 'VERSION_CONFLICT', message: 'גרסה לא תואמת' });
      return;
    }

    const idempotencyKey = `payment-post-${payment.id}`;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.supplierLedgerEntry.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        const err = new Error('התשלום כבר פורסם') as Error & {
          httpStatus: number;
          code: string;
        };
        err.httpStatus = 409;
        err.code = 'PAYMENT_ALREADY_POSTED';
        throw err;
      }

      const ledgerEntry = await tx.supplierLedgerEntry.create({
        data: {
          supplierId: payment.supplierId,
          entryType: LedgerEntryType.PAYMENT,
          amountSigned: `-${payment.confirmedAmount}`,
          sourceType: 'payment',
          sourceId: payment.id,
          idempotencyKey,
          occurredAt: payment.paymentDate ?? new Date(),
          createdBy: req.user!.id,
        },
      });

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.POSTED,
          postedLedgerEntryId: ledgerEntry.id,
          postedAt: new Date(),
          postedBy: req.user!.id,
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'user',
          actorId: req.user!.id,
          action: 'PostPayment',
          entityType: 'payment',
          entityId: payment.id,
          beforeData: JSON.stringify({ status: payment.status }),
          afterData: JSON.stringify({ status: PaymentStatus.POSTED }),
        },
      });

      return updated;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Cancel payment
router.post('/:id/cancel', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const paymentId = req.params.id as string;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'תשלום לא נמצא' });
      return;
    }
    guardPaymentCancel(payment.status);
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.CANCELLED, version: { increment: 1 } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

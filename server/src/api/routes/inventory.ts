import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { requireAuth, requireInventoryCounter, requireAdmin } from '../../middleware/auth';
import { startInventoryCount } from '../../application/usecases/StartInventoryCount';
import { completeInventoryCount } from '../../application/usecases/CompleteInventoryCount';
import { CountStatus } from '../../domain/statuses';

const router = Router();

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val || undefined;
  if (Array.isArray(val) && val.length > 0) return String(val[0]);
  return undefined;
}

// ─── Inventory balances ───────────────────────────────────────────────────────

router.get('/balances', requireAuth, async (req, res, next) => {
  try {
    const branchId = qs(req.query.branchId);
    const balances = await prisma.inventoryBalance.findMany({
      where: branchId ? { branchId } : undefined,
      include: { item: true, branch: true },
    });
    res.json(balances);
  } catch (err) {
    next(err);
  }
});

// ─── Inventory counts ────────────────────────────────────────────────────────

router.get('/counts', requireAuth, async (req, res, next) => {
  try {
    const branchId = qs(req.query.branchId);
    const status = qs(req.query.status);
    const counts = await prisma.inventoryCount.findMany({
      where: {
        branchId: branchId ?? undefined,
        status: status ?? undefined,
      },
      include: { branch: true, countedByUser: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

router.get('/counts/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const count = await prisma.inventoryCount.findUnique({
      where: { id },
      include: {
        branch: true,
        countedByUser: true,
        lines: { include: { item: true } },
      },
    });
    if (!count) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'ספירת מלאי לא נמצאה' });
      return;
    }
    res.json(count);
  } catch (err) {
    next(err);
  }
});

// Start inventory count
router.post('/counts', requireAuth, requireInventoryCounter, async (req, res, next) => {
  try {
    const { branchId } = z.object({ branchId: z.string().uuid() }).parse(req.body);
    const count = await startInventoryCount({ branchId, userId: req.user!.id });
    res.status(201).json(count);
  } catch (err) {
    next(err);
  }
});

// Begin counting (ready -> in_progress)
router.post('/counts/:id/begin', requireAuth, requireInventoryCounter, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const count = await prisma.inventoryCount.findUnique({ where: { id } });
    if (!count) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'ספירת מלאי לא נמצאה' });
      return;
    }
    if (count.status !== CountStatus.READY_TO_COUNT) {
      res.status(409).json({ error: 'INVALID_STATE_TRANSITION', message: 'לא ניתן להתחיל' });
      return;
    }
    const updated = await prisma.inventoryCount.update({
      where: { id: count.id },
      data: {
        status: CountStatus.IN_PROGRESS,
        startedAt: new Date(),
        version: { increment: 1 },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Save count line
const SaveLineSchema = z.object({
  countedQty: z.number().int().min(0),
  version: z.number().int().min(0),
});

router.put(
  '/counts/:id/lines/:lineId',
  requireAuth,
  requireInventoryCounter,
  async (req, res, next) => {
    try {
      const countId = req.params.id as string;
      const lineId = req.params.lineId as string;
      const { countedQty, version } = SaveLineSchema.parse(req.body);
      const line = await prisma.inventoryCountLine.findUnique({
        where: { id: lineId },
      });
      if (!line || line.countId !== countId) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'שורה לא נמצאה' });
        return;
      }
      if (line.version !== version) {
        res.status(409).json({ error: 'VERSION_CONFLICT', message: 'גרסה לא תואמת' });
        return;
      }
      const now = new Date();
      const updated = await prisma.inventoryCountLine.update({
        where: { id: line.id },
        data: {
          countedQty,
          saved: true,
          savedAt: now,
          lastChangedAt: now,
          version: { increment: 1 },
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// Complete inventory count
router.post(
  '/counts/:id/complete',
  requireAuth,
  requireInventoryCounter,
  async (req, res, next) => {
    try {
      const countId = req.params.id as string;
      const { version } = z.object({ version: z.number().int().min(0) }).parse(req.body);
      const result = await completeInventoryCount({
        countId,
        userId: req.user!.id,
        version,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Cancel count
router.post('/counts/:id/cancel', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const count = await prisma.inventoryCount.findUnique({ where: { id } });
    if (!count) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'ספירת מלאי לא נמצאה' });
      return;
    }
    const cancellable: string[] = [
      CountStatus.WAITING_FOR_LEGACY_CLOSE,
      CountStatus.READY_TO_COUNT,
      CountStatus.IN_PROGRESS,
    ];
    if (!cancellable.includes(count.status)) {
      res.status(409).json({ error: 'INVALID_STATE_TRANSITION', message: 'לא ניתן לבטל' });
      return;
    }
    const updated = await prisma.inventoryCount.update({
      where: { id: count.id },
      data: {
        status: CountStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: (req.body.reason as string) ?? null,
        version: { increment: 1 },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── Movements ────────────────────────────────────────────────────────────────

router.get('/movements', requireAuth, async (req, res, next) => {
  try {
    const branchId = qs(req.query.branchId);
    const itemId = qs(req.query.itemId);
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        branchId: branchId ?? undefined,
        itemId: itemId ?? undefined,
      },
      include: { branch: true, item: true },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
    res.json(movements);
  } catch (err) {
    next(err);
  }
});

export default router;

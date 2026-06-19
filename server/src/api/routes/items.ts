import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val || undefined;
  if (Array.isArray(val) && val.length > 0) return String(val[0]);
  return undefined;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const activeOnly = qs(req.query.activeOnly);
    const items = await prisma.item.findMany({
      where: activeOnly === 'true' ? { assortmentActive: true, status: 'active' } : undefined,
      orderBy: { name: 'asc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'פריט לא נמצא' });
      return;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

const ItemSchema = z.object({
  itemCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  imageUrl: z.string().optional(),
  barcode: z.string().optional(),
  assortmentActive: z.boolean().default(true),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = ItemSchema.parse(req.body);
    const item = await prisma.item.create({ data });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const data = ItemSchema.partial().parse(req.body);
    const item = await prisma.item.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.item.update({ where: { id }, data: { status: 'archived' } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

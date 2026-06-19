import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { notificationDests: true },
    });
    if (!supplier) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'ספק לא נמצא' });
      return;
    }
    res.json(supplier);
  } catch (err) {
    next(err);
  }
});

const SupplierSchema = z.object({
  supplierCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = SupplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(supplier);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const data = SupplierSchema.partial().parse(req.body);
    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    });
    res.json(supplier);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.supplier.update({
      where: { id },
      data: { status: 'archived' },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

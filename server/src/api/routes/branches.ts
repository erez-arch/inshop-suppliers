import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
    res.json(branches);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'סניף לא נמצא' });
      return;
    }
    res.json(branch);
  } catch (err) {
    next(err);
  }
});

const BranchSchema = z.object({
  branchCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = BranchSchema.parse(req.body);
    const branch = await prisma.branch.create({ data });
    res.status(201).json(branch);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const data = BranchSchema.partial().parse(req.body);
    const branch = await prisma.branch.update({ where: { id }, data });
    res.json(branch);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.branch.update({ where: { id }, data: { status: 'archived' } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

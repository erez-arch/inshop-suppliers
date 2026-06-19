import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const trustees = await prisma.trustee.findMany({
      include: { primaryBranch: true },
      orderBy: { name: 'asc' },
    });
    res.json(trustees);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const trustee = await prisma.trustee.findUnique({
      where: { id },
      include: { primaryBranch: true, trusteeBranches: { include: { branch: true } } },
    });
    if (!trustee) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'נאמן לא נמצא' });
      return;
    }
    res.json(trustee);
  } catch (err) {
    next(err);
  }
});

const TrusteeSchema = z.object({
  trusteeCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  imageUrl: z.string().optional(),
  primaryBranchId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = TrusteeSchema.parse(req.body);
    const trustee = await prisma.trustee.create({ data });
    res.status(201).json(trustee);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const data = TrusteeSchema.partial().parse(req.body);
    const trustee = await prisma.trustee.update({ where: { id }, data });
    res.json(trustee);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.trustee.update({ where: { id }, data: { status: 'archived' } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

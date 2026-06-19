import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { OrderRuleStatus } from '../../domain/statuses';

const router = Router();

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val || undefined;
  if (Array.isArray(val) && val.length > 0) return String(val[0]);
  return undefined;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const branchId = qs(req.query.branchId);
    const supplierId = qs(req.query.supplierId);
    const status = qs(req.query.status);
    const rules = await prisma.orderRule.findMany({
      where: {
        branchId: branchId ?? undefined,
        supplierId: supplierId ?? undefined,
        status: status ?? undefined,
      },
      include: {
        branch: true,
        supplier: true,
        items: { include: { item: true, preferredItemCode: true }, where: { active: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const rule = await prisma.orderRule.findUnique({
      where: { id },
      include: {
        branch: true,
        supplier: true,
        items: { include: { item: true }, where: { active: true } },
      },
    });
    if (!rule) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'כלל הזמנה לא נמצא' });
      return;
    }
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

const OrderRuleSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).default('draft'),
  deliveryWeekdays: z.array(z.number().int().min(0).max(6)).default([]),
  averageLeadTimeDays: z.number().int().min(0).max(365).default(0),
  minimumOrderAmount: z.string().default('0'),
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = OrderRuleSchema.parse(req.body);

    if (data.status === OrderRuleStatus.ACTIVE) {
      await prisma.orderRule.updateMany({
        where: {
          branchId: data.branchId,
          supplierId: data.supplierId,
          status: OrderRuleStatus.ACTIVE,
        },
        data: { status: OrderRuleStatus.ARCHIVED },
      });
    }

    const rule = await prisma.orderRule.create({
      data: {
        ...data,
        deliveryWeekdays: JSON.stringify(data.deliveryWeekdays),
        createdBy: req.user!.id,
        updatedBy: req.user!.id,
      },
    });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const ruleId = req.params.id as string;
    const data = OrderRuleSchema.partial().parse(req.body);

    const existing = await prisma.orderRule.findUnique({ where: { id: ruleId } });
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'כלל הזמנה לא נמצא' });
      return;
    }

    if (data.status === OrderRuleStatus.ACTIVE) {
      const bid = data.branchId ?? existing.branchId;
      const sid = data.supplierId ?? existing.supplierId;
      await prisma.orderRule.updateMany({
        where: {
          branchId: bid,
          supplierId: sid,
          status: OrderRuleStatus.ACTIVE,
          id: { not: ruleId },
        },
        data: { status: OrderRuleStatus.ARCHIVED },
      });
    }

    const rule = await prisma.orderRule.update({
      where: { id: ruleId },
      data: {
        ...data,
        deliveryWeekdays:
          data.deliveryWeekdays != null ? JSON.stringify(data.deliveryWeekdays) : undefined,
        updatedBy: req.user!.id,
        version: { increment: 1 },
      },
    });
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

// Manage order rule items
router.post('/:id/items', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const ruleId = req.params.id as string;
    const ItemSchema = z.object({
      itemId: z.string().uuid(),
      targetInventoryQty: z.number().int().min(0).default(0),
      packagingQty: z.number().int().min(1).default(1),
      preferredSupplierItemCodeId: z.string().uuid().optional(),
    });
    const data = ItemSchema.parse(req.body);
    const item = await prisma.orderRuleItem.upsert({
      where: { orderRuleId_itemId: { orderRuleId: ruleId, itemId: data.itemId } },
      create: { ...data, orderRuleId: ruleId },
      update: {
        targetInventoryQty: data.targetInventoryQty,
        packagingQty: data.packagingQty,
        preferredSupplierItemCodeId: data.preferredSupplierItemCodeId,
        active: true,
        version: { increment: 1 },
      },
      include: { item: true },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/items/:itemId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const ruleId = req.params.id as string;
    const itemId = req.params.itemId as string;
    await prisma.orderRuleItem.updateMany({
      where: { orderRuleId: ruleId, itemId },
      data: { active: false },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

import { z } from 'zod';
import prisma from '../../db';
import { CountStatus } from '../../domain/statuses';
import { ExcelLegacyAdapter } from '../../infrastructure/legacy/ExcelLegacyAdapter';
import { v4 as uuidv4 } from 'uuid';

export const StartInventoryCountSchema = z.object({
  branchId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type StartInventoryCountInput = z.infer<typeof StartInventoryCountSchema>;

export async function startInventoryCount(input: StartInventoryCountInput) {
  // Check no active count for this branch
  const active = await prisma.inventoryCount.findFirst({
    where: {
      branchId: input.branchId,
      status: {
        in: [
          CountStatus.WAITING_FOR_LEGACY_CLOSE,
          CountStatus.READY_TO_COUNT,
          CountStatus.IN_PROGRESS,
        ],
      },
    },
  });

  if (active) {
    const err = new Error(
      'קיימת ספירת מלאי פעילה לסניף זה'
    ) as Error & { httpStatus: number; code: string };
    err.httpStatus = 409;
    err.code = 'INVENTORY_COUNT_ACTIVE_EXISTS';
    throw err;
  }

  const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
  if (!branch) {
    const err = new Error('סניף לא נמצא') as Error & { httpStatus: number; code: string };
    err.httpStatus = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Check legacy close gate
  const legacyAdapter = new ExcelLegacyAdapter();
  const closeResult = await legacyAdapter.checkLegacyClose(branch.branchCode, {
    logicalOperationKey: `start-count-${branch.branchCode}-${Date.now()}`,
  });

  if (!closeResult.canStartCount || closeResult.stillOpen > 0) {
    const err = new Error(
      `לא ניתן להתחיל ספירה — ${closeResult.stillOpen} חשבוניות פתוחות`
    ) as Error & { httpStatus: number; code: string };
    err.httpStatus = 422;
    err.code = 'LEGACY_CLOSE_GATE_BLOCKED';
    throw err;
  }

  const reference = `CNT-${branch.branchCode}-${Date.now()}`;

  const count = await prisma.inventoryCount.create({
    data: {
      reference,
      branchId: input.branchId,
      countedByUserId: input.userId,
      status: CountStatus.READY_TO_COUNT, // close gate passed, go straight to ready
      legacyCloseResult: JSON.stringify(closeResult),
      assortmentSnapshotAt: new Date(),
    },
  });

  // Snapshot active assortment as count lines
  const items = await prisma.item.findMany({
    where: { assortmentActive: true, status: 'active' },
  });

  if (items.length > 0) {
    // Get current balances
    const balances = await prisma.inventoryBalance.findMany({
      where: { branchId: input.branchId, itemId: { in: items.map((i) => i.id) } },
    });
    const balanceMap = new Map(balances.map((b) => [b.itemId, b.quantity]));

    await prisma.inventoryCountLine.createMany({
      data: items.map((item) => ({
        id: uuidv4(),
        countId: count.id,
        itemId: item.id,
        defaultQty: 0,
        balanceAtStart: balanceMap.get(item.id) ?? 0,
        countedQty: 0,
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      actorType: 'user',
      actorId: input.userId,
      action: 'StartInventoryCount',
      entityType: 'inventory_count',
      entityId: count.id,
      afterData: JSON.stringify({ reference, branchId: input.branchId }),
    },
  });

  return count;
}

import { z } from 'zod';
import prisma from '../../db';
import { CountStatus, InventoryMovementType } from '../../domain/statuses';
import { guardCountComplete } from '../../domain/guards';
import { v4 as uuidv4 } from 'uuid';

export const CompleteInventoryCountSchema = z.object({
  countId: z.string().uuid(),
  userId: z.string().uuid(),
  version: z.number().int().min(0),
});

export type CompleteInventoryCountInput = z.infer<typeof CompleteInventoryCountSchema>;

export async function completeInventoryCount(input: CompleteInventoryCountInput) {
  const count = await prisma.inventoryCount.findUnique({
    where: { id: input.countId },
    include: { lines: true },
  });

  if (!count) {
    const err = new Error('ספירת מלאי לא נמצאה') as Error & {
      httpStatus: number;
      code: string;
    };
    err.httpStatus = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  guardCountComplete(count.status);

  if (count.version !== input.version) {
    const err = new Error('הנתון השתנה מאז הטעינה') as Error & {
      httpStatus: number;
      code: string;
    };
    err.httpStatus = 409;
    err.code = 'VERSION_CONFLICT';
    throw err;
  }

  // All lines must be saved
  const unsaved = count.lines.filter(
    (l) => !l.saved || (l.savedAt && l.lastChangedAt > l.savedAt)
  );
  if (unsaved.length > 0) {
    const err = new Error(`${unsaved.length} שורות לא נשמרו`) as Error & {
      httpStatus: number;
      code: string;
    };
    err.httpStatus = 422;
    err.code = 'COUNT_LINES_UNSAVED';
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create inventory adjustments for each line
    for (const line of count.lines) {
      const delta = line.countedQty - line.balanceAtStart;
      if (delta === 0) continue;

      const idempotencyKey = `count-adj-${count.id}-item-${line.itemId}`;
      const existing = await tx.inventoryMovement.findUnique({ where: { idempotencyKey } });
      if (existing) continue;

      const currentBalance = await tx.inventoryBalance.findUnique({
        where: { branchId_itemId: { branchId: count.branchId, itemId: line.itemId } },
      });
      const newQty = (currentBalance?.quantity ?? 0) + delta;

      if (currentBalance) {
        await tx.inventoryBalance.update({
          where: { branchId_itemId: { branchId: count.branchId, itemId: line.itemId } },
          data: { quantity: newQty, version: { increment: 1 } },
        });
      } else {
        await tx.inventoryBalance.create({
          data: { branchId: count.branchId, itemId: line.itemId, quantity: Math.max(0, newQty) },
        });
      }

      await tx.inventoryMovement.create({
        data: {
          id: uuidv4(),
          branchId: count.branchId,
          itemId: line.itemId,
          movementType: InventoryMovementType.COUNT_ADJUSTMENT,
          quantityDelta: delta,
          balanceAfter: newQty,
          sourceType: 'inventory_count',
          sourceId: count.id,
          idempotencyKey,
          occurredAt: new Date(),
          createdBy: input.userId,
        },
      });
    }

    const now = new Date();
    const updated = await tx.inventoryCount.update({
      where: { id: count.id },
      data: {
        status: CountStatus.LOCKED, // completed and locked atomically
        completedAt: now,
        lockedAt: now,
        version: count.version + 1,
      },
    });

    await tx.auditLog.create({
      data: {
        actorType: 'user',
        actorId: input.userId,
        action: 'CompleteInventoryCount',
        entityType: 'inventory_count',
        entityId: count.id,
        beforeData: JSON.stringify({ status: count.status }),
        afterData: JSON.stringify({ status: CountStatus.LOCKED }),
      },
    });

    return updated;
  });

  return result;
}

import { z } from 'zod';
import prisma from '../../db';
import { DeliveryStatus, InventoryMovementType, LedgerEntryType } from '../../domain/statuses';
import { guardDeliveryApproveToInventory } from '../../domain/guards';
import { v4 as uuidv4 } from 'uuid';

export const ApproveDeliverySchema = z.object({
  deliveryId: z.string().uuid(),
  userId: z.string().uuid(),
  version: z.number().int().min(0),
  lines: z.array(
    z.object({
      deliveryLineId: z.string().uuid(),
      qtyInventory: z.number().int().min(0),
      adminChangeReason: z.string().optional(),
    })
  ),
});

export type ApproveDeliveryInput = z.infer<typeof ApproveDeliverySchema>;

export async function approveDeliveryToInventory(input: ApproveDeliveryInput) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: input.deliveryId },
    include: {
      deliveryLines: true,
      invoices: { where: { isPrimary: true }, take: 1 },
    },
  });

  if (!delivery) {
    const err = new Error('אספקה לא נמצאה') as Error & { httpStatus: number; code: string };
    err.httpStatus = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  guardDeliveryApproveToInventory(delivery.status);

  if (delivery.version !== input.version) {
    const err = new Error('הנתון השתנה מאז הטעינה') as Error & {
      httpStatus: number;
      code: string;
    };
    err.httpStatus = 409;
    err.code = 'VERSION_CONFLICT';
    throw err;
  }

  const branchId = delivery.branchId ?? delivery.selectedBranchId;
  if (!branchId || !delivery.supplierId) {
    const err = new Error('חסרים נתוני ספק/סניף') as Error & {
      httpStatus: number;
      code: string;
    };
    err.httpStatus = 422;
    err.code = 'MISSING_BRANCH_OR_SUPPLIER';
    throw err;
  }

  const invoiceTotal = delivery.invoices[0]?.totalAmount
    ? parseFloat(delivery.invoices[0].totalAmount)
    : 0;

  // Idempotency key for this approval
  const approvalIdempKey = `delivery-approval-${delivery.id}`;

  // Execute everything in a single transaction — inventory integrity requirement
  const result = await prisma.$transaction(async (tx) => {
    // Update delivery status
    const updatedDelivery = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.APPROVED_TO_INVENTORY,
        inventoryApprovedAt: new Date(),
        version: delivery.version + 1,
      },
    });

    // Update each delivery line with confirmed inventory qty
    const lineMap = new Map(input.lines.map((l) => [l.deliveryLineId, l]));
    await Promise.all(
      delivery.deliveryLines.map(async (line) => {
        const update = lineMap.get(line.id);
        if (update) {
          await tx.deliveryLine.update({
            where: { id: line.id },
            data: {
              qtyInventory: update.qtyInventory,
              confirmedByAdmin: true,
              adminChangeReason: update.adminChangeReason ?? null,
              version: line.version + 1,
            },
          });
        }
      })
    );

    // Create inventory movements for each line with an item
    const movements: Array<{
      id: string;
      branchId: string;
      itemId: string;
      movementType: string;
      quantityDelta: number;
      balanceAfter: number;
      sourceType: string;
      sourceId: string;
      idempotencyKey: string;
      occurredAt: Date;
      createdBy: string;
    }> = [];

    for (const line of delivery.deliveryLines) {
      if (!line.itemId) continue;
      const update = lineMap.get(line.id);
      const qty = update ? update.qtyInventory : line.qtyInventory;
      if (qty === 0) continue;

      const idempotencyKey = `${approvalIdempKey}-item-${line.itemId}`;

      // Check idempotency
      const existing = await tx.inventoryMovement.findUnique({
        where: { idempotencyKey },
      });
      if (existing) continue;

      // Get or create balance
      let balance = await tx.inventoryBalance.findUnique({
        where: { branchId_itemId: { branchId, itemId: line.itemId } },
      });

      const currentQty = balance?.quantity ?? 0;
      const newQty = currentQty + qty;

      if (balance) {
        await tx.inventoryBalance.update({
          where: { branchId_itemId: { branchId, itemId: line.itemId } },
          data: { quantity: newQty, version: { increment: 1 } },
        });
      } else {
        await tx.inventoryBalance.create({
          data: { branchId, itemId: line.itemId, quantity: newQty },
        });
      }

      const movement = {
        id: uuidv4(),
        branchId,
        itemId: line.itemId,
        movementType: InventoryMovementType.DELIVERY_RECEIPT,
        quantityDelta: qty,
        balanceAfter: newQty,
        sourceType: 'delivery',
        sourceId: delivery.id,
        idempotencyKey,
        occurredAt: new Date(),
        createdBy: input.userId,
      };
      movements.push(movement);

      await tx.inventoryMovement.create({ data: movement });
    }

    // Create supplier ledger liability entry
    if (invoiceTotal > 0) {
      const ledgerIdempKey = `delivery-liability-${delivery.id}`;
      const existingLedger = await tx.supplierLedgerEntry.findUnique({
        where: { idempotencyKey: ledgerIdempKey },
      });

      if (!existingLedger) {
        await tx.supplierLedgerEntry.create({
          data: {
            supplierId: delivery.supplierId!,
            entryType: LedgerEntryType.INVOICE_LIABILITY,
            amountSigned: invoiceTotal.toFixed(2),
            sourceType: 'delivery',
            sourceId: delivery.id,
            idempotencyKey: ledgerIdempKey,
            occurredAt: new Date(),
            createdBy: input.userId,
          },
        });
      }
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        actorType: 'user',
        actorId: input.userId,
        action: 'ApproveDeliveryToInventory',
        entityType: 'delivery',
        entityId: delivery.id,
        beforeData: JSON.stringify({ status: delivery.status }),
        afterData: JSON.stringify({ status: DeliveryStatus.APPROVED_TO_INVENTORY }),
      },
    });

    return { delivery: updatedDelivery, movementsCreated: movements.length };
  });

  return result;
}

import { z } from 'zod';
import prisma from '../../db';
import { DeliveryStatus } from '../../domain/statuses';
import { guardDeliverySubmit } from '../../domain/guards';

export const SubmitSupplierReportSchema = z.object({
  deliveryId: z.string().uuid(),
  version: z.number().int().min(0),
  confirmGoodsLeftAtBranch: z.literal(true),
});

export type SubmitSupplierReportInput = z.infer<typeof SubmitSupplierReportSchema>;

export async function submitSupplierDeliveryReport(input: SubmitSupplierReportInput) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: input.deliveryId },
    include: { contact: true, invoices: true, media: true },
  });

  if (!delivery) {
    const err = new Error('אספקה לא נמצאה') as Error & { httpStatus: number; code: string };
    err.httpStatus = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  guardDeliverySubmit(delivery.status);

  if (delivery.version !== input.version) {
    const err = new Error('הנתון השתנה מאז הטעינה') as Error & {
      httpStatus: number;
      code: string;
    };
    err.httpStatus = 409;
    err.code = 'VERSION_CONFLICT';
    throw err;
  }

  // Validate required data
  if (!delivery.supplierId) {
    const err = new Error('חסר מזהה ספק') as Error & { httpStatus: number; code: string };
    err.httpStatus = 422;
    err.code = 'MISSING_SUPPLIER';
    throw err;
  }

  if (!delivery.branchId && !delivery.selectedBranchId) {
    const err = new Error('חסרה בחירת סניף') as Error & { httpStatus: number; code: string };
    err.httpStatus = 422;
    err.code = 'MISSING_BRANCH';
    throw err;
  }

  if (!delivery.contact) {
    const err = new Error('חסרים פרטי איש קשר') as Error & { httpStatus: number; code: string };
    err.httpStatus = 422;
    err.code = 'MISSING_CONTACT';
    throw err;
  }

  if (delivery.invoices.length === 0) {
    const err = new Error('חסרה תמונת חשבונית') as Error & {
      httpStatus: number;
      code: string;
    };
    err.httpStatus = 422;
    err.code = 'MISSING_INVOICE';
    throw err;
  }

  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      status: DeliveryStatus.SUPPLIER_REPORTED,
      supplierReportedAt: new Date(),
      version: delivery.version + 1,
    },
  });

  // Log to audit
  await prisma.auditLog.create({
    data: {
      actorType: 'supplier',
      action: 'SubmitSupplierDeliveryReport',
      entityType: 'delivery',
      entityId: delivery.id,
      beforeData: JSON.stringify({ status: delivery.status }),
      afterData: JSON.stringify({ status: DeliveryStatus.SUPPLIER_REPORTED }),
    },
  });

  return updated;
}

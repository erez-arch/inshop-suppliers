import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { DeliveryStatus } from '../../domain/statuses';
import { approveDeliveryToInventory } from '../../application/usecases/ApproveDeliveryToInventory';
import { submitSupplierDeliveryReport } from '../../application/usecases/SubmitSupplierDeliveryReport';
import { LocalStorageAdapter } from '../../infrastructure/storage/LocalStorageAdapter';
import { MockAiService } from '../../infrastructure/ai/MockAiService';
import path from 'path';

const router = Router();
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage, limits: { fileSize: 20 * 1024 * 1024 } });
const storageAdapter = new LocalStorageAdapter();
const aiService = new MockAiService();

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return String(val[0]);
  return undefined;
}

// ─── Public supplier routes (no auth) ────────────────────────────────────────

router.post('/public/supplier-reports', async (req, res, next) => {
  try {
    const reference = `DEL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const delivery = await prisma.delivery.create({
      data: {
        reference,
        status: DeliveryStatus.DRAFT,
        version: 0,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorType: 'supplier',
        action: 'CreateSupplierReport',
        entityType: 'delivery',
        entityId: delivery.id,
        afterData: JSON.stringify({ reference }),
      },
    });

    res.status(201).json(delivery);
  } catch (err) {
    next(err);
  }
});

router.get('/public/supplier-reports/:deliveryId', async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: (req.params.deliveryId as string) },
      include: {
        supplier: true,
        branch: true,
        contact: true,
        media: { include: { media: true } },
        invoices: { include: { invoiceLines: true } },
        deliveryLines: { include: { item: true } },
      },
    });
    if (!delivery) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'אספקה לא נמצאה' });
      return;
    }
    res.json(delivery);
  } catch (err) {
    next(err);
  }
});

const UpdateDraftSchema = z.object({
  branchId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  contactName: z.string().min(2).max(80).optional(),
  contactPhone: z.string().min(7).max(24).optional(),
  note: z.string().max(500).optional().nullable(),
  version: z.number().int().min(0),
});

router.patch('/public/supplier-reports/:deliveryId', async (req, res, next) => {
  try {
    const body = UpdateDraftSchema.parse(req.body);
    const { version, branchId, supplierId, contactName, contactPhone, note } = body;

    const delivery = await prisma.delivery.findUnique({
      where: { id: (req.params.deliveryId as string) },
    });
    if (!delivery) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'אספקה לא נמצאה' });
      return;
    }
    if (delivery.version !== version) {
      res.status(409).json({ error: 'VERSION_CONFLICT', message: 'גרסה לא תואמת' });
      return;
    }

    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        branchId: branchId ?? delivery.branchId,
        supplierId: supplierId ?? delivery.supplierId,
        version: delivery.version + 1,
      },
    });

    if (contactName || contactPhone) {
      await prisma.deliveryContact.upsert({
        where: { deliveryId: delivery.id },
        create: {
          deliveryId: delivery.id,
          contactName: contactName ?? '',
          contactPhone: contactPhone ?? '',
          note: note ?? null,
        },
        update: {
          contactName: contactName ?? undefined,
          contactPhone: contactPhone ?? undefined,
          note: note,
        },
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Upload media for supplier report
router.post(
  '/public/supplier-reports/:deliveryId/media',
  upload.single('file'),
  async (req, res, next) => {
    try {
      const deliveryId = (req.params.deliveryId as string) as string;
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
      });
      if (!delivery) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'אספקה לא נמצאה' });
        return;
      }

      const mediaType = (req.body.mediaType as string) ?? 'supplier_invoice';
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'MISSING_FILE', message: 'חסר קובץ' });
        return;
      }

      const ext = path.extname(file.originalname) || '.jpg';
      const storageKey = `deliveries/${delivery.id}/${uuidv4()}${ext}`;
      await storageAdapter.save(storageKey, file.buffer, file.mimetype);

      const media = await prisma.mediaObject.create({
        data: {
          mediaType,
          status: 'uploaded',
          storageKey,
          originalFilename: file.originalname,
          contentType: file.mimetype,
          sizeBytes: file.size,
        },
      });

      await prisma.deliveryMedia.create({
        data: {
          deliveryId: delivery.id,
          mediaId: media.id,
          sourceActorType: 'supplier',
        },
      });

      if (mediaType === 'supplier_invoice') {
        const ocrResult = await aiService.extractInvoiceData(storageKey);

        const invoice = await prisma.invoice.create({
          data: {
            deliveryId: delivery.id,
            source: 'supplier',
            mediaId: media.id,
            invoiceNumber: ocrResult.invoiceNumber ?? null,
            invoiceDate: ocrResult.invoiceDate ? new Date(ocrResult.invoiceDate) : null,
            totalAmount: ocrResult.totalAmount ?? null,
            rawOcr: JSON.stringify(ocrResult),
            aiStatus: 'processed',
          },
        });

        if (ocrResult.lines.length > 0) {
          await prisma.invoiceLine.createMany({
            data: ocrResult.lines.map((l, i) => ({
              invoiceId: invoice.id,
              lineNumber: i + 1,
              rawName: l.rawName,
              supplierItemCode: l.supplierItemCode ?? null,
              qty: l.qty ?? 0,
              unitPrice: l.unitPrice ?? null,
              lineTotal: l.lineTotal ?? null,
            })),
          });

          await prisma.deliveryLine.createMany({
            data: ocrResult.lines.map((l, i) => ({
              deliveryId: delivery.id,
              rawName: l.rawName,
              supplierItemCode: l.supplierItemCode ?? null,
              qtyInvoice: l.qty ?? 0,
              qtyReceived: l.qty ?? 0,
              qtyInventory: l.qty ?? 0,
              unitPrice: l.unitPrice ?? null,
              sortOrder: i,
            })),
          });
        }

        res.status(201).json({ media, invoice, ocrResult });
        return;
      }

      res.status(201).json({ media });
    } catch (err) {
      next(err);
    }
  }
);

// Submit supplier report
router.post('/public/supplier-reports/:deliveryId/submit', async (req, res, next) => {
  try {
    const result = await submitSupplierDeliveryReport({
      deliveryId: (req.params.deliveryId as string),
      version: (req.body.version as number) ?? 0,
      confirmGoodsLeftAtBranch: req.body.confirmGoodsLeftAtBranch as true,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Admin delivery routes (auth required) ────────────────────────────────────

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const status = qs(req.query.status);
    const supplierId = qs(req.query.supplierId);
    const branchId = qs(req.query.branchId);
    const deliveries = await prisma.delivery.findMany({
      where: {
        status: status ?? undefined,
        supplierId: supplierId ?? undefined,
        branchId: branchId ?? undefined,
      },
      include: {
        supplier: true,
        branch: true,
        contact: true,
        invoices: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(deliveries);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id as string },
      include: {
        supplier: true,
        branch: true,
        selectedBranch: true,
        contact: true,
        media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
        invoices: { include: { invoiceLines: { include: { matchedItem: true } } } },
        deliveryLines: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
        deliveryIssues: true,
        creditRequest: true,
      },
    });
    if (!delivery) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'אספקה לא נמצאה' });
      return;
    }
    res.json(delivery);
  } catch (err) {
    next(err);
  }
});

// Move to admin review
router.post('/:id/admin-review', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id as string } });
    if (!delivery) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'אספקה לא נמצאה' });
      return;
    }
    if (
      delivery.status !== DeliveryStatus.TRUSTEE_RECEIVED &&
      delivery.status !== DeliveryStatus.SUPPLIER_REPORTED
    ) {
      res.status(409).json({ error: 'INVALID_STATE_TRANSITION', message: 'מעבר לא חוקי' });
      return;
    }
    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: DeliveryStatus.ADMIN_REVIEW, version: { increment: 1 } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Approve to inventory
const ApproveSchema = z.object({
  version: z.number().int().min(0),
  lines: z.array(
    z.object({
      deliveryLineId: z.string().uuid(),
      qtyInventory: z.number().int().min(0),
      adminChangeReason: z.string().optional(),
    })
  ),
});

router.post('/:id/approve-inventory', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = ApproveSchema.parse(req.body);
    const result = await approveDeliveryToInventory({
      deliveryId: req.params.id as string,
      userId: req.user!.id,
      version: body.version,
      lines: body.lines,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Cancel delivery
router.post('/:id/cancel', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id as string } });
    if (!delivery) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'אספקה לא נמצאה' });
      return;
    }
    const cancellable: string[] = [
      DeliveryStatus.DRAFT,
      DeliveryStatus.SUPPLIER_REPORTED,
      DeliveryStatus.TRUSTEE_PENDING,
      DeliveryStatus.ADMIN_REVIEW,
    ];
    if (!cancellable.includes(delivery.status)) {
      res.status(409).json({ error: 'INVALID_STATE_TRANSITION', message: 'לא ניתן לבטל' });
      return;
    }
    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.CANCELLED,
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

// Update delivery line quantity (for admin reconciliation)
router.patch('/:id/lines/:lineId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { qtyInventory, adminChangeReason, version } = req.body as {
      qtyInventory?: number;
      adminChangeReason?: string;
      version?: number;
    };
    const line = await prisma.deliveryLine.findUnique({ where: { id: req.params.lineId as string } });
    if (!line || line.deliveryId !== (req.params.id as string)) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'שורה לא נמצאה' });
      return;
    }
    if (version !== undefined && line.version !== version) {
      res.status(409).json({ error: 'VERSION_CONFLICT', message: 'גרסה לא תואמת' });
      return;
    }
    const updated = await prisma.deliveryLine.update({
      where: { id: line.id },
      data: {
        qtyInventory: qtyInventory ?? line.qtyInventory,
        adminChangeReason: adminChangeReason ?? null,
        confirmedByAdmin: true,
        version: { increment: 1 },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Serve uploaded file
router.get('/files/:key', async (req, res, next) => {
  try {
    const filePath = storageAdapter.getFilePath(decodeURIComponent(req.params.key));
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

export default router;

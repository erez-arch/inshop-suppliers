// Legacy sync routes — import master data from CSV mock files
import { Router } from 'express';
import prisma from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { ExcelLegacyAdapter } from '../../infrastructure/legacy/ExcelLegacyAdapter';

const router = Router();
const adapter = new ExcelLegacyAdapter();

// Sync suppliers from legacy
router.post('/sync/suppliers', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const suppliers = await adapter.getSuppliers({ logicalOperationKey: 'sync-suppliers' });
    let created = 0;
    let updated = 0;
    for (const s of suppliers) {
      const existing = await prisma.supplier.findUnique({
        where: { supplierCode: s.supplierCode },
      });
      if (existing) {
        await prisma.supplier.update({
          where: { supplierCode: s.supplierCode },
          data: { name: s.name, status: s.status },
        });
        updated++;
      } else {
        await prisma.supplier.create({
          data: { supplierCode: s.supplierCode, name: s.name, status: s.status },
        });
        created++;
      }
    }
    res.json({ created, updated, total: suppliers.length });
  } catch (err) {
    next(err);
  }
});

// Sync branches from legacy
router.post('/sync/branches', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const branches = await adapter.getBranches({ logicalOperationKey: 'sync-branches' });
    let created = 0;
    let updated = 0;
    for (const b of branches) {
      const existing = await prisma.branch.findUnique({ where: { branchCode: b.branchCode } });
      if (existing) {
        await prisma.branch.update({
          where: { branchCode: b.branchCode },
          data: { name: b.name, address: b.address, status: b.status },
        });
        updated++;
      } else {
        await prisma.branch.create({
          data: {
            branchCode: b.branchCode,
            name: b.name,
            address: b.address,
            status: b.status,
          },
        });
        created++;
      }
    }
    res.json({ created, updated, total: branches.length });
  } catch (err) {
    next(err);
  }
});

// Sync items from legacy
router.post('/sync/items', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const items = await adapter.getItems({ logicalOperationKey: 'sync-items' });
    let created = 0;
    let updated = 0;
    for (const item of items) {
      const existing = await prisma.item.findUnique({ where: { itemCode: item.itemCode } });
      if (existing) {
        await prisma.item.update({
          where: { itemCode: item.itemCode },
          data: {
            name: item.name,
            imageUrl: item.imageUrl,
            barcode: item.barcode,
            assortmentActive: item.assortmentActive,
          },
        });
        updated++;
      } else {
        await prisma.item.create({
          data: {
            itemCode: item.itemCode,
            name: item.name,
            imageUrl: item.imageUrl,
            barcode: item.barcode,
            assortmentActive: item.assortmentActive,
          },
        });
        created++;
      }
    }
    res.json({ created, updated, total: items.length });
  } catch (err) {
    next(err);
  }
});

// Sync trustees from legacy
router.post('/sync/trustees', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const trustees = await adapter.getTrustees({ logicalOperationKey: 'sync-trustees' });
    let created = 0;
    let updated = 0;
    for (const t of trustees) {
      const branch = await prisma.branch.findUnique({ where: { branchCode: t.branchCode } });
      const existing = await prisma.trustee.findUnique({
        where: { trusteeCode: t.trusteeCode },
      });
      if (existing) {
        await prisma.trustee.update({
          where: { trusteeCode: t.trusteeCode },
          data: {
            name: t.name,
            phone: t.phone,
            imageUrl: t.imageUrl,
            primaryBranchId: branch?.id ?? null,
          },
        });
        updated++;
      } else {
        await prisma.trustee.create({
          data: {
            trusteeCode: t.trusteeCode,
            name: t.name,
            phone: t.phone,
            imageUrl: t.imageUrl,
            primaryBranchId: branch?.id ?? null,
          },
        });
        created++;
      }
    }
    res.json({ created, updated, total: trustees.length });
  } catch (err) {
    next(err);
  }
});

// Get sync logs
router.get('/sync/logs', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const logs = await prisma.legacySyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;

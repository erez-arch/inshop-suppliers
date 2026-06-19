// Seed script — creates initial admin user and syncs mock master data
import prisma from '../db';
import bcrypt from 'bcryptjs';
import { ExcelLegacyAdapter } from '../infrastructure/legacy/ExcelLegacyAdapter';

const adapter = new ExcelLegacyAdapter();

async function main() {
  console.log('[Seed] Starting database seed...');

  // ─── Create admin user ────────────────────────────────────────────────────
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@inshop.local' } });
  if (!existingAdmin) {
    const hash = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@inshop.local',
        displayName: 'מנהל מערכת',
        passwordHash: hash,
        status: 'active',
        userRoles: {
          create: [{ role: 'admin' }],
        },
      },
    });
    console.log('[Seed] Created admin user:', admin.email);
  } else {
    console.log('[Seed] Admin user already exists');
  }

  // ─── Sync suppliers ───────────────────────────────────────────────────────
  const suppliers = await adapter.getSuppliers({ logicalOperationKey: 'seed-suppliers' });
  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { supplierCode: s.supplierCode },
      create: { supplierCode: s.supplierCode, name: s.name, status: s.status },
      update: { name: s.name, status: s.status },
    });
  }
  console.log(`[Seed] Synced ${suppliers.length} suppliers`);

  // ─── Sync branches ────────────────────────────────────────────────────────
  const branches = await adapter.getBranches({ logicalOperationKey: 'seed-branches' });
  for (const b of branches) {
    await prisma.branch.upsert({
      where: { branchCode: b.branchCode },
      create: { branchCode: b.branchCode, name: b.name, address: b.address, status: b.status },
      update: { name: b.name, address: b.address, status: b.status },
    });
  }
  console.log(`[Seed] Synced ${branches.length} branches`);

  // ─── Sync items ───────────────────────────────────────────────────────────
  const items = await adapter.getItems({ logicalOperationKey: 'seed-items' });
  for (const item of items) {
    await prisma.item.upsert({
      where: { itemCode: item.itemCode },
      create: {
        itemCode: item.itemCode,
        name: item.name,
        imageUrl: item.imageUrl,
        barcode: item.barcode,
        assortmentActive: item.assortmentActive,
      },
      update: {
        name: item.name,
        imageUrl: item.imageUrl,
        barcode: item.barcode,
        assortmentActive: item.assortmentActive,
      },
    });
  }
  console.log(`[Seed] Synced ${items.length} items`);

  // ─── Sync trustees ────────────────────────────────────────────────────────
  const trustees = await adapter.getTrustees({ logicalOperationKey: 'seed-trustees' });
  for (const t of trustees) {
    const branch = await prisma.branch.findUnique({ where: { branchCode: t.branchCode } });
    await prisma.trustee.upsert({
      where: { trusteeCode: t.trusteeCode },
      create: {
        trusteeCode: t.trusteeCode,
        name: t.name,
        phone: t.phone,
        imageUrl: t.imageUrl,
        primaryBranchId: branch?.id ?? null,
      },
      update: {
        name: t.name,
        phone: t.phone,
        imageUrl: t.imageUrl,
        primaryBranchId: branch?.id ?? null,
      },
    });
  }
  console.log(`[Seed] Synced ${trustees.length} trustees`);

  // ─── Seed inventory counter user ─────────────────────────────────────────
  const existingCounter = await prisma.user.findUnique({
    where: { email: 'counter@inshop.local' },
  });
  if (!existingCounter) {
    const hash = await bcrypt.hash('counter123', 12);
    await prisma.user.create({
      data: {
        email: 'counter@inshop.local',
        displayName: 'סופר מלאי',
        passwordHash: hash,
        status: 'active',
        userRoles: { create: [{ role: 'inventory_counter' }] },
      },
    });
    console.log('[Seed] Created inventory counter user');
  }

  // ─── Seed a sample order rule ─────────────────────────────────────────────
  const firstSupplier = await prisma.supplier.findFirst({ where: { status: 'active' } });
  const firstBranch = await prisma.branch.findFirst({ where: { status: 'active' } });

  if (firstSupplier && firstBranch) {
    const existingRule = await prisma.orderRule.findFirst({
      where: { supplierId: firstSupplier.id, branchId: firstBranch.id, status: 'active' },
    });

    if (!existingRule) {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@inshop.local' } });
      await prisma.orderRule.create({
        data: {
          branchId: firstBranch.id,
          supplierId: firstSupplier.id,
          status: 'active',
          deliveryWeekdays: JSON.stringify([0, 3]), // Sunday & Wednesday
          averageLeadTimeDays: 2,
          minimumOrderAmount: '500.00',
          createdBy: admin?.id ?? null,
          updatedBy: admin?.id ?? null,
        },
      });
      console.log(`[Seed] Created sample order rule for ${firstSupplier.name} / ${firstBranch.name}`);
    }
  }

  console.log('[Seed] Database seed complete!');
  console.log('[Seed] Admin login: admin@inshop.local / admin123');
  console.log('[Seed] Counter login: counter@inshop.local / counter123');
}

main()
  .catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

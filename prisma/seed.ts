import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ExcelLegacyAdapter } from '../src/adapters/legacy/ExcelLegacyAdapter'

const prisma = new PrismaClient()
const adapter = new ExcelLegacyAdapter()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin users
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.adminUser.upsert({
    where: { email: 'admin@inshop.co.il' },
    update: {},
    create: { email: 'admin@inshop.co.il', passwordHash, displayName: 'אדמין INSHOP', role: 'superadmin' },
  })
  await prisma.adminUser.upsert({
    where: { email: 'manager@inshop.co.il' },
    update: {},
    create: { email: 'manager@inshop.co.il', passwordHash: await bcrypt.hash('manager123', 10), displayName: 'מנהל מחסן', role: 'admin' },
  })

  console.log('✅ Admin users created')

  // Sync master data from CSV
  const suppliers = await adapter.syncSuppliers()
  console.log(`✅ Suppliers: ${suppliers.created} created, ${suppliers.updated} updated`)

  const branches = await adapter.syncBranches()
  console.log(`✅ Branches: ${branches.created} created, ${branches.updated} updated`)

  const items = await adapter.syncItems()
  console.log(`✅ Items: ${items.created} created, ${items.updated} updated`)

  const trustees = await adapter.syncTrustees()
  console.log(`✅ Trustees: ${trustees.created} created, ${trustees.updated} updated`)

  const codes = await adapter.syncSupplierItemCodes()
  console.log(`✅ Supplier item codes: ${codes.created} created, ${codes.updated} updated`)

  // Seed initial inventory (0 for all branch/item combos)
  const allBranches = await prisma.branch.findMany()
  const allItems = await prisma.item.findMany()
  for (const branch of allBranches) {
    for (const item of allItems) {
      await prisma.inventoryItem.upsert({
        where: { branchId_itemId: { branchId: branch.id, itemId: item.id } },
        update: {},
        create: { branchId: branch.id, itemId: item.id, qty: 0 },
      })
    }
  }
  console.log(`✅ Inventory items seeded`)

  // Apply legacy inventory deltas
  const deltas = await adapter.getInventoryDeltas()
  for (const delta of deltas) {
    const branch = await prisma.branch.findUnique({ where: { code: delta.branchCode } })
    const item = await prisma.item.findUnique({ where: { code: delta.itemCode } })
    if (!branch || !item) continue
    await prisma.inventoryItem.update({
      where: { branchId_itemId: { branchId: branch.id, itemId: item.id } },
      data: { qty: { increment: delta.qtyDelta } },
    })
    await prisma.inventoryMovement.create({
      data: { branchId: branch.id, itemId: item.id, movementType: 'sold', qtyDelta: delta.qtyDelta, reference: delta.source, createdBy: 'legacy_sync' },
    })
  }
  console.log(`✅ Inventory deltas applied: ${deltas.length} movements`)

  // Order rules
  const tnuva = await prisma.supplier.findUnique({ where: { code: 'TNUVA' } })
  const ramatGan = await prisma.branch.findUnique({ where: { code: 'RAMAT_GAN' } })
  if (tnuva && ramatGan) {
    const existingRule = await prisma.orderRule.findUnique({ where: { branchId_supplierId: { branchId: ramatGan.id, supplierId: tnuva.id } } })
    if (!existingRule) {
      const rule = await prisma.orderRule.create({
        data: {
          branchId: ramatGan.id,
          supplierId: tnuva.id,
          deliveryWeekdays: JSON.stringify([0, 3]), // Sunday, Wednesday
          avgLeadTimeDays: 2,
          minOrderAmount: 500,
          whatsappOrders: '050-1000001',
          whatsappCredits: '050-1000002',
        },
      })
      // Add items to order rule
      const milk = await prisma.item.findUnique({ where: { code: '7290012345678' } })
      const cottage = await prisma.item.findUnique({ where: { code: '7290012345679' } })
      if (milk) await prisma.orderRuleItem.create({ data: { orderRuleId: rule.id, itemId: milk.id, targetInventoryQty: 300, packageQty: 12, supplierItemCode: 'TN-10045' } })
      if (cottage) await prisma.orderRuleItem.create({ data: { orderRuleId: rule.id, itemId: cottage.id, targetInventoryQty: 200, packageQty: 12, supplierItemCode: 'TN-150-3' } })
    }
  }
  console.log('✅ Order rules seeded')

  console.log('\n🎉 Seed complete!')
  console.log('\nDemo users:')
  console.log('  Admin: admin@inshop.co.il / admin123')
  console.log('  Manager: manager@inshop.co.il / manager123')
  console.log('\nDemo supplier link: http://localhost:3000/supplier')
  console.log('Demo portal link: http://localhost:3000/portal')
  console.log('Demo scenarios: http://localhost:3000/admin/demo-scenarios')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { ExcelLegacyAdapter } from '@/adapters/legacy/ExcelLegacyAdapter'
import bcrypt from 'bcryptjs'
import { Decimal } from '@prisma/client/runtime/library'
import { DeliveryStatus, CreditStatus, PaymentStatus } from '@/domain/statuses'

const legacy = new ExcelLegacyAdapter()

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'reset') {
    // Delete all transactional data, keep master data
    await prisma.ledgerEntry.deleteMany()
    await prisma.paymentInvoice.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.creditInvoice.deleteMany()
    await prisma.creditRequestLine.deleteMany()
    await prisma.creditRequest.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.deliveryPhoto.deleteMany()
    await prisma.deliveryLine.deleteMany()
    await prisma.invoiceLine.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.delivery.deleteMany()
    await prisma.inventoryMovement.deleteMany()
    await prisma.inventoryCountLine.deleteMany()
    await prisma.inventoryCount.deleteMany()
    // Reset inventory to base
    await prisma.inventoryItem.updateMany({ data: { qty: 0 } })
    const deltas = await legacy.getInventoryDeltas()
    for (const d of deltas) {
      const branch = await prisma.branch.findUnique({ where: { code: d.branchCode } })
      const item = await prisma.item.findUnique({ where: { code: d.itemCode } })
      if (branch && item) await prisma.inventoryItem.update({ where: { branchId_itemId: { branchId: branch.id, itemId: item.id } }, data: { qty: { increment: d.qtyDelta } } })
    }
    return NextResponse.json({ ok: true, message: 'Demo data reset' })
  }

  if (body.action === 'seed_scenario') {
    const scenario = body.scenario
    const tnuva = await prisma.supplier.findUnique({ where: { code: 'TNUVA' } })
    const ramatGan = await prisma.branch.findUnique({ where: { code: 'RAMAT_GAN' } })
    const trustee = await prisma.trustee.findFirst({ where: { branch: { code: 'RAMAT_GAN' } } })

    if (!tnuva || !ramatGan) return NextResponse.json({ error: 'Master data missing — run seed first' }, { status: 422 })

    if (scenario === 'clean_delivery') {
      // Create a fully approved delivery with no shortage
      const milk = await prisma.item.findUnique({ where: { code: '7290012345678' } })
      const delivery = await prisma.delivery.create({
        data: {
          reference: `DEL-DEMO-CLEAN-${Date.now()}`,
          supplierId: tnuva.id,
          branchId: ramatGan.id,
          trusteeId: trustee?.id,
          status: DeliveryStatus.ADMIN_APPROVED,
          invoiceNumber: 'INV-TNV-12547',
          invoiceDate: '2026-06-18',
          invoiceTotal: new Decimal('4439.16'),
          supplierReportedAt: new Date(),
          trusteeCompletedAt: new Date(),
          adminApprovedAt: new Date(),
          deliveryLines: { create: [{ rawName: 'חלב תנובה 3% 1 ליטר', supplierItemCode: 'TN-10045', itemId: milk?.id, qtyInvoice: 240, qtyReceived: 240, qtyInventory: 240, unitPrice: new Decimal('5.4') }] },
        },
      })
      if (ramatGan && milk) {
        await prisma.inventoryItem.update({ where: { branchId_itemId: { branchId: ramatGan.id, itemId: milk.id } }, data: { qty: { increment: 240 } } })
      }
      return NextResponse.json({ delivery, message: 'תרחיש: אספקה תקינה ללא חוסרים' })
    }

    if (scenario === 'shortage_credit') {
      const milk = await prisma.item.findUnique({ where: { code: '7290012345678' } })
      const delivery = await prisma.delivery.create({
        data: {
          reference: `DEL-DEMO-SHORT-${Date.now()}`,
          supplierId: tnuva.id,
          branchId: ramatGan.id,
          trusteeId: trustee?.id,
          status: DeliveryStatus.CREDIT_REQUESTED,
          invoiceNumber: 'INV-TNV-12548',
          invoiceDate: '2026-06-18',
          invoiceTotal: new Decimal('4439.16'),
          supplierReportedAt: new Date(),
          trusteeCompletedAt: new Date(),
          adminApprovedAt: new Date(),
          deliveryLines: { create: [{ rawName: 'חלב תנובה 3% 1 ליטר', supplierItemCode: 'TN-10045', itemId: milk?.id, qtyInvoice: 240, qtyReceived: 216, qtyInventory: 216, unitPrice: new Decimal('5.4') }] },
        },
        include: { deliveryLines: true },
      })
      const creditRef = `CR-DEMO-${Date.now()}`
      const creditRequest = await prisma.creditRequest.create({
        data: {
          reference: creditRef,
          deliveryId: delivery.id,
          supplierId: tnuva.id,
          status: CreditStatus.SENT_TO_SUPPLIER,
          requestedAmount: new Decimal('152.93'),
          sentAt: new Date(),
          lines: { create: [{ deliveryLineId: delivery.deliveryLines[0].id, itemId: milk?.id, rawName: 'חלב תנובה 3% 1 ליטר', qtyInvoice: 240, qtyReceived: 216, qtyShortage: 24, unitPrice: new Decimal('5.4'), lineAmount: new Decimal('129.60') }] },
        },
      })
      return NextResponse.json({ delivery, creditRequest, message: 'תרחיש: חוסר 24 יח׳ חלב — דרישת זיכוי 152.93 ₪' })
    }

    if (scenario === 'payment_exact') {
      // Create approved delivery + credit + payment ready
      return NextResponse.json({ message: 'Use shortage_credit scenario first, then upload CN-TNV-80125.jpg as credit invoice, approve it, then create payment' })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const deliveries = await prisma.delivery.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { supplier: true, branch: true, creditRequest: true } })
  const credits = await prisma.creditRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { supplier: true } })
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { supplier: true } })
  return NextResponse.json({ deliveries, credits, payments })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(req: NextRequest) {
  const session = await getSession()
  const { searchParams } = new URL(req.url)
  const supplierId = searchParams.get('supplierId')
  if (!session && !supplierId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payments = await prisma.payment.findMany({
    where: { ...(supplierId && { supplierId }) },
    include: { supplier: true, paymentInvoices: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ payments })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  const supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId } })
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

  // Block if open (unresolved) credit requests unless override
  const openCredits = await prisma.creditRequest.findMany({
    where: { supplierId: body.supplierId, status: { in: ['requested', 'sent_to_supplier', 'supplier_uploaded'] } },
  })
  if (openCredits.length > 0 && !body.forceOverride) {
    return NextResponse.json({ error: 'OPEN_CREDIT_REQUEST', openCredits, message: 'יש דרישות זיכוי פתוחות. יש לאשר חריג.' }, { status: 422 })
  }

  // Auto-gather: all admin_approved deliveries not yet in a payment
  const approvedDeliveries = await prisma.delivery.findMany({
    where: { supplierId: body.supplierId, status: { in: ['admin_approved', 'credit_requested', 'closed'] }, invoiceTotal: { not: null } },
  })
  const alreadyPaidRaw = await prisma.paymentInvoice.findMany({ select: { deliveryId: true } })
  const alreadyPaid = alreadyPaidRaw
  const paidIds = new Set(alreadyPaid.map(p => p.deliveryId))
  const unpaidDeliveries = approvedDeliveries.filter(d => !paidIds.has(d.id))

  let grossAmount = new Decimal(0)
  const invoiceItems = []
  for (const d of unpaidDeliveries) {
    if (!d.invoiceTotal) continue
    grossAmount = grossAmount.add(d.invoiceTotal)
    invoiceItems.push({ deliveryId: d.id, invoiceAmount: d.invoiceTotal, creditOffset: new Decimal(0), netPaid: d.invoiceTotal })
  }

  // Auto-gather: all admin_approved credit requests not yet offset
  const approvedCreditRequests = await prisma.creditRequest.findMany({
    where: { supplierId: body.supplierId, status: 'admin_approved', approvedAmount: { not: null } },
  })
  let creditsOffset = new Decimal(0)
  for (const cr of approvedCreditRequests) {
    if (!cr.approvedAmount) continue
    creditsOffset = creditsOffset.add(cr.approvedAmount)
  }

  const netAmount = grossAmount.sub(creditsOffset)
  const reference = `PAY-${Date.now()}`

  const payment = await prisma.payment.create({
    data: {
      reference,
      supplierId: body.supplierId,
      status: 'ready_to_pay',
      grossAmount,
      creditsOffset,
      netAmount,
      paidAmount: new Decimal(0),
      balanceAmount: netAmount,
      ...(invoiceItems.length > 0 && { paymentInvoices: { create: invoiceItems } }),
    },
    include: { supplier: true, paymentInvoices: true },
  })

  // Mark credits as offset
  for (const cr of approvedCreditRequests) {
    await prisma.creditRequest.update({ where: { id: cr.id }, data: { status: 'offset_in_payment' } })
  }

  return NextResponse.json({ payment }, { status: 201 })
}

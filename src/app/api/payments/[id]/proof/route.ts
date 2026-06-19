import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'
import { MockInvoiceParserAdapter } from '@/adapters/invoice-parser/MockInvoiceParserAdapter'
import { PaymentStatus } from '@/domain/statuses'
import { Decimal } from '@prisma/client/runtime/library'

const parser = new MockInvoiceParserAdapter()

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payment = await prisma.payment.findUnique({ where: { id }, include: { paymentInvoices: true } })
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices')
  await mkdir(uploadDir, { recursive: true })
  const uniqueName = `${Date.now()}-${file.name}`
  await writeFile(path.join(uploadDir, uniqueName), buffer)
  const publicPath = `/uploads/invoices/${uniqueName}`

  const parsed = await parser.parseDocument(file.name, buffer)
  const paidAmount = parsed.paidAmount ? new Decimal(parsed.paidAmount) : new Decimal(0)
  const netAmount = payment.netAmount as Decimal

  let status: string
  const diff = paidAmount.sub(netAmount)
  if (diff.abs().lte(new Decimal('0.01'))) {
    status = PaymentStatus.PAID
  } else if (paidAmount.lt(netAmount)) {
    status = PaymentStatus.PARTIALLY_PAID
  } else {
    status = PaymentStatus.OVERPAID
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      paidAmount,
      balanceAmount: diff,
      status,
      paymentMethod: parsed.paymentMethod || null,
      paymentDate: parsed.paymentDate || null,
      proofFilePath: publicPath,
      proofOrigName: file.name,
      version: payment.version + 1,
    },
  })

  // Mark related credit requests as offset
  if (status === PaymentStatus.PAID || status === PaymentStatus.OVERPAID) {
    await prisma.creditRequest.updateMany({
      where: { delivery: { supplierId: payment.supplierId }, status: 'admin_approved' },
      data: { status: 'offset_in_payment' },
    })
    // Add ledger entries
    await prisma.ledgerEntry.create({
      data: { supplierId: payment.supplierId, paymentId: id, entryType: 'payment', amount: paidAmount, description: `תשלום ${payment.reference}` },
    })
  }

  await prisma.auditLog.create({
    data: { entityType: 'payment', entityId: id, action: 'PAYMENT_PROOF_UPLOADED', actorType: 'admin', after: JSON.stringify({ status, paidAmount, parsedAmount: parsed.paidAmount }) },
  })

  return NextResponse.json({ payment: updated, parsedResult: parsed, status })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { CreditStatus } from '@/domain/statuses'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json() // { approve: boolean, reason?: string, approvedAmount?: number }

  const credit = await prisma.creditRequest.findUnique({ where: { id }, include: { creditInvoices: true } })
  if (!credit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newStatus = body.approve ? CreditStatus.ADMIN_APPROVED : CreditStatus.ADMIN_REJECTED
  const approvedAmount = body.approvedAmount ? new Decimal(body.approvedAmount) : body.approve ? credit.requestedAmount : null

  const updated = await prisma.creditRequest.update({
    where: { id },
    data: { status: newStatus, approvedAmount: approvedAmount ?? undefined, rejectionReason: body.reason || null, adminReviewedAt: new Date(), version: credit.version + 1 },
  })

  // Update credit invoice status
  if (credit.creditInvoices.length > 0) {
    await prisma.creditInvoice.update({ where: { id: credit.creditInvoices[0].id }, data: { status: body.approve ? 'admin_approved' : 'admin_rejected', rejectionReason: body.reason || null } })
  }

  await prisma.auditLog.create({
    data: { entityType: 'credit_request', entityId: id, action: body.approve ? 'CREDIT_APPROVED' : 'CREDIT_REJECTED', actorType: 'admin', actorId: session.id, after: JSON.stringify({ status: newStatus, approvedAmount }), },
  })

  return NextResponse.json(updated)
}

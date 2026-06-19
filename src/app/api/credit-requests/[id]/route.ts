import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { CreditStatus } from '@/domain/statuses'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const credit = await prisma.creditRequest.findUnique({
    where: { id },
    include: { supplier: true, delivery: { include: { branch: true } }, lines: { include: { item: true } }, creditInvoices: true },
  })
  if (!credit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(credit)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const credit = await prisma.creditRequest.findUnique({ where: { id } })
  if (!credit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.creditRequest.update({
    where: { id },
    data: {
      status: body.status,
      ...(body.status === CreditStatus.SENT_TO_SUPPLIER && { sentAt: new Date() }),
      ...(body.rejectionReason && { rejectionReason: body.rejectionReason }),
      version: credit.version + 1,
    },
  })
  return NextResponse.json(updated)
}

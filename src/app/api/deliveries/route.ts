import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { DeliveryStatus } from '@/domain/statuses'

export async function GET(req: NextRequest) {
  const session = await getSession()
  const { searchParams } = new URL(req.url)
  const supplierId = searchParams.get('supplierId')
  const status = searchParams.get('status')
  const branchId = searchParams.get('branchId')
  // Portal: public read allowed when filtering by supplierId
  if (!session && !supplierId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deliveries = await prisma.delivery.findMany({
    where: {
      ...(status && { status }),
      ...(supplierId && { supplierId }),
      ...(branchId && { branchId }),
      NOT: { status: DeliveryStatus.DRAFT },
    },
    include: {
      supplier: true,
      branch: true,
      trustee: true,
      invoices: { where: { source: 'supplier' }, take: 1 },
      creditRequest: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(deliveries)
}

export async function POST(_req: NextRequest) {
  const reference = `DEL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  const delivery = await prisma.delivery.create({
    data: { reference, status: DeliveryStatus.DRAFT },
  })
  await prisma.auditLog.create({
    data: {
      entityType: 'delivery',
      entityId: delivery.id,
      action: 'CREATED',
      actorType: 'supplier',
      deliveryId: delivery.id,
      after: JSON.stringify({ status: DeliveryStatus.DRAFT, reference }),
    },
  })
  return NextResponse.json(delivery, { status: 201 })
}

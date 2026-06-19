import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { DeliveryStatus } from '@/domain/statuses'
import { notificationAdapter } from '@/adapters/notification/MockNotificationAdapter'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Version check is optional for submit; status check is the idempotency guard
  let body: { version?: number } = {}
  try { body = await req.json() } catch {}

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: { branch: true, trustee: true },
  })
  if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (body.version !== undefined && delivery.version !== body.version) {
    return NextResponse.json({ error: 'Version conflict' }, { status: 409 })
  }
  if (delivery.status !== DeliveryStatus.DRAFT) {
    return NextResponse.json({ error: 'Delivery already submitted' }, { status: 422 })
  }

  const updated = await prisma.delivery.update({
    where: { id },
    data: {
      status: DeliveryStatus.SUPPLIER_REPORTED,
      supplierReportedAt: new Date(),
      version: delivery.version + 1,
    },
  })

  await prisma.auditLog.create({
    data: {
      entityType: 'delivery',
      entityId: id,
      action: 'SUPPLIER_SUBMITTED',
      actorType: 'supplier',
      before: JSON.stringify({ status: DeliveryStatus.DRAFT }),
      after: JSON.stringify({ status: DeliveryStatus.SUPPLIER_REPORTED }),
      deliveryId: id,
    },
  })

  // Mock: notify trustee
  if (delivery.trustee?.phone) {
    await notificationAdapter.send({
      to: delivery.trustee.phone,
      type: 'whatsapp',
      message: `ספק דיווח אספקה חדשה לסניף ${delivery.branch?.name || ''}. קישור קבלה: http://localhost:3000/trustee/${id}`,
    })
  }

  return NextResponse.json(updated)
}

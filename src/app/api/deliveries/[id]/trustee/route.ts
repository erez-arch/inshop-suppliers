import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { DeliveryStatus } from '@/domain/statuses'
import { notificationAdapter } from '@/adapters/notification/MockNotificationAdapter'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const delivery = await prisma.delivery.findUnique({ where: { id }, include: { branch: true } })
  if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowedStatuses = [DeliveryStatus.SUPPLIER_REPORTED, DeliveryStatus.TRUSTEE_IN_PROGRESS]
  if (!allowedStatuses.includes(delivery.status as never)) {
    return NextResponse.json({ error: 'Invalid status for trustee action' }, { status: 422 })
  }

  if (body.action === 'update_line') {
    const line = await prisma.deliveryLine.findFirst({ where: { id: body.lineId, deliveryId: id } })
    if (!line) return NextResponse.json({ error: 'Line not found' }, { status: 404 })
    const updatedLine = await prisma.deliveryLine.update({
      where: { id: body.lineId },
      data: { qtyReceived: body.qtyReceived, isMissing: body.qtyReceived === 0, version: line.version + 1 },
    })
    return NextResponse.json({ line: updatedLine })
  }

  if (body.action === 'start') {
    const updated = await prisma.delivery.update({
      where: { id },
      data: { status: DeliveryStatus.TRUSTEE_IN_PROGRESS, version: delivery.version + 1 },
    })
    return NextResponse.json({ delivery: updated })
  }

  if (body.action === 'complete') {
    // Update received quantities from lines
    if (body.lines && Array.isArray(body.lines)) {
      for (const l of body.lines) {
        await prisma.deliveryLine.update({
          where: { id: l.id },
          data: { qtyReceived: l.qtyReceived, qtyInventory: l.qtyReceived, isMissing: l.qtyReceived === 0 },
        })
      }
    }

    const updated = await prisma.delivery.update({
      where: { id },
      data: { status: DeliveryStatus.TRUSTEE_COMPLETED, trusteeCompletedAt: new Date(), version: { increment: 1 } },
    })
    await prisma.auditLog.create({
      data: {
        entityType: 'delivery',
        entityId: id,
        action: 'TRUSTEE_COMPLETED',
        actorType: 'trustee',
        before: JSON.stringify({ status: delivery.status }),
        after: JSON.stringify({ status: DeliveryStatus.TRUSTEE_COMPLETED }),
        deliveryId: id,
      },
    })

    // Notify admin
    await notificationAdapter.send({
      to: 'admin',
      type: 'system',
      message: `נאמן השלים קבלת אספקה ${delivery.reference} בסניף ${delivery.branch?.name || ''}`,
    })

    return NextResponse.json({ delivery: updated })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

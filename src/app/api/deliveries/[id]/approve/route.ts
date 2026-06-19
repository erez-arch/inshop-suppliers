import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { DeliveryStatus } from '@/domain/statuses'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: { deliveryLines: { include: { item: true } }, branch: true, supplier: true },
  })
  if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (delivery.version !== body.version) return NextResponse.json({ error: 'Version conflict' }, { status: 409 })

  const validStatuses = [DeliveryStatus.TRUSTEE_COMPLETED, DeliveryStatus.ADMIN_REVIEW]
  if (!validStatuses.includes(delivery.status as never)) {
    return NextResponse.json({ error: `Cannot approve from status: ${delivery.status}` }, { status: 422 })
  }

  // Update admin inventory quantities from body.lines
  if (body.lines && Array.isArray(body.lines)) {
    for (const lineUpdate of body.lines) {
      await prisma.deliveryLine.update({
        where: { id: lineUpdate.id },
        data: { qtyInventory: lineUpdate.qtyInventory, adminOverrideReason: lineUpdate.reason || null },
      })
    }
  }

  // Determine if there are shortages
  const updatedLines = await prisma.deliveryLine.findMany({ where: { deliveryId: id } })
  const shortageLines = updatedLines.filter(l => l.qtyInventory < l.qtyInvoice)
  const hasShortage = shortageLines.length > 0

  // Update inventory for each approved line
  for (const line of updatedLines) {
    if (!delivery.branchId || !line.itemId) continue
    if (line.qtyInventory <= 0) continue
    await prisma.inventoryItem.upsert({
      where: { branchId_itemId: { branchId: delivery.branchId, itemId: line.itemId } },
      update: { qty: { increment: line.qtyInventory } },
      create: { branchId: delivery.branchId, itemId: line.itemId, qty: line.qtyInventory },
    })
    await prisma.inventoryMovement.create({
      data: { branchId: delivery.branchId, itemId: line.itemId, movementType: 'received', qtyDelta: line.qtyInventory, reference: delivery.reference, deliveryId: id, createdBy: session.id },
    })
  }

  // Create credit request if shortages exist
  let creditRequest = null
  if (hasShortage && delivery.supplierId) {
    const creditRef = `CR-${Date.now()}`
    let totalCredit = new Decimal(0)
    const creditLines = []

    for (const line of shortageLines) {
      const shortage = line.qtyInvoice - line.qtyInventory
      const unitPrice = line.unitPrice ?? new Decimal(0)
      const lineAmount = new Decimal(shortage).mul(unitPrice)
      totalCredit = totalCredit.add(lineAmount)
      creditLines.push({
        deliveryLineId: line.id,
        itemId: line.itemId,
        rawName: line.rawName,
        qtyInvoice: line.qtyInvoice,
        qtyReceived: line.qtyReceived,
        qtyShortage: shortage,
        unitPrice,
        lineAmount,
      })
    }

    creditRequest = await prisma.creditRequest.create({
      data: {
        reference: creditRef,
        deliveryId: id,
        supplierId: delivery.supplierId,
        requestedAmount: totalCredit,
        status: 'requested',
        lines: { create: creditLines },
      },
      include: { lines: true },
    })
  }

  const newStatus = hasShortage ? DeliveryStatus.CREDIT_REQUESTED : DeliveryStatus.ADMIN_APPROVED
  const updated = await prisma.delivery.update({
    where: { id },
    data: { status: newStatus, adminApprovedAt: new Date(), version: delivery.version + 1 },
  })

  await prisma.auditLog.create({
    data: { entityType: 'delivery', entityId: id, action: 'ADMIN_APPROVED', actorType: 'admin', actorId: session.id, before: JSON.stringify({ status: delivery.status }), after: JSON.stringify({ status: newStatus, hasShortage }), deliveryId: id },
  })

  return NextResponse.json({ delivery: updated, creditRequest })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { InventoryCountStatus } from '@/domain/statuses'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: { branch: true, lines: { include: { item: true }, orderBy: { item: { name: 'asc' } } } },
  })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(count)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const count = await prisma.inventoryCount.findUnique({ where: { id }, include: { lines: true } })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.action === 'start') {
    const updated = await prisma.inventoryCount.update({ where: { id }, data: { status: InventoryCountStatus.IN_PROGRESS, startedAt: new Date(), version: count.version + 1 } })
    return NextResponse.json(updated)
  }

  if (body.action === 'save_line') {
    const line = await prisma.inventoryCountLine.findFirst({ where: { id: body.lineId, countId: id } })
    if (!line) return NextResponse.json({ error: 'Line not found' }, { status: 404 })
    const updated = await prisma.inventoryCountLine.update({
      where: { id: body.lineId },
      data: { countedQty: body.countedQty, confirmed: true, version: line.version + 1 },
    })
    return NextResponse.json(updated)
  }

  if (body.action === 'complete') {
    const unconfirmed = count.lines.filter(l => !l.confirmed)
    if (unconfirmed.length > 0) {
      return NextResponse.json({ error: `יש ${unconfirmed.length} שורות שלא אושרו` }, { status: 422 })
    }
    // Apply count results to inventory
    for (const line of count.lines) {
      if (line.countedQty === null) continue
      const diff = line.countedQty - line.balanceAtStart
      await prisma.inventoryItem.update({
        where: { branchId_itemId: { branchId: count.branchId, itemId: line.itemId } },
        data: { qty: line.countedQty },
      })
      if (diff !== 0) {
        await prisma.inventoryMovement.create({
          data: { branchId: count.branchId, itemId: line.itemId, movementType: 'counted', qtyDelta: diff, reference: count.reference, countId: id, createdBy: session.id },
        })
      }
    }
    const updated = await prisma.inventoryCount.update({ where: { id }, data: { status: InventoryCountStatus.LOCKED, completedAt: new Date(), lockedAt: new Date(), version: count.version + 1 } })
    await prisma.auditLog.create({ data: { entityType: 'inventory_count', entityId: id, action: 'COUNT_COMPLETED', actorType: 'admin', actorId: session.id } })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

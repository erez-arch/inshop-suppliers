import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // { supplierId, supplierItemCode, supplierItemName, itemId, deliveryLineId? }

  const item = await prisma.item.findUnique({ where: { id: body.itemId } })
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  // Upsert mapping
  await prisma.supplierItemMapping.upsert({
    where: { supplierId_supplierItemCode: { supplierId: body.supplierId, supplierItemCode: body.supplierItemCode } },
    update: { itemId: body.itemId, mappedBy: session.id },
    create: { supplierId: body.supplierId, supplierItemCode: body.supplierItemCode, supplierItemName: body.supplierItemName, itemId: body.itemId, mappedBy: session.id },
  })

  // Update the delivery line if provided
  if (body.deliveryLineId) {
    const line = await prisma.deliveryLine.findUnique({ where: { id: body.deliveryLineId } })
    if (line) {
      await prisma.deliveryLine.update({ where: { id: body.deliveryLineId }, data: { itemId: body.itemId, version: line.version + 1 } })
    }
  }

  await prisma.auditLog.create({
    data: { entityType: 'supplier_item_mapping', entityId: body.supplierId, action: 'ITEM_MAPPED', actorType: 'admin', actorId: session.id, after: JSON.stringify({ supplierItemCode: body.supplierItemCode, itemId: body.itemId, itemCode: item.code }) },
  })

  return NextResponse.json({ ok: true, item }, { status: 201 })
}

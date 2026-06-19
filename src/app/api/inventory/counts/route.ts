import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { InventoryCountStatus } from '@/domain/statuses'
import { ExcelLegacyAdapter } from '@/adapters/legacy/ExcelLegacyAdapter'

const legacy = new ExcelLegacyAdapter()

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')

  const counts = await prisma.inventoryCount.findMany({
    where: { ...(branchId && { branchId }) },
    include: { branch: true, lines: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(counts)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  const branch = await prisma.branch.findUnique({ where: { id: body.branchId } })
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

  // Check legacy open invoices
  const legacyCheck = await legacy.checkLegacyInvoicesOpen(branch.code)
  const reference = `CNT-${Date.now()}`

  const count = await prisma.inventoryCount.create({
    data: {
      reference,
      branchId: body.branchId,
      status: legacyCheck.canProceed ? InventoryCountStatus.READY_TO_COUNT : InventoryCountStatus.WAITING_LEGACY_CLOSE,
      legacyCheckResult: JSON.stringify(legacyCheck),
      createdBy: session.id,
    },
  })

  if (legacyCheck.canProceed) {
    // Create count lines for all active items
    const items = await prisma.item.findMany({ where: { status: 'active', assortmentActive: true } })
    const currentBalances = await prisma.inventoryItem.findMany({ where: { branchId: body.branchId } })
    const balanceMap = Object.fromEntries(currentBalances.map(b => [b.itemId, b.qty]))

    await prisma.inventoryCountLine.createMany({
      data: items.map(item => ({ countId: count.id, itemId: item.id, balanceAtStart: balanceMap[item.id] || 0 })),
    })
  }

  return NextResponse.json(count, { status: 201 })
}

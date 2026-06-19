import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')

  const balances = await prisma.inventoryItem.findMany({
    where: { ...(branchId && { branchId }) },
    include: { branch: true, item: true },
    orderBy: [{ branch: { name: 'asc' } }, { item: { name: 'asc' } }],
  })
  return NextResponse.json(balances)
}

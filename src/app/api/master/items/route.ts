import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const items = await prisma.item.findMany({
    where: {
      status: 'active',
      ...(q && { OR: [{ name: { contains: q } }, { code: { contains: q } }, { barcode: { contains: q } }] }),
    },
    orderBy: { name: 'asc' },
    take: 50,
  })
  return NextResponse.json(items)
}

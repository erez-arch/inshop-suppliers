import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const supplierId = searchParams.get('supplierId')
  const status = searchParams.get('status')

  const credits = await prisma.creditRequest.findMany({
    where: {
      ...(supplierId && { supplierId }),
      ...(status && { status }),
    },
    include: {
      supplier: true,
      delivery: { include: { branch: true } },
      lines: { include: { item: true } },
      creditInvoices: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(credits)
}

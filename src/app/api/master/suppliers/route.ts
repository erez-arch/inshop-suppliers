import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const suppliers = await prisma.supplier.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } })
  return NextResponse.json(suppliers)
}

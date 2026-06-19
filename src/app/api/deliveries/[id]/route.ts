import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      supplier: true,
      branch: true,
      trustee: true,
      invoices: { include: { invoiceLines: true } },
      deliveryLines: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      photos: { orderBy: { createdAt: 'asc' } },
      creditRequest: { include: { lines: { include: { item: true } }, creditInvoices: true } },
    },
  })
  if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(delivery)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const delivery = await prisma.delivery.findUnique({ where: { id } })
  if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (delivery.version !== body.version) return NextResponse.json({ error: 'Version conflict' }, { status: 409 })

  const updated = await prisma.delivery.update({
    where: { id },
    data: {
      ...(body.supplierId !== undefined && { supplierId: body.supplierId }),
      ...(body.branchId !== undefined && { branchId: body.branchId }),
      ...(body.aiDetectedBranch !== undefined && { aiDetectedBranch: body.aiDetectedBranch }),
      ...(body.trusteeId !== undefined && { trusteeId: body.trusteeId }),
      ...(body.supplierName !== undefined && { supplierName: body.supplierName }),
      ...(body.supplierPhone !== undefined && { supplierPhone: body.supplierPhone }),
      ...(body.supplierNote !== undefined && { supplierNote: body.supplierNote }),
      ...(body.invoiceNumber !== undefined && { invoiceNumber: body.invoiceNumber }),
      ...(body.invoiceDate !== undefined && { invoiceDate: body.invoiceDate }),
      ...(body.invoiceTotal !== undefined && { invoiceTotal: body.invoiceTotal }),
      version: delivery.version + 1,
    },
  })
  return NextResponse.json(updated)
}

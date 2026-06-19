import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import DeliveryDetailClient from './DeliveryDetailClient'

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      supplier: true,
      branch: true,
      trustee: true,
      invoices: { include: { invoiceLines: true }, orderBy: { createdAt: 'asc' } },
      deliveryLines: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      photos: { orderBy: { createdAt: 'asc' } },
      creditRequest: { include: { lines: { include: { item: true } }, creditInvoices: true } },
    },
  })
  if (!delivery) notFound()

  const suppliers = await prisma.supplier.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } })
  const branches = await prisma.branch.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } })
  const trustees = await prisma.trustee.findMany({ where: { status: 'active' }, include: { branch: true } })
  const items = await prisma.item.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } })

  return <DeliveryDetailClient delivery={delivery as never} suppliers={suppliers} branches={branches} trustees={trustees} items={items} />
}

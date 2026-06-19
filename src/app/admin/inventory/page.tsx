import prisma from '@/lib/prisma'
import InventoryClient from './InventoryClient'

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    include: { item: true },
    orderBy: { item: { name: 'asc' } },
  })
  const counts = await prisma.inventoryCount.findMany({
    include: { branch: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  const branches = await prisma.branch.findMany({ where: { status: 'active' } })

  return <InventoryClient items={items as never} counts={counts as never} branches={branches} />
}

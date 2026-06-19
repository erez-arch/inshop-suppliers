import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CreditDetailClient from './CreditDetailClient'

export default async function CreditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const credit = await prisma.creditRequest.findUnique({
    where: { id },
    include: { supplier: true, delivery: { include: { branch: true } }, lines: { include: { item: true } }, creditInvoices: true },
  })
  if (!credit) notFound()
  return <CreditDetailClient credit={credit as never} />
}

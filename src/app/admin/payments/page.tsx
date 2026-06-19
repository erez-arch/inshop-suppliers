import prisma from '@/lib/prisma'
import PaymentsClient from './PaymentsClient'

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    include: { supplier: true, paymentInvoices: true },
    orderBy: { createdAt: 'desc' },
  })
  const suppliers = await prisma.supplier.findMany({ where: { status: 'active' } })
  const openCredits = await prisma.creditRequest.findMany({
    where: { status: 'admin_approved' },
    include: { supplier: true },
  })

  return <PaymentsClient payments={payments as never} suppliers={suppliers} openCredits={openCredits as never} />
}

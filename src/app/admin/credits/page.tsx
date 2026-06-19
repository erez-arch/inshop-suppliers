import prisma from '@/lib/prisma'
import { CREDIT_STATUS_LABELS } from '@/domain/statuses'
import Link from 'next/link'

export default async function CreditsPage() {
  const credits = await prisma.creditRequest.findMany({
    include: { supplier: true, delivery: { include: { branch: true } }, creditInvoices: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">דרישות זיכוי</h1>
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['מספר', 'ספק', 'סניף', 'סכום מבוקש', 'סכום מאושר', 'סטטוס', 'פעולות'].map(h => (
                <th key={h} className="px-4 py-3 text-right font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {credits.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{c.reference}</td>
                <td className="px-4 py-3 font-medium">{c.supplier.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.delivery.branch?.name || '—'}</td>
                <td className="px-4 py-3 font-bold text-red-600">₪{Number(c.requestedAmount).toFixed(2)}</td>
                <td className="px-4 py-3">{c.approvedAmount ? `₪${Number(c.approvedAmount).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.status === 'admin_approved' ? 'badge-green' : c.status === 'admin_rejected' ? 'badge-red' : 'badge-yellow'}`}>
                    {CREDIT_STATUS_LABELS[c.status] || c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/credits/${c.id}`} className="text-purple-600 font-medium text-xs hover:underline">פתח</Link>
                </td>
              </tr>
            ))}
            {credits.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400">אין דרישות זיכוי</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

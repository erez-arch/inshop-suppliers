import prisma from '@/lib/prisma'
import { DELIVERY_STATUS_LABELS } from '@/domain/statuses'
import Link from 'next/link'

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    supplier_reported: 'badge-blue',
    trustee_in_progress: 'badge-yellow',
    trustee_completed: 'badge-yellow',
    admin_review: 'badge-yellow',
    admin_approved: 'badge-green',
    credit_requested: 'badge-red',
    closed: 'badge-gray',
    draft: 'badge-gray',
  }
  return <span className={`badge ${colors[status] || 'badge-gray'}`}>{DELIVERY_STATUS_LABELS[status] || status}</span>
}

export default async function DeliveriesPage() {
  const deliveries = await prisma.delivery.findMany({
    where: { NOT: { status: 'draft' } },
    include: { supplier: true, branch: true, creditRequest: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">אספקות</h1>
        <a href="/supplier" target="_blank" className="btn-primary text-sm">+ דיווח ספק חדש</a>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['מספר', 'ספק', 'סניף', 'תאריך', 'סכום', 'סטטוס', 'זיכוי', 'פעולות'].map(h => (
                <th key={h} className="px-4 py-3 text-right font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deliveries.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">אין אספקות עדיין — <a href="/supplier" className="text-purple-600">צור אספקה חדשה</a></td></tr>
            )}
            {deliveries.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.reference}</td>
                <td className="px-4 py-3 font-medium">{d.supplier?.name || <span className="text-gray-400">לא מזוהה</span>}</td>
                <td className="px-4 py-3 text-gray-600">{d.branch?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{d.createdAt.toLocaleDateString('he-IL')}</td>
                <td className="px-4 py-3 font-medium">{d.invoiceTotal ? `₪${Number(d.invoiceTotal).toLocaleString('he-IL', { minimumFractionDigits: 2 })}` : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3">
                  {d.creditRequest && (
                    <Link href={`/admin/credits/${d.creditRequest.id}`} className="badge badge-red text-xs">
                      ₪{Number(d.creditRequest.requestedAmount).toFixed(2)}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/deliveries/${d.id}`} className="text-purple-600 font-medium text-xs hover:underline">פתח</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

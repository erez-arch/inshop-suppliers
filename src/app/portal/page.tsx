'use client'
import { useState, useEffect } from 'react'
import { CREDIT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/domain/statuses'

interface Delivery { id: string; reference: string; status: string; invoiceTotal?: number; invoiceNumber?: string; createdAt: string; branch?: { name: string } | null }
interface Credit { id: string; reference: string; status: string; requestedAmount: number; approvedAmount?: number }
interface Payment { id: string; reference: string; status: string; netAmount: number; paidAmount?: number }

export default function PortalPage() {
  const [supplierId, setSupplierId] = useState('')
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'deliveries' | 'credits' | 'payments'>('deliveries')

  useEffect(() => {
    fetch('/api/master/suppliers').then(r => r.json()).then(setSuppliers)
  }, [])

  async function loadData(sid: string) {
    if (!sid) return
    setLoading(true)
    const [dRes, cRes, pRes] = await Promise.all([
      fetch(`/api/deliveries?supplierId=${sid}`).then(r => r.json()),
      fetch(`/api/credit-requests?supplierId=${sid}`).then(r => r.json()),
      fetch(`/api/payments?supplierId=${sid}`).then(r => r.json()),
    ])
    setDeliveries(dRes.deliveries || dRes || [])
    setCredits(cRes.creditRequests || cRes || [])
    setPayments(pRes.payments || pRes || [])
    setLoading(false)
  }

  function handleSupplier(sid: string) {
    setSupplierId(sid)
    loadData(sid)
  }

  const statusColor = (s: string) => ({
    admin_approved: 'badge-green', paid: 'badge-green', closed: 'badge-gray',
    admin_rejected: 'badge-red', credit_requested: 'badge-red',
    supplier_reported: 'badge-blue', trustee_in_progress: 'badge-yellow',
    trustee_completed: 'badge-yellow', admin_review: 'badge-yellow', ready_to_pay: 'badge-blue',
    partially_paid: 'badge-yellow', overpaid: 'badge-red',
  }[s] || 'badge-gray')

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏪</span>
            <div>
              <div className="font-bold text-purple-800">INSHOP</div>
              <div className="text-xs text-gray-500">פורטל ספק</div>
            </div>
          </div>
          <a href="/supplier" className="btn-primary text-sm">+ דיווח אספקה</a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Supplier selector */}
        <div className="card mb-6">
          <h2 className="font-semibold mb-3">בחר ספק</h2>
          <div className="flex flex-wrap gap-2">
            {suppliers.map(s => (
              <button
                key={s.id}
                onClick={() => handleSupplier(s.id)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${supplierId === s.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-200 hover:border-purple-400'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {supplierId && (
          <>
            {loading && <div className="text-center py-8 text-gray-500">טוען...</div>}

            {!loading && (
              <>
                {/* Tabs */}
                <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
                  {(['deliveries', 'credits', 'payments'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white shadow text-purple-700' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                      {t === 'deliveries' ? `אספקות (${deliveries.length})` : t === 'credits' ? `זיכויים (${credits.length})` : `תשלומים (${payments.length})`}
                    </button>
                  ))}
                </div>

                {/* Deliveries */}
                {tab === 'deliveries' && (
                  <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b"><tr>{['מספר', 'סניף', 'מ׳ חשבונית', 'סכום', 'תאריך', 'סטטוס'].map(h => <th key={h} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {deliveries.map(d => (
                          <tr key={d.id}><td className="px-4 py-3 font-mono text-xs">{d.reference}</td><td className="px-4 py-3">{d.branch?.name || '—'}</td><td className="px-4 py-3">{d.invoiceNumber || '—'}</td><td className="px-4 py-3">{d.invoiceTotal ? `₪${Number(d.invoiceTotal).toFixed(2)}` : '—'}</td><td className="px-4 py-3 text-gray-500">{new Date(d.createdAt).toLocaleDateString('he-IL')}</td><td className="px-4 py-3"><span className={`badge ${statusColor(d.status)}`}>{d.status}</span></td></tr>
                        ))}
                        {deliveries.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">אין אספקות</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Credits */}
                {tab === 'credits' && (
                  <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b"><tr>{['מספר', 'מבוקש', 'מאושר', 'סטטוס'].map(h => <th key={h} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {credits.map(c => (
                          <tr key={c.id}><td className="px-4 py-3 font-mono text-xs">{c.reference}</td><td className="px-4 py-3 font-bold text-red-600">₪{Number(c.requestedAmount).toFixed(2)}</td><td className="px-4 py-3">{c.approvedAmount ? `₪${Number(c.approvedAmount).toFixed(2)}` : '—'}</td><td className="px-4 py-3"><span className={`badge ${statusColor(c.status)}`}>{CREDIT_STATUS_LABELS[c.status] || c.status}</span></td></tr>
                        ))}
                        {credits.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">אין זיכויים</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Payments */}
                {tab === 'payments' && (
                  <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b"><tr>{['מספר', 'נטו לתשלום', 'שולם', 'סטטוס'].map(h => <th key={h} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {payments.map(p => (
                          <tr key={p.id}><td className="px-4 py-3 font-mono text-xs">{p.reference}</td><td className="px-4 py-3 font-bold">₪{Number(p.netAmount).toFixed(2)}</td><td className="px-4 py-3">{p.paidAmount ? `₪${Number(p.paidAmount).toFixed(2)}` : '—'}</td><td className="px-4 py-3"><span className={`badge ${statusColor(p.status)}`}>{PAYMENT_STATUS_LABELS[p.status] || p.status}</span></td></tr>
                        ))}
                        {payments.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">אין תשלומים</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

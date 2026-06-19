'use client'
import { useState } from 'react'
import { PAYMENT_STATUS_LABELS } from '@/domain/statuses'

interface Payment { id: string; reference: string; status: string; supplier: { name: string }; grossAmount: number; creditsOffset: number; netAmount: number; paidAmount?: number; createdAt: string }
interface Credit { id: string; reference: string; requestedAmount: number; approvedAmount: number; supplier: { name: string; id: string } }

export default function PaymentsClient({ payments: initialPayments, suppliers, openCredits }: { payments: Payment[]; suppliers: Array<{ id: string; name: string }>; openCredits: Credit[] }) {
  const [payments, setPayments] = useState(initialPayments)
  const [showNew, setShowNew] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const supplierOpenCredits = openCredits.filter(c => c.supplier.id === supplierId)

  async function createPayment() {
    if (!supplierId) return
    setCreating(true)
    setErr('')
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId, forceOverride: false }),
    })
    const data = await res.json()
    if (res.ok) {
      setPayments(p => [data.payment, ...p])
      setShowNew(false)
      setSupplierId('')
      setMsg(`תשלום ${data.payment.reference} נוצר — ₪${Number(data.payment.netAmount).toFixed(2)}`)
    } else {
      setErr(data.error || 'שגיאה')
    }
    setCreating(false)
  }

  async function uploadProof(paymentId: string) {
    if (!proofFile) return
    setUploadingId(paymentId)
    const fd = new FormData()
    fd.append('file', proofFile)
    const res = await fetch(`/api/payments/${paymentId}/proof`, { method: 'POST', body: fd })
    if (res.ok) {
      const d = await res.json()
      setPayments(p => p.map(pay => pay.id === paymentId ? { ...pay, status: d.payment.status, paidAmount: d.payment.paidAmount } : pay))
      setProofFile(null)
      setMsg(`תשלום עודכן — סטטוס: ${PAYMENT_STATUS_LABELS[d.payment.status] || d.payment.status}`)
    } else { setErr('שגיאה בהעלאת הוכחת תשלום') }
    setUploadingId(null)
  }

  const statusColor = (s: string) => ({ paid: 'badge-green', ready_to_pay: 'badge-blue', partially_paid: 'badge-yellow', overpaid: 'badge-red', draft: 'badge-gray' }[s] || 'badge-gray')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">תשלומים</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ תשלום חדש</button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{err}</div>}

      {showNew && (
        <div className="card mb-6 border-purple-200">
          <h3 className="font-semibold mb-3">תשלום חדש לספק</h3>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="border rounded px-3 py-2 text-sm w-full mb-3">
            <option value="">בחר ספק...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {supplierOpenCredits.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-xs text-yellow-800">
              ⚠️ ישנ{supplierOpenCredits.length === 1 ? '' : 'ן'} {supplierOpenCredits.length} זיכוי{supplierOpenCredits.length > 1 ? 'ם' : ''} מאושר{supplierOpenCredits.length > 1 ? 'ים' : ''} ממתין — יקוזזו אוטומטית
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={createPayment} disabled={!supplierId || creating} className="btn-primary">{creating ? 'יוצר...' : 'צור תשלום'}</button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">ביטול</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['מספר', 'ספק', 'ברוטו', 'קיזוז', 'נטו', 'שולם', 'סטטוס', 'הוכחת תשלום'].map(h => <th key={h} className="px-4 py-3 text-right font-semibold text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                <td className="px-4 py-3 font-medium">{p.supplier.name}</td>
                <td className="px-4 py-3">₪{Number(p.grossAmount).toFixed(2)}</td>
                <td className="px-4 py-3 text-green-600">{p.creditsOffset > 0 ? `-₪${Number(p.creditsOffset).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3 font-bold">₪{Number(p.netAmount).toFixed(2)}</td>
                <td className="px-4 py-3">{p.paidAmount ? `₪${Number(p.paidAmount).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3"><span className={`badge ${statusColor(p.status)}`}>{PAYMENT_STATUS_LABELS[p.status] || p.status}</span></td>
                <td className="px-4 py-3">
                  {['ready_to_pay', 'partially_paid'].includes(p.status) && (
                    <div className="flex gap-1">
                      <input type="file" accept="image/*,.pdf" onChange={e => setProofFile(e.target.files?.[0] || null)} className="text-xs w-24 border rounded px-1 py-0.5" />
                      <button onClick={() => uploadProof(p.id)} disabled={!proofFile || uploadingId === p.id} className="btn-primary text-xs py-0.5 px-2">
                        {uploadingId === p.id ? '...' : 'העלה'}
                      </button>
                    </div>
                  )}
                  {p.status === 'paid' && <span className="text-green-600 text-xs">✓ שולם</span>}
                </td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-400">אין תשלומים</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

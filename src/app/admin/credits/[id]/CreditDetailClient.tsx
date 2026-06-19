'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CREDIT_STATUS_LABELS } from '@/domain/statuses'

export default function CreditDetailClient({ credit: initialCredit }: { credit: Record<string, unknown> }) {
  const [credit, setCredit] = useState(initialCredit)
  const [file, setFile] = useState<File | null>(null)
  const [approving, setApproving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const creditInvoices = (credit.creditInvoices as Array<Record<string, unknown>>) || []
  const lines = (credit.lines as Array<Record<string, unknown>>) || []
  const canApprove = ['supplier_uploaded'].includes(credit.status as string)
  const canUpload = ['requested', 'sent_to_supplier'].includes(credit.status as string)

  async function handleSend() {
    const res = await fetch(`/api/credit-requests/${credit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent_to_supplier' }),
    })
    if (res.ok) { const d = await res.json(); setCredit(p => ({ ...p, status: d.status })); setMsg('נשלח לספק') }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/credit-requests/${credit.id}/upload-invoice`, { method: 'POST', body: fd })
    if (res.ok) {
      const d = await res.json()
      setCredit(p => ({ ...p, creditInvoices: [...((p.creditInvoices as Array<unknown>) || []), d.creditInvoice], status: 'supplier_uploaded' }))
      setMsg(`הזיכוי הועלה — ${d.warnings?.length ? '⚠️ ' + d.warnings.map((w: { message?: string; type: string }) => w.message || w.type).join(', ') : 'תקין'}`)
      setFile(null)
    } else { setErr('שגיאה בהעלאה') }
    setUploading(false)
  }

  async function handleApprove(approve: boolean) {
    setApproving(true)
    const res = await fetch(`/api/credit-requests/${credit.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve, approvedAmount: approve && approvedAmount ? parseFloat(approvedAmount) : undefined, reason: rejectReason || undefined }),
    })
    if (res.ok) {
      const d = await res.json()
      setCredit(p => ({ ...p, status: d.status, approvedAmount: d.approvedAmount }))
      setMsg(approve ? 'הזיכוי אושר' : 'הזיכוי נדחה')
    } else { setErr('שגיאה') }
    setApproving(false)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/credits" className="text-purple-600 hover:underline text-sm">← זיכויים</Link>
        <h1 className="text-xl font-bold">{credit.reference as string}</h1>
        <span className={`badge ${credit.status === 'admin_approved' ? 'badge-green' : credit.status === 'admin_rejected' ? 'badge-red' : 'badge-yellow'}`}>
          {CREDIT_STATUS_LABELS[credit.status as string] || credit.status as string}
        </span>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{err}</div>}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card"><div className="text-xs text-gray-500">ספק</div><div className="font-semibold">{(credit.supplier as { name: string })?.name}</div></div>
        <div className="card"><div className="text-xs text-gray-500">סכום מבוקש</div><div className="font-bold text-red-600 text-xl">₪{Number(credit.requestedAmount as number).toFixed(2)}</div>
          {credit.approvedAmount != null && <div className="text-sm text-green-600">מאושר: ₪{Number(credit.approvedAmount as number).toFixed(2)}</div>}
        </div>
      </div>

      {/* Lines */}
      <div className="card mb-4 p-0 overflow-hidden">
        <div className="px-4 py-3 border-b"><h3 className="font-semibold text-sm">שורות חוסר</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{['פריט', 'בחשבונית', 'התקבל', 'חוסר', 'מחיר', 'סכום'].map(h => <th key={h} className="px-3 py-2 text-right text-xs text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {lines.map(l => (
              <tr key={l.id as string}>
                <td className="px-3 py-2">{(l.item as { name: string })?.name || l.rawName as string}</td>
                <td className="px-3 py-2 text-center">{l.qtyInvoice as number}</td>
                <td className="px-3 py-2 text-center">{l.qtyReceived as number}</td>
                <td className="px-3 py-2 text-center font-bold text-red-600">{l.qtyShortage as number}</td>
                <td className="px-3 py-2">₪{Number(l.unitPrice as number).toFixed(2)}</td>
                <td className="px-3 py-2 font-semibold">₪{Number(l.lineAmount as number).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload credit invoice */}
      {canUpload && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-3 text-sm">העלאת חשבונית זיכוי</h3>
          <div className="flex gap-3">
            <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="flex-1 text-sm border rounded px-3 py-2" />
            <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary text-sm">
              {uploading ? 'מעלה...' : 'העלה'}
            </button>
            <button onClick={handleSend} className="btn-secondary text-sm">שלח לספק</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">הספק יכול להעלות גם דרך הפורטל. ניתן גם להעלות כאן מטעמו.</p>
        </div>
      )}

      {/* Credit invoices */}
      {creditInvoices.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-3 text-sm">חשבוניות זיכוי שהועלו</h3>
          {creditInvoices.map(ci => (
            <div key={ci.id as string} className="flex items-center gap-3 p-3 border rounded-lg mb-2">
              <span className={`badge ${ci.status === 'admin_approved' ? 'badge-green' : ci.status === 'admin_rejected' ? 'badge-red' : 'badge-yellow'}`}>{ci.status as string}</span>
              <span className="text-sm">{ci.creditNumber as string || ci.originalName as string}</span>
              {ci.amount != null && <span className="font-semibold">₪{Number(ci.amount as number).toFixed(2)}</span>}
              {ci.filePath != null && <a href={ci.filePath as string} target="_blank" className="text-purple-600 text-xs">צפה</a>}
            </div>
          ))}
        </div>
      )}

      {/* Approve/Reject */}
      {canApprove && (
        <div className="card border-yellow-200 bg-yellow-50">
          <h3 className="font-semibold mb-3 text-sm">אישור / דחייה</h3>
          <div className="flex gap-2 mb-3">
            <input type="number" placeholder={`סכום לאישור (מבוקש: ${Number(credit.requestedAmount as number).toFixed(2)})`} value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} className="border rounded px-3 py-2 text-sm flex-1" />
          </div>
          <input type="text" placeholder="סיבת דחייה (אם רלוונטי)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="border rounded px-3 py-2 text-sm w-full mb-3" />
          <div className="flex gap-3">
            <button onClick={() => handleApprove(true)} disabled={approving} className="btn-primary">✓ אשר זיכוי</button>
            <button onClick={() => handleApprove(false)} disabled={approving} className="btn-secondary text-red-600">✕ דחה</button>
          </div>
        </div>
      )}
    </div>
  )
}

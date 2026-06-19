'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface DeliveryLine { id: string; item?: { name: string; code: string } | null; rawName: string; qtyInvoice: number; qtyReceived: number; unitPrice: number }
interface Delivery { id: string; reference: string; status: string; supplierName?: string; supplier?: { name: string } | null; branch?: { name: string } | null; invoiceTotal?: number; deliveryLines: DeliveryLine[] }

export default function TrusteePage() {
  const params = useParams()
  const id = params?.id as string
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [lineQtys, setLineQtys] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`/api/deliveries/${id}`)
      .then(r => r.json())
      .then(d => {
        setDelivery(d)
        const qtys: Record<string, number> = {}
        for (const l of (d.deliveryLines || [])) qtys[l.id] = l.qtyInvoice
        setLineQtys(qtys)
        setLoading(false)
      })
      .catch(() => { setErr('שגיאה בטעינת האספקה'); setLoading(false) })
  }, [id])

  async function startReceiving() {
    const res = await fetch(`/api/deliveries/${id}/trustee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', version: (delivery as unknown as { version: number })?.version }),
    })
    if (res.ok) { const d = await res.json(); setDelivery(d.delivery) }
  }

  async function handleComplete() {
    setSubmitting(true)
    setErr('')
    const lines = (delivery?.deliveryLines || []).map(l => ({ id: l.id, qtyReceived: lineQtys[l.id] ?? l.qtyInvoice }))
    const res = await fetch(`/api/deliveries/${id}/trustee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', lines, note, version: (delivery as unknown as { version: number })?.version }),
    })
    if (res.ok) {
      setDone(true)
    } else {
      const d = await res.json()
      setErr(d.error || 'שגיאה')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">טוען...</div>
  if (err && !delivery) return <div className="min-h-screen flex items-center justify-center text-red-500">{err}</div>
  if (!delivery) return <div className="min-h-screen flex items-center justify-center text-gray-500">אספקה לא נמצאה</div>

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-green-50" dir="rtl">
      <div className="card text-center py-10 px-8">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="font-bold text-xl mb-2 text-green-700">קבלה אושרה!</h2>
        <p className="text-sm text-gray-500">המשרד קיבל הודעה. תודה!</p>
      </div>
    </div>
  )

  const supplierName = delivery.supplier?.name || delivery.supplierName || '—'
  const isActive = ['supplier_reported', 'trustee_in_progress'].includes(delivery.status)
  const hasStarted = delivery.status === 'trustee_in_progress'

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚚</span>
          <div>
            <div className="font-bold text-gray-800 text-sm">קבלת סחורה</div>
            <div className="text-xs text-gray-500">{delivery.reference}</div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        <div className="card mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-gray-500">ספק</div><div className="font-medium">{supplierName}</div></div>
            <div><div className="text-xs text-gray-500">סניף</div><div className="font-medium">{delivery.branch?.name || '—'}</div></div>
            <div><div className="text-xs text-gray-500">סכום</div><div className="font-bold text-purple-700">{delivery.invoiceTotal ? `₪${Number(delivery.invoiceTotal).toLocaleString('he-IL')}` : '—'}</div></div>
          </div>
        </div>

        {err && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{err}</div>}

        {!hasStarted && isActive && (
          <div className="card mb-4 text-center">
            <p className="text-sm text-gray-600 mb-4">האספקה ממתינה לקבלה</p>
            <button onClick={startReceiving} className="btn-primary w-full">▶ התחל קבלת סחורה</button>
          </div>
        )}

        {hasStarted && (
          <>
            <div className="card mb-4 p-0 overflow-hidden">
              <div className="px-4 py-3 border-b font-semibold text-sm">פרטי מוצרים</div>
              <div className="divide-y divide-gray-50">
                {delivery.deliveryLines.map(line => {
                  const received = lineQtys[line.id] ?? line.qtyInvoice
                  const isLow = received < line.qtyInvoice
                  return (
                    <div key={line.id} className={`px-4 py-3 ${isLow ? 'bg-red-50' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-sm">{line.item?.name || line.rawName}</div>
                          <div className="text-xs text-gray-500">בחשבונית: {line.qtyInvoice} יח׳ | ₪{line.unitPrice}/יח׳</div>
                        </div>
                        {isLow && <span className="badge badge-red text-xs">חוסר: {line.qtyInvoice - received}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">התקבל:</span>
                        <button onClick={() => setLineQtys(p => ({ ...p, [line.id]: Math.max(0, received - 1) }))} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-lg">−</button>
                        <span className="font-bold text-xl w-10 text-center">{received}</span>
                        <button onClick={() => setLineQtys(p => ({ ...p, [line.id]: received + 1 }))} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-lg">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">הערות (אופציונלי)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="הערות על מצב הסחורה..." className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none" />
            </div>

            <button onClick={handleComplete} disabled={submitting} className="btn-primary w-full py-3 text-base">
              {submitting ? 'שולח...' : '✓ אשר קבלת סחורה'}
            </button>
          </>
        )}

        {delivery.status === 'trustee_completed' && (
          <div className="card text-center text-green-700">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-semibold">הקבלה הושלמה — ממתין לאישור משרד</p>
          </div>
        )}
      </div>
    </div>
  )
}

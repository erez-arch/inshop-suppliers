'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DELIVERY_STATUS_LABELS } from '@/domain/statuses'
import Link from 'next/link'

interface Props {
  delivery: Record<string, unknown>
  suppliers: Array<{ id: string; name: string; code: string }>
  branches: Array<{ id: string; name: string; code: string }>
  trustees: Array<{ id: string; name: string; branch?: { name: string } | null }>
  items: Array<{ id: string; name: string; code: string }>
}

export default function DeliveryDetailClient({ delivery: initialDelivery, suppliers, branches, trustees, items }: Props) {
  const router = useRouter()
  const [delivery, setDelivery] = useState<Record<string, unknown>>(initialDelivery)
  const [lineQtys, setLineQtys] = useState<Record<string, number>>(() => {
    const lines = (initialDelivery.deliveryLines as Array<{ id: string; qtyInventory: number }>) || []
    return Object.fromEntries(lines.map(l => [l.id, l.qtyInventory]))
  })
  const [mappingLine, setMappingLine] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const deliveryLines = (delivery.deliveryLines as Array<Record<string, unknown>>) || []
  const photos = (delivery.photos as Array<{ id: string; photoType: string; filePath: string; originalName?: string }>) || []
  const invoices = (delivery.invoices as Array<Record<string, unknown>>) || []
  const creditRequest = delivery.creditRequest as Record<string, unknown> | null
  const supplier = delivery.supplier as { id: string; name: string; code: string } | null
  const trusteeLink = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/trustee/${delivery.id}`

  async function handleApprove() {
    setApproving(true)
    setError('')
    const lines = deliveryLines.map(l => ({ id: l.id as string, qtyInventory: lineQtys[l.id as string] ?? (l.qtyInventory as number) }))
    const res = await fetch(`/api/deliveries/${delivery.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: delivery.version, lines }),
    })
    if (res.ok) {
      const data = await res.json()
      setDelivery(prev => ({ ...prev, status: data.delivery.status, version: data.delivery.version, creditRequest: data.creditRequest || prev.creditRequest }))
      setSuccess(`אושר! ${data.creditRequest ? `נוצרה דרישת זיכוי ₪${Number(data.creditRequest.requestedAmount).toFixed(2)}` : 'המלאי עודכן.'}`)
    } else {
      const err = await res.json()
      setError(err.error || 'שגיאה באישור')
    }
    setApproving(false)
  }

  async function handleMapItem(lineId: string) {
    if (!selectedItemId || !supplier) return
    const line = deliveryLines.find(l => l.id === lineId)
    const res = await fetch('/api/master/item-mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId: supplier.id, supplierItemCode: line?.supplierItemCode, supplierItemName: line?.rawName, itemId: selectedItemId, deliveryLineId: lineId }),
    })
    if (res.ok) {
      const data = await res.json()
      setDelivery(prev => ({
        ...prev,
        deliveryLines: (prev.deliveryLines as Array<Record<string, unknown>>).map(l => l.id === lineId ? { ...l, itemId: selectedItemId, item: data.item } : l),
      }))
      setMappingLine(null)
      setSelectedItemId('')
      setSuccess('פריט שויך בהצלחה — ישמר לפעם הבאה')
    }
  }

  const canApprove = ['trustee_completed', 'admin_review'].includes(delivery.status as string)

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/deliveries" className="text-purple-600 hover:underline text-sm">← אספקות</Link>
        <h1 className="text-xl font-bold">{delivery.reference as string}</h1>
        <span className={`badge ${delivery.status === 'admin_approved' ? 'badge-green' : delivery.status === 'credit_requested' ? 'badge-red' : 'badge-blue'}`}>
          {DELIVERY_STATUS_LABELS[delivery.status as string] || delivery.status as string}
        </span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500 mb-1">ספק</div>
          <div className="font-semibold">{(delivery.supplier as { name: string })?.name || <span className="text-red-500">לא מזוהה</span>}</div>
          <div className="text-xs text-gray-400 mt-1">{delivery.supplierName as string}</div>
          <div className="text-xs text-gray-400">{delivery.supplierPhone as string}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 mb-1">סניף</div>
          <div className="font-semibold">{(delivery.branch as { name: string })?.name || '—'}</div>
          {delivery.aiDetectedBranch != null && (delivery.aiDetectedBranch as string) !== (delivery.branch as { code: string })?.code && (
            <div className="badge badge-yellow text-xs mt-1">⚠️ AI זיהה: {delivery.aiDetectedBranch as string}</div>
          )}
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 mb-1">חשבונית</div>
          <div className="font-semibold">{delivery.invoiceNumber as string || '—'}</div>
          <div className="text-xs text-gray-400">{delivery.invoiceDate as string}</div>
          <div className="font-bold text-purple-700 mt-1">{delivery.invoiceTotal ? `₪${Number(delivery.invoiceTotal).toLocaleString('he-IL', { minimumFractionDigits: 2 })}` : '—'}</div>
        </div>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-3 text-sm">תמונות</h3>
          <div className="flex flex-wrap gap-3">
            {photos.map(p => (
              <a key={p.id} href={p.filePath} target="_blank" rel="noreferrer" className="block">
                <div className="border border-gray-200 rounded-lg p-2 text-center w-24">
                  <div className="text-2xl mb-1">📷</div>
                  <div className="text-xs text-gray-500 truncate">{p.photoType.replace(/_/g, ' ')}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Trustee link */}
      {delivery.status === 'supplier_reported' && (
        <div className="card mb-4 bg-blue-50 border-blue-200">
          <div className="text-sm font-semibold text-blue-800 mb-1">קישור לנאמן</div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-white px-2 py-1 rounded border flex-1 overflow-auto">{trusteeLink}</code>
            <button onClick={() => navigator.clipboard.writeText(trusteeLink)} className="btn-secondary text-xs py-1">העתק</button>
          </div>
        </div>
      )}

      {/* Delivery Lines */}
      {deliveryLines.length > 0 && (
        <div className="card mb-4 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm">שורות אספקה</h3>
            {canApprove && <span className="text-xs text-gray-500">ערוך כמות מלאי לפני אישור</span>}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['פריט', 'קוד ספק', 'כמות חשבונית', 'כמות שהתקבלה', 'כמות למלאי', 'מחיר יחידה', 'שיוך'].map(h => (
                  <th key={h} className="px-3 py-2 text-right text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deliveryLines.map(line => {
                const item = line.item as { name: string; code: string } | null
                const needsMapping = !item
                const isShortage = lineQtys[line.id as string] < (line.qtyInvoice as number)
                return (
                  <tr key={line.id as string} className={isShortage ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2">
                      {item ? (
                        <span className="font-medium">{item.name}</span>
                      ) : (
                        <span className="text-red-500 text-xs font-medium">⚠️ {line.rawName as string}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs">{line.supplierItemCode as string || '—'}</td>
                    <td className="px-3 py-2 text-center">{line.qtyInvoice as number}</td>
                    <td className="px-3 py-2 text-center">{line.qtyReceived as number}</td>
                    <td className="px-3 py-2">
                      {canApprove ? (
                        <input
                          type="number"
                          min={0}
                          value={lineQtys[line.id as string] ?? (line.qtyInventory as number)}
                          onChange={e => setLineQtys(p => ({ ...p, [line.id as string]: parseInt(e.target.value) || 0 }))}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                        />
                      ) : (
                        <span className={lineQtys[line.id as string] < (line.qtyInvoice as number) ? 'text-red-600 font-bold' : ''}>{line.qtyInventory as number}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {line.unitPrice ? `₪${Number(line.unitPrice).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {needsMapping && canApprove && (
                        mappingLine === line.id ? (
                          <div className="flex gap-1">
                            <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className="text-xs border rounded px-1 py-0.5 flex-1">
                              <option value="">בחר פריט...</option>
                              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
                            </select>
                            <button onClick={() => handleMapItem(line.id as string)} className="btn-primary text-xs py-0.5 px-2">שמור</button>
                            <button onClick={() => setMappingLine(null)} className="btn-secondary text-xs py-0.5 px-1">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setMappingLine(line.id as string)} className="badge badge-red text-xs cursor-pointer">שייך פריט</button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Invoice Results */}
      {invoices.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-3 text-sm">תוצאות AI</h3>
          {invoices.map((inv, i) => {
            const parsed = inv.aiRaw ? JSON.parse(inv.aiRaw as string) : null
            return (
              <div key={i} className="bg-purple-50 rounded-lg p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-purple text-xs">🤖 {inv.source as string}</span>
                  {parsed?.aiConfidence && <span className="text-xs text-gray-500">ביטחון: {Math.round((parsed.aiConfidence as number) * 100)}%</span>}
                </div>
                {parsed?.warnings?.length > 0 && parsed.warnings.map((w: { type: string; message: string }, wi: number) => (
                  <div key={wi} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800 mb-1">⚠️ {w.message || w.type}</div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Credit Request */}
      {creditRequest && (
        <div className="card mb-4 border-red-200 bg-red-50">
          <h3 className="font-semibold mb-2 text-red-700 text-sm">דרישת זיכוי</h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-red-700 text-lg">₪{Number((creditRequest as { requestedAmount: number }).requestedAmount).toFixed(2)}</span>
              <span className="text-xs text-gray-500 mr-2">סטטוס: {creditRequest.status as string}</span>
            </div>
            <Link href={`/admin/credits/${creditRequest.id}`} className="btn-primary text-xs py-1">פתח דרישת זיכוי</Link>
          </div>
        </div>
      )}

      {/* Actions */}
      {canApprove && (
        <div className="flex gap-3 mt-4">
          <button onClick={handleApprove} disabled={approving} className="btn-primary">
            {approving ? 'מאשר...' : '✓ אשר ועדכן מלאי'}
          </button>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState } from 'react'
import { INVENTORY_COUNT_STATUS_LABELS } from '@/domain/statuses'

interface InventoryItem { id: string; qty: number; item: { id: string; name: string; code: string; unit: string } }
interface Count { id: string; reference: string; status: string; branch: { name: string }; createdAt: string }
interface Branch { id: string; name: string }

export default function InventoryClient({ items, counts: initialCounts, branches }: { items: InventoryItem[]; counts: Count[]; branches: Branch[] }) {
  const [counts, setCounts] = useState(initialCounts)
  const [branchId, setBranchId] = useState('')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function createCount() {
    if (!branchId) return
    setCreating(true)
    const res = await fetch('/api/inventory/counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId }),
    })
    if (res.ok) {
      const d = await res.json()
      setCounts(p => [d.count, ...p])
      setMsg(`ספירת מלאי ${d.count.reference} נוצרה`)
      setBranchId('')
    } else {
      const d = await res.json()
      setErr(d.error || 'שגיאה')
    }
    setCreating(false)
  }

  const statusColor = (s: string) => ({
    waiting_legacy_close: 'badge-gray',
    ready_to_count: 'badge-blue',
    in_progress: 'badge-yellow',
    completed: 'badge-green',
    locked: 'badge-purple',
  }[s] || 'badge-gray')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">מלאי</h1>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{err}</div>}

      {/* Balances */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">יתרות מלאי נוכחיות</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map(inv => (
            <div key={inv.id} className={`rounded-lg p-3 border ${inv.qty <= 0 ? 'bg-red-50 border-red-200' : inv.qty < 10 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-sm font-semibold">{inv.item.name}</div>
              <div className="text-xs text-gray-500 mb-1">{inv.item.code}</div>
              <div className={`text-2xl font-bold ${inv.qty <= 0 ? 'text-red-600' : inv.qty < 10 ? 'text-yellow-600' : 'text-gray-800'}`}>
                {inv.qty}
              </div>
              <div className="text-xs text-gray-400">{inv.item.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Count */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-3">ספירת מלאי חדשה</h2>
        <div className="flex gap-3">
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="border rounded px-3 py-2 text-sm flex-1">
            <option value="">בחר סניף...</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={createCount} disabled={!branchId || creating} className="btn-primary">{creating ? 'יוצר...' : 'צור ספירה'}</button>
        </div>
        <p className="text-xs text-gray-400 mt-2">ספירה תיווצר אם אין חשבוניות פתוחות בלגאסי לסניף זה</p>
      </div>

      {/* Counts List */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">ספירות מלאי</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{['מספר', 'סניף', 'סטטוס', 'תאריך', 'פעולות'].map(h => <th key={h} className="px-4 py-3 text-right text-xs text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {counts.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{c.reference}</td>
                <td className="px-4 py-3">{c.branch.name}</td>
                <td className="px-4 py-3"><span className={`badge ${statusColor(c.status)}`}>{INVENTORY_COUNT_STATUS_LABELS[c.status] || c.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString('he-IL')}</td>
                <td className="px-4 py-3">
                  <a href={`/inventory/${c.id}`} target="_blank" className="text-purple-600 text-xs hover:underline">פתח ספירה</a>
                </td>
              </tr>
            ))}
            {counts.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">אין ספירות מלאי</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

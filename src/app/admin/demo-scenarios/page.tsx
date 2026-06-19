'use client'
import { useState } from 'react'

const SCENARIOS = [
  {
    id: 'clean_delivery',
    title: 'אספקה תקינה',
    description: 'ספק מדווח על אספקה ← נאמן מאשר ← אדמין מאשר ← מלאי מתעדכן',
    steps: [
      'העלה קובץ בשם INV-TNV-12547 (FileName: INV-TNV-12547.jpg)',
      'בחר סניף (אם מתבקש)',
      'הגש דוח לספק',
      'אדמין: פתח אספקה → שלח קישור נאמן',
      'נאמן: אשר קבלה',
      'אדמין: אשר → מלאי יתעדכן',
    ],
    color: 'border-green-200 bg-green-50',
    badge: 'badge-green',
  },
  {
    id: 'shortage_credit',
    title: 'חוסר → זיכוי',
    description: 'ספק מדווח → נאמן מדווח פחות מ-10 יחידות → אדמין מאשר → דרישת זיכוי נוצרת',
    steps: [
      'העלה INV-TNV-12547 בוויזארד ספק',
      'שלח לנאמן',
      'נאמן: ערוך כמות שהתקבלה (פחות מ-10)',
      'נאמן: השלם קבלה',
      'אדמין: אשר (שנה כמות מלאי לחוסר)',
      'דרישת זיכוי תיווצר אוטומטית',
      'ספק: העלה חשבונית זיכוי CN-TNV-80125',
      'אדמין: אשר זיכוי',
    ],
    color: 'border-red-200 bg-red-50',
    badge: 'badge-red',
  },
  {
    id: 'wrong_supplier',
    title: 'זיכוי ספק שגוי',
    description: 'חשבונית זיכוי CN-STR-70005 — ספק שגוי (STRAUSS במקום TNUVA)',
    steps: [
      'צור דרישת זיכוי עבור TNUVA',
      'העלה CN-STR-70005',
      'מערכת תאתר ⚠️ ספק שגוי',
    ],
    color: 'border-orange-200 bg-orange-50',
    badge: 'badge-yellow',
  },
  {
    id: 'partial_payment',
    title: 'תשלום חלקי',
    description: 'תשלום PAY-BANK-33002 — שולם פחות מהנדרש',
    steps: [
      'צור תשלום לספק',
      'העלה PAY-BANK-33002 כהוכחת תשלום',
      'סטטוס: "שולם חלקית"',
    ],
    color: 'border-blue-200 bg-blue-50',
    badge: 'badge-blue',
  },
]

export default function DemoScenariosPage() {
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState('')
  const [state, setState] = useState<Record<string, unknown> | null>(null)
  const [loadingState, setLoadingState] = useState(false)

  async function reset() {
    if (!confirm('האם לאפס את כל הנתונים העסקיים? (הזנת ה-seed תישמר)')) return
    setResetting(true)
    const res = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) })
    if (res.ok) { setMsg('✅ מערכת אופסה — מוכן לדמו') }
    else setMsg('❌ שגיאה באיפוס')
    setResetting(false)
  }

  async function loadState() {
    setLoadingState(true)
    const res = await fetch('/api/demo')
    if (res.ok) setState(await res.json())
    setLoadingState(false)
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">תרחישי Demo</h1>
        <div className="flex gap-3">
          <button onClick={loadState} disabled={loadingState} className="btn-secondary text-sm">{loadingState ? 'טוען...' : '📊 מצב מערכת'}</button>
          <button onClick={reset} disabled={resetting} className="btn-secondary text-sm text-red-600">{resetting ? 'מאפס...' : '🔄 אפס מערכת'}</button>
        </div>
      </div>

      {msg && <div className={`p-3 rounded mb-4 text-sm ${msg.includes('✅') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>{msg}</div>}

      {/* System state */}
      {state && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-3 text-sm">מצב מערכת נוכחי</h3>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            {Object.entries(state).filter(([k]) => k !== 'suppliers' && k !== 'branches').map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded p-2">
                <div className="font-bold text-xl text-purple-700">{String(v)}</div>
                <div className="text-xs text-gray-500">{k}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mock filenames */}
      <div className="card mb-6 border-purple-200">
        <h3 className="font-semibold mb-3 text-sm text-purple-700">📂 שמות קבצי Mock</h3>
        <p className="text-xs text-gray-500 mb-3">שמות הקבצים הבאים יחזירו תוצאות AI דטרמיניסטיות:</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {[
            ['INV-TNV-12547.jpg', 'חשבונית TNUVA — תקינה'],
            ['INV-TNV-12548.jpg', 'חשבונית TNUVA — ספק שגוי (STRAUSS)'],
            ['INV-TNV-12549.jpg', 'חשבונית TNUVA — מחיר חריג'],
            ['INV-STR-77821.jpg', 'חשבונית STRAUSS — תקינה'],
            ['CN-TNV-80125.jpg', 'זיכוי TNUVA — מדויק'],
            ['CN-TNV-80126.jpg', 'זיכוי TNUVA — סכום שגוי'],
            ['CN-STR-70005.jpg', 'זיכוי STRAUSS — ספק לא מתאים'],
            ['PAY-BANK-33001.jpg', 'תשלום מדויק'],
            ['PAY-BANK-33002.jpg', 'תשלום חלקי'],
            ['PAY-BANK-33003.jpg', 'יתר-תשלום'],
          ].map(([name, desc]) => (
            <div key={name} className="flex gap-2 items-start bg-gray-50 rounded p-2">
              <code className="text-purple-700 whitespace-nowrap">{name}</code>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-2 gap-4">
        {SCENARIOS.map(s => (
          <div key={s.id} className={`card border ${s.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${s.badge}`}>{s.title}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{s.description}</p>
            <ol className="space-y-1">
              {s.steps.map((step, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2">
                  <span className="font-bold text-gray-400 w-4 shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="card mt-6 border-blue-200 bg-blue-50">
        <h3 className="font-semibold mb-3 text-sm text-blue-700">קישורים לבדיקה</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <a href="/supplier" target="_blank" className="flex items-center gap-2 text-blue-600 hover:underline">📱 ויזארד ספק (ציבורי)</a>
          <a href="/portal" target="_blank" className="flex items-center gap-2 text-blue-600 hover:underline">🖥️ פורטל ספק/רואה חשבון</a>
          <a href="/admin/deliveries" className="flex items-center gap-2 text-blue-600 hover:underline">📦 אדמין — אספקות</a>
          <a href="/admin/credits" className="flex items-center gap-2 text-blue-600 hover:underline">📋 אדמין — זיכויים</a>
          <a href="/admin/payments" className="flex items-center gap-2 text-blue-600 hover:underline">💳 אדמין — תשלומים</a>
          <a href="/admin/inventory" className="flex items-center gap-2 text-blue-600 hover:underline">🏭 אדמין — מלאי</a>
        </div>
      </div>
    </div>
  )
}

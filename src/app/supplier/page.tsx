'use client'
import { useState, useEffect, useRef } from 'react'

type Step = 'upload' | 'branch' | 'photos' | 'contact' | 'done'

interface Branch { id: string; name: string; code: string }
interface ParsedResult { invoiceNumber?: string; supplierName?: string; total?: number; branchCode?: string; warnings?: Array<{ type: string; message?: string }>; needsManualReview?: boolean }

const STEPS: Step[] = ['upload', 'branch', 'photos', 'contact', 'done']
const STEP_LABELS = { upload: 'חשבונית', branch: 'סניף', photos: 'תמונות', contact: 'פרטים', done: 'אישור' }

export default function SupplierPage() {
  const [step, setStep] = useState<Step>('upload')
  const [branches, setBranches] = useState<Branch[]>([])
  const [deliveryId, setDeliveryId] = useState<string | null>(null)
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null)
  const [branchId, setBranchId] = useState('')
  const [dissonance, setDissonance] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<{ type: string; file: File }[]>([])
  const [supplierName, setSupplierName] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/master/branches').then(r => r.json()).then(setBranches)
  }, [])

  async function handleInvoiceUpload(file: File) {
    setLoading(true)
    setErr('')

    // Create draft delivery
    const draftRes = await fetch('/api/deliveries', { method: 'POST' })
    if (!draftRes.ok) { setErr('שגיאה ביצירת אספקה'); setLoading(false); return }
    const draftData = await draftRes.json()
    const did = draftData.id || draftData.delivery?.id
    if (!did) { setErr('שגיאה ביצירת אספקה'); setLoading(false); return }
    setDeliveryId(did)

    // Upload invoice for AI parsing
    const fd = new FormData()
    fd.append('file', file)
    fd.append('photoType', 'supplier_invoice')
    fd.append('deliveryId', did)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) { setErr('שגיאה בהעלאת החשבונית'); setLoading(false); return }
    const data = await res.json()
    const pr = data.parsedResult as ParsedResult
    setParsedResult(pr)

    // Auto-select branch from AI
    if (pr?.branchCode) {
      const matched = branches.find(b => b.code === pr.branchCode)
      if (matched) setBranchId(matched.id)
    }
    setStep('branch')
    setLoading(false)
  }

  function handleBranchNext() {
    if (!branchId) { setErr('יש לבחור סניף'); return }
    const selectedBranch = branches.find(b => b.id === branchId)
    if (parsedResult?.branchCode && selectedBranch && selectedBranch.code !== parsedResult.branchCode) {
      setDissonance(true)
    } else {
      setDissonance(false)
    }
    setErr('')
    setStep('photos')
  }

  async function handlePhotoAdd(file: File, type: string) {
    if (!deliveryId) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('deliveryId', deliveryId)
    fd.append('photoType', type)
    await fetch('/api/upload', { method: 'POST', body: fd })
    setPhotoFiles(p => [...p, { type, file }])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!deliveryId) return
    if (!supplierName || !supplierPhone) { setErr('יש למלא שם וטלפון'); return }
    setLoading(true)
    setErr('')

    // Fetch current delivery to get version
    const delRes = await fetch(`/api/deliveries/${deliveryId}`)
    const delData = await delRes.json()

    // Update delivery with contact info and branch
    const patchRes = await fetch(`/api/deliveries/${deliveryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierName, supplierPhone, branchId, version: delData.version }),
    })
    if (!patchRes.ok) { setErr('שגיאה בשמירת פרטים'); setLoading(false); return }

    const res = await fetch(`/api/deliveries/${deliveryId}/submit`, { method: 'POST' })
    if (res.ok) {
      setStep('done')
    } else {
      const d = await res.json()
      setErr(d.error || 'שגיאה בשליחה')
    }
    setLoading(false)
  }

  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">🏪</span>
        <div>
          <div className="font-bold text-purple-800 text-sm">INSHOP</div>
          <div className="text-xs text-gray-500">דיווח אספקה</div>
        </div>
      </div>

      {/* Progress */}
      {step !== 'done' && (
        <div className="bg-white border-b px-4 py-2">
          <div className="flex justify-between max-w-md mx-auto">
            {STEPS.filter(s => s !== 'done').map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < stepIdx ? 'bg-purple-600 text-white' : i === stepIdx ? 'bg-purple-800 text-white ring-2 ring-purple-300' : 'bg-gray-200 text-gray-500'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className="text-xs text-gray-500">{STEP_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto p-4">
        {err && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{err}</div>}

        {/* Step 1: Upload Invoice */}
        {step === 'upload' && (
          <div className="card mt-4">
            <h2 className="font-bold text-lg mb-1">העלאת חשבונית</h2>
            <p className="text-sm text-gray-500 mb-4">צלם או העלה את החשבונית שקיבלת</p>
            <div
              className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-2">📷</div>
              <div className="font-medium text-purple-700">לחץ לצילום / העלאה</div>
              <div className="text-xs text-gray-400 mt-1">JPG, PNG, PDF</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleInvoiceUpload(f) }} />
            {loading && <div className="text-center mt-4 text-purple-600 text-sm">מעבד חשבונית עם AI...</div>}
          </div>
        )}

        {/* Step 2: Branch */}
        {step === 'branch' && (
          <div className="card mt-4">
            <h2 className="font-bold text-lg mb-1">בחירת סניף</h2>
            {parsedResult && (
              <div className="bg-purple-50 rounded-lg p-3 mb-4 text-sm">
                <div className="font-medium text-purple-700 mb-1">🤖 זיהוי AI</div>
                {parsedResult.supplierName && <div>ספק: <strong>{parsedResult.supplierName}</strong></div>}
                {parsedResult.invoiceNumber && <div>מ׳ חשבונית: <strong>{parsedResult.invoiceNumber}</strong></div>}
                {parsedResult.total && <div>סכום: <strong>₪{parsedResult.total}</strong></div>}
                {parsedResult.branchCode && <div>סניף שזוהה: <strong>{parsedResult.branchCode}</strong></div>}
                {parsedResult.warnings?.map((w, i) => <div key={i} className="text-yellow-700 mt-1">⚠️ {w.message || w.type}</div>)}
                {parsedResult.needsManualReview && <div className="text-orange-600 mt-1">⚠️ נדרשת סקירה ידנית</div>}
              </div>
            )}
            {dissonance && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                ⚠️ שים לב: הסניף שנבחר שונה מהסניף שזוהה על ידי AI. ניתן להמשיך ולאשר חריג זה.
              </div>
            )}
            <p className="text-sm text-gray-500 mb-3">לאיזה סניף הגיעה האספקה?</p>
            <div className="space-y-2">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBranchId(b.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl border-2 transition-colors ${branchId === b.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
                >
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-gray-400 mr-2">({b.code})</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleBranchNext} className="btn-primary flex-1">המשך →</button>
              <button onClick={() => setStep('upload')} className="btn-secondary">← חזור</button>
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 'photos' && (
          <div className="card mt-4">
            <h2 className="font-bold text-lg mb-1">תמונות סחורה</h2>
            <p className="text-sm text-gray-500 mb-4">צלם את הסחורה שהגיעה (אופציונלי)</p>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${photoFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'}`}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.capture = 'environment'
                input.multiple = true
                input.onchange = e => {
                  const files = Array.from((e.target as HTMLInputElement).files || [])
                  files.forEach(f => handlePhotoAdd(f, 'goods'))
                }
                input.click()
              }}
            >
              {photoFiles.length > 0 ? (
                <>
                  <div className="text-4xl mb-2">✅</div>
                  <div className="font-medium text-green-700">{photoFiles.length} תמונה{photoFiles.length > 1 ? 'ות' : ''} נוספה</div>
                  <div className="text-xs text-gray-400 mt-1">לחץ להוספת עוד</div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">📷</div>
                  <div className="font-medium text-purple-700">לחץ לצילום הסחורה</div>
                  <div className="text-xs text-gray-400 mt-1">ניתן להעלות מספר תמונות</div>
                </>
              )}
            </div>
            {loading && <div className="text-center mt-3 text-purple-600 text-sm">מעלה...</div>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('contact')} className="btn-primary flex-1">המשך →</button>
              <button onClick={() => setStep('branch')} className="btn-secondary">← חזור</button>
            </div>
          </div>
        )}

        {/* Step 4: Contact */}
        {step === 'contact' && (
          <div className="card mt-4">
            <h2 className="font-bold text-lg mb-1">פרטי איש קשר</h2>
            <p className="text-sm text-gray-500 mb-4">מי מדווח על האספקה?</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם (חובה)</label>
                <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="שם הנהג / נציג הספק" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון (חובה)</label>
                <input type="tel" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} placeholder="050-0000000" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
              <div className="font-medium mb-1">סיכום:</div>
              {parsedResult?.supplierName && <div>ספק: {parsedResult.supplierName}</div>}
              <div>סניף: {branches.find(b => b.id === branchId)?.name || '—'}</div>
              {parsedResult?.total && <div>סכום: ₪{parsedResult.total}</div>}
              <div>תמונות: {photoFiles.length}</div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
                {loading ? 'שולח...' : '✓ שלח דוח אספקה'}
              </button>
              <button onClick={() => setStep('photos')} className="btn-secondary">← חזור</button>
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="card mt-4 text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-bold text-xl mb-2 text-green-700">הדוח נשלח בהצלחה!</h2>
            <p className="text-sm text-gray-500 mb-6">הנאמן והמשרד יקבלו הודעה. תודה!</p>
            <button onClick={() => { setStep('upload'); setDeliveryId(null); setParsedResult(null); setBranchId(''); setPhotoFiles([]); setSupplierName(''); setSupplierPhone('') }} className="btn-secondary text-sm">
              + דיווח אספקה נוספת
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

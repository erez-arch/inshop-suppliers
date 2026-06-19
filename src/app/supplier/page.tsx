'use client'
import { useState, useEffect, useRef } from 'react'

type Step = 'upload' | 'branch' | 'photos' | 'contact' | 'done'
type UploadState = 'idle' | 'analyzing' | 'unrecognized'

interface Branch { id: string; name: string; code: string }
interface ParsedResult {
  documentType?: string
  invoiceNumber?: string
  supplierName?: string
  total?: number
  branchCode?: string
  warnings?: Array<{ type: string; message?: string }>
  needsManualReview?: boolean
  aiConfidence?: number
}

const STEPS: Step[] = ['upload', 'branch', 'photos', 'contact', 'done']
const STEP_LABELS = { upload: 'חשבונית', branch: 'סניף', photos: 'תמונות', contact: 'פרטים', done: 'אישור' }

export default function SupplierPage() {
  const [step, setStep] = useState<Step>('upload')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/master/branches').then(r => r.json()).then(setBranches)
  }, [])

  useEffect(() => {
    if (uploadState === 'analyzing') {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [uploadState])

  async function handleInvoiceUpload(file: File) {
    const preview = URL.createObjectURL(file)
    setUploadedPreview(preview)
    setUploadState('analyzing')
    setErr('')

    try {
      // Create draft delivery
      const draftRes = await fetch('/api/deliveries', { method: 'POST' })
      if (!draftRes.ok) throw new Error('draft_failed')
      const draftData = await draftRes.json()
      const did = draftData.id || draftData.delivery?.id
      if (!did) throw new Error('no_id')
      setDeliveryId(did)

      // Upload invoice for AI parsing
      const fd = new FormData()
      fd.append('file', file)
      fd.append('photoType', 'supplier_invoice')
      fd.append('deliveryId', did)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })

      if (res.ok) {
        const data = await res.json()
        const pr = data.parsedResult as ParsedResult
        setParsedResult(pr)

        const recognized = pr?.documentType && pr.documentType !== 'unknown' && !pr.needsManualReview
        if (recognized) {
          // Auto-advance — AI recognized the invoice
          if (pr?.branchCode) {
            const matched = branches.find(b => b.code === pr.branchCode)
            if (matched) setBranchId(matched.id)
          }
          setUploadState('idle')
          setStep('branch')
        } else {
          // Not recognized — let user decide
          setUploadState('unrecognized')
        }
      } else {
        setUploadState('unrecognized')
      }
    } catch {
      setUploadState('unrecognized')
    }
  }

  function handleManualContinue() {
    setUploadState('idle')
    setStep('branch')
  }

  function handleReupload() {
    if (uploadedPreview) URL.revokeObjectURL(uploadedPreview)
    setUploadedPreview(null)
    setUploadState('idle')
    setParsedResult(null)
    setDeliveryId(null)
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

    const delRes = await fetch(`/api/deliveries/${deliveryId}`)
    const delData = await delRes.json()

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

            {/* Idle — show upload area */}
            {uploadState === 'idle' && (
              <>
                <p className="text-sm text-gray-500 mb-4">צלם או העלה את החשבונית שקיבלת</p>
                <label
                  htmlFor="invoice-file-input"
                  className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors block"
                >
                  <div className="text-4xl mb-2">📷</div>
                  <div className="font-medium text-purple-700">לחץ לצילום / העלאה</div>
                  <div className="text-xs text-gray-400 mt-1">JPG, PNG, PDF</div>
                </label>
                <input
                  id="invoice-file-input"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleInvoiceUpload(f) }}
                />
              </>
            )}

            {/* Analyzing — show image + timer */}
            {uploadState === 'analyzing' && (
              <div className="text-center py-2">
                {uploadedPreview && (
                  <div className="mb-4 relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedPreview}
                      alt="חשבונית"
                      className="max-h-48 max-w-full rounded-xl shadow-md object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-purple-900/10 rounded-xl" />
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl animate-spin">⏳</span>
                  <span className="font-medium text-purple-700">מנתח חשבונית עם AI</span>
                </div>
                <div className="text-gray-400 text-sm mb-3">{elapsed} שניות</div>
                <div className="flex justify-center gap-1">
                  {[0,1,2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unrecognized — show image + options */}
            {uploadState === 'unrecognized' && (
              <div className="text-center py-2">
                {uploadedPreview && (
                  <div className="mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedPreview}
                      alt="חשבונית"
                      className="max-h-48 max-w-full rounded-xl shadow-md object-contain mx-auto"
                    />
                  </div>
                )}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 text-sm text-right">
                  <div className="text-orange-700 font-medium mb-1">⚠️ החשבונית לא זוהתה אוטומטית</div>
                  <div className="text-gray-600">ניתן להמשיך ידנית או להעלות תמונה טובה יותר</div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleManualContinue} className="btn-primary flex-1">המשך ידני →</button>
                  <button onClick={handleReupload} className="btn-secondary">העלה מחדש</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Branch */}
        {step === 'branch' && (
          <div className="card mt-4">
            <h2 className="font-bold text-lg mb-1">בחירת סניף</h2>
            {parsedResult && (parsedResult.supplierName || parsedResult.invoiceNumber || parsedResult.total || parsedResult.branchCode) && (
              <div className="bg-purple-50 rounded-lg p-3 mb-4 text-sm">
                <div className="font-medium text-purple-700 mb-1">🤖 זיהוי AI</div>
                {parsedResult.supplierName && <div>ספק: <strong>{parsedResult.supplierName}</strong></div>}
                {parsedResult.invoiceNumber && <div>מ׳ חשבונית: <strong>{parsedResult.invoiceNumber}</strong></div>}
                {parsedResult.total && <div>סכום: <strong>₪{parsedResult.total}</strong></div>}
                {parsedResult.branchCode && <div>סניף שזוהה: <strong>{parsedResult.branchCode}</strong></div>}
                {parsedResult.warnings?.map((w, i) => <div key={i} className="text-yellow-700 mt-1">⚠️ {w.message || w.type}</div>)}
              </div>
            )}
            {dissonance && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                ⚠️ שים לב: הסניף שנבחר שונה מהסניף שזוהה על ידי AI
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
            <label
              htmlFor="goods-photo-input"
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors block ${photoFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'}`}
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
            </label>
            <input id="goods-photo-input" type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files || []).forEach(f => handlePhotoAdd(f, 'goods')) }} />
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
            <button onClick={() => {
              setStep('upload'); setUploadState('idle'); setUploadedPreview(null)
              setDeliveryId(null); setParsedResult(null); setBranchId('')
              setPhotoFiles([]); setSupplierName(''); setSupplierPhone('')
            }} className="btn-secondary text-sm">
              + דיווח אספקה נוספת
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

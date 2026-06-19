'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@inshop.co.il')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    if (res.ok) {
      router.push('/admin/deliveries')
    } else {
      setError('שם משתמש או סיסמה שגויים')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="card w-full max-w-sm p-8 shadow-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏪</div>
          <h1 className="text-2xl font-bold text-purple-800">INSHOP</h1>
          <p className="text-gray-500 text-sm mt-1">מערכת ניהול ספקים</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">דואר אלקטרוני</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2">
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
        <div className="mt-6 text-xs text-gray-400 text-center space-y-1">
          <p>ספק? <a href="/supplier" className="text-purple-600 font-medium">לדיווח אספקה</a></p>
          <p>נאמן? <a href="/portal" className="text-purple-600 font-medium">לפורטל ספק</a></p>
        </div>
      </div>
    </div>
  )
}

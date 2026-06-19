'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { SessionUser } from '@/lib/session'

const NAV_ITEMS = [
  { href: '/admin/deliveries', label: 'אספקות', icon: '📦' },
  { href: '/admin/credits', label: 'זיכויים', icon: '📋' },
  { href: '/admin/payments', label: 'תשלומים', icon: '💳' },
  { href: '/admin/inventory', label: 'מלאי', icon: '🏭' },
  { href: '/admin/order-rules', label: 'כללי הזמנה', icon: '📑' },
  { href: '/admin/demo-scenarios', label: 'תרחישי Demo', icon: '🧪' },
]

export default function AdminNav({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <nav className="fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm z-10">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏪</span>
          <div>
            <div className="font-bold text-purple-800 text-sm">INSHOP</div>
            <div className="text-xs text-gray-500">ניהול ספקים</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-purple-50 text-purple-700 font-semibold border-r-2 border-purple-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-500 mb-1">{user.displayName}</div>
        <div className="text-xs text-gray-400 mb-3">{user.email}</div>
        <div className="flex gap-2">
          <a href="/supplier" target="_blank" className="text-xs text-purple-600 hover:underline">ויזארד ספק</a>
          <span className="text-gray-300">|</span>
          <a href="/portal" target="_blank" className="text-xs text-purple-600 hover:underline">פורטל</a>
        </div>
        <button onClick={logout} className="mt-3 btn-secondary w-full text-xs py-1.5">התנתק</button>
      </div>
    </nav>
  )
}

import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  // Allow login page without auth
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <AdminNav user={session} />
      <main className="flex-1 mr-64 p-6 bg-gray-50">
        {children}
      </main>
    </div>
  )
}

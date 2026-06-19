import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'INSHOP ניהול ספקים',
  description: 'מערכת ניהול ספקים, אספקות, זיכויים ותשלומים',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}

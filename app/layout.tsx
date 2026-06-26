import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import ProgressBar from '@/components/layout/ProgressBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PagePilot — Admin',
  description: 'Manage pricing, upsells, and tracking for kill pages',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <ProgressBar />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

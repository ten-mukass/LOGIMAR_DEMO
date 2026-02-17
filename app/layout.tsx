import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/bottom-nav'
import { DemoBanner } from '@/components/demo-banner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Logimar Digital Suite (Prototype)',
  description: 'Prototype de démonstration pour la suite digitale Logimar',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <DemoBanner />
        {children}
        <BottomNav />
      </body>
    </html>
  )
}

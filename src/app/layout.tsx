import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'High Standards Jazz Radio - with George Fendel',
  description: 'Stream 28 years of curated jazz recordings from Portland\'s premier jazz radio show',
  keywords: ['jazz', 'radio', 'George Fendel', 'Portland', 'music', 'streaming'],
  authors: [{ name: 'George Fendel' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

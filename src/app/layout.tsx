// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './theme-styles.css'
import '../styles/styles/dashboard-styles.css'
import '../styles/styles/components-styles.css'
import '../styles/styles/mobile-fixes.css'
import '../styles/styles/sidebar-fixes.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LeadFlow',
  description: 'Lead management system',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} antialiased light-mode-only`} style={{ background: '#f8fafc', color: '#222' }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
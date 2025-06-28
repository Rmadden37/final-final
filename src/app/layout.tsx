// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './theme-styles.css' // Import theme styles directly
import { AuthProvider } from "@/hooks/use-auth"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LeadFlow',
  description: 'Lead management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
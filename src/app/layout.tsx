// src/app/layout.tsx (or app/layout.tsx)

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' // ← This import stays here
import { AuthProvider } from "@/hooks/use-auth";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Your App Name',
  description: 'Your app description',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Add this preload link for theme styles */}
        <link 
          rel="preload" 
          href="/styles/theme-styles.css" 
          as="style"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
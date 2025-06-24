
import type {Metadata} from "next";
import React from "react";
import {AuthProvider} from "@/hooks/use-auth";
import {Toaster} from "@/components/ui/toaster";
import {ThemeProvider} from "@/components/theme-provider";
import { Inter } from "next/font/google";
import "./globals.css";
import { BadgeServiceInitializer } from "@/components/badge-service-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LeadFlow",
  description: "Solar Sales Lead History",
  icons: {
    icon: [
      { url: 'https://imgur.com/oujPvCe', type: 'image/png' },
      { url: 'https://imgur.com/oujPvCe', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: 'https://imgur.com/oujPvCe', type: 'image/png' },
    ],
    shortcut: 'https://imgur.com/oujPvCe',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* MS Tile Icons */}
        <meta name="msapplication-TileImage" content="https://imgur.com/oujPvCe" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
      </head>
      <body className={`${inter.className} font-body antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'premium', 'system']}
        >
          <AuthProvider>
            <BadgeServiceInitializer />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

'use client';

import React, { useEffect } from "react";
import {AuthProvider} from "@/hooks/use-auth";
import {Toaster} from "@/components/ui/toaster";
import {ThemeProvider} from "@/components/theme-provider";
import { Inter } from "next/font/google";
import "./globals.css";
import { BadgeServiceInitializer } from "@/components/badge-service-initializer";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    const setHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setHeight();
    window.addEventListener('resize', setHeight);
    return () => window.removeEventListener('resize', setHeight);
  }, []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LeadFlow" />
        
        {/* MS Tile Icons */}
        <meta name="msapplication-TileImage" content="https://imgur.com/oujPvCe" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
      </head>
      <body className={`${inter.className} font-body antialiased bg-background text-foreground min-h-screen`}>
        <div
          className="min-h-screen flex flex-col"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
            minHeight: '100dvh',
          }}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            themes={['light', 'dark', 'premium', 'system']}
          >
            <AuthProvider>
              <BadgeServiceInitializer />
              <div className="fixed inset-0 flex items-center justify-center bg-white overflow-hidden z-[100]" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
                <div className="w-full max-w-md p-4 relative">
                  {/* Your lead form with date input here */}
                  <input type="date" className="block w-full border rounded p-2 mb-4" />
                  {/* Example calendar popup (should be conditionally rendered in real use) */}
                  <div className="absolute z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white shadow-lg rounded-lg p-4 w-80">
                    {/* Calendar month UI */}
                    <div className="text-center font-semibold mb-2">June 2025</div>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                      {/* ...days... */}
                    </div>
                  </div>
                </div>
              </div>
              {children}
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}

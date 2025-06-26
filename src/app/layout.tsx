'use client';

import React, { useEffect } from "react";
import {AuthProvider} from "@/hooks/use-auth";
import {Toaster} from "@/components/ui/toaster";
import {ThemeProvider} from "@/components/theme-provider";
import { Inter } from "next/font/google";
import "./globals.css";
import { BadgeServiceInitializer } from "@/components/badge-service-initializer";
import Head from "next/head";

const inter = Inter({ subsets: ["latin"] });

// Error Boundary to catch React errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 React Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary Details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <html lang="en">
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Error - LeadFlow</title>
          </head>
          <body className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
              <p className="text-muted-foreground mb-4">React Error: {this.state.error?.message}</p>
              <button 
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-primary text-primary-foreground rounded"
              >
                Try again
              </button>
            </div>
          </body>
        </html>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Add global error handlers
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Global JavaScript Error:', event.error);
      if (event.error?.message?.includes('useReducer')) {
        console.error('🚨 useReducer error detected:', event.error);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const setHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setHeight();
    window.addEventListener('resize', setHeight);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('resize', setHeight);
    };
  }, []);

  return (
    <ErrorBoundary>
      <html lang="en" suppressHydrationWarning>
        <Head>
          {/* PWA Manifest */}
          <link rel="manifest" href="/manifest.json" />
          
          {/* Viewport and Mobile Optimization */}
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          
          {/* Theme Colors */}
          <meta name="theme-color" content="#2DD4BF" />
          <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0F1419" />
          
          {/* Apple iOS App Icon Configuration */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="LeadFlow" />
          
          {/* Apple Touch Icon for all iOS devices (PNG only) */}
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon.png" />
          
          {/* Standard Favicon */}
          <link rel="icon" type="image/svg+xml" href="/app-icon.svg" />
          <link rel="icon" type="image/svg+xml" sizes="32x32" href="/app-icon.svg" />
          <link rel="icon" type="image/svg+xml" sizes="16x16" href="/app-icon.svg" />
          
          {/* MS Tile Icons for Windows */}
          <meta name="msapplication-TileImage" content="/app-icon.svg" />
          <meta name="msapplication-TileColor" content="#2DD4BF" />
          <meta name="msapplication-config" content="/browserconfig.xml" />
          
          {/* PWA App Name */}
          <meta name="application-name" content="LeadFlow" />
        </Head>
        <body className={`${inter.className} font-body antialiased bg-background text-foreground min-h-screen`}>
          <div
            className="min-h-screen flex flex-col"
            style={{
              paddingBlockStart: 'env(safe-area-inset-top)',
              paddingBlockEnd: 'env(safe-area-inset-bottom)',
              paddingInlineStart: 'env(safe-area-inset-left)',
              paddingInlineEnd: 'env(safe-area-inset-right)',
              minBlockSize: '100dvh',
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
                {children}
                <Toaster />
              </AuthProvider>
            </ThemeProvider>
          </div>
        </body>
      </html>
    </ErrorBoundary>
  );
}

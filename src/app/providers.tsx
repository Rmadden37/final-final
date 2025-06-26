'use client';

import React, { useEffect } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { BadgeServiceInitializer } from "@/components/badge-service-initializer";

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
        <div className="min-h-screen flex items-center justify-center bg-background">
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
        </div>
      );
    }

    return this.props.children;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
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

    // Set viewport height CSS variable
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
    </ErrorBoundary>
  );
}
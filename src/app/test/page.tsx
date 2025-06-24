'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [mounted, setMounted] = useState(false);
  const [reactWorks, setReactWorks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      console.log('✅ React hooks are working properly');
      setMounted(true);
      setReactWorks(true);
    } catch (err) {
      console.error('❌ React hooks error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading React Test...</h1>
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-8">React Diagnostic Test</h1>
        
        <div className="space-y-6">
          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">React Hooks Status</h2>
            <div className="space-y-2">
              <p className="text-sm">
                useState: <span className={reactWorks ? "text-green-600" : "text-red-600"}>
                  {reactWorks ? "✅ Working" : "❌ Not Working"}
                </span>
              </p>
              <p className="text-sm">
                useEffect: <span className={mounted ? "text-green-600" : "text-red-600"}>
                  {mounted ? "✅ Working" : "❌ Not Working"}
                </span>
              </p>
              {error && (
                <p className="text-sm text-red-600">
                  Error: {error}
                </p>
              )}
            </div>
          </div>

          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
            <div className="space-y-2">
              <p className="text-sm">Window: {typeof window !== 'undefined' ? "✅ Available" : "❌ Not Available"}</p>
              <p className="text-sm">React Hooks: {typeof useState === 'function' ? "✅ Loaded" : "❌ Not Loaded"}</p>
              <p className="text-sm">Hydrated: {mounted ? "✅ Yes" : "❌ No"}</p>
              <p className="text-sm">Current time: {new Date().toISOString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => {
                try {
                  alert('Button click works! React event handlers are functioning.');
                } catch (err) {
                  console.error('Button click error:', err);
                  alert('Button click failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                }
              }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Test Button Click
            </button>

            <div className="flex gap-4 justify-center">
              <a 
                href="/dashboard" 
                className="px-4 py-2 text-primary hover:underline border border-primary rounded-lg"
              >
                Go to Dashboard
              </a>
              <a 
                href="/login" 
                className="px-4 py-2 text-primary hover:underline border border-primary rounded-lg"
              >
                Go to Login
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Original Test Message</h3>
          <p className="text-sm">If you can see this, Next.js is working!</p>
        </div>
      </div>
    </div>
  );
}

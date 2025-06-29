"use client";

import { useState } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const toast = (options: ToastOptions) => {
    console.log('Toast:', options.title, options.description);
    // Simple implementation - you can enhance this later
    setToasts(prev => [...prev, options]);
    
    // Auto-remove after specified duration or 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, options.duration || 3000);
  };

  return { toast, toasts };
}
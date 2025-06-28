// FILE: src/hooks/use-toast.ts - Simple fallback toast hook
"use client";

import { useState } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const toast = (options: ToastOptions) => {
    console.log('Toast:', options.title, options.description);
    // You can implement a proper toast system later
    setToasts(prev => [...prev, options]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 3000);
  };

  return { toast, toasts };
}

// FILE: src/components/theme-toggle.tsx - Simple theme toggle fallback
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    // You can implement proper theme switching later
    document.documentElement.classList.toggle('dark');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start"
    >
      {isDark ? (
        <Sun className="h-4 w-4 mr-2" />
      ) : (
        <Moon className="h-4 w-4 mr-2" />
      )}
      Theme
    </Button>
  );
}

// FILE: src/components/dashboard/availability-toggle.tsx - Simple availability toggle
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Power, PowerOff } from 'lucide-react';

export default function AvailabilityToggle() {
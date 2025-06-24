"use client";

import { useEffect } from 'react';
import { BadgeService } from '@/lib/badge-service';

export function BadgeServiceInitializer() {
  useEffect(() => {
    // Initialize badge service on app startup
    BadgeService.initialize();
    BadgeService.handleVisibilityChange();
  }, []);

  return null; // This component doesn't render anything
}

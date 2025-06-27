'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

// iOS PWA Transition Detection and Handling
class IOSTokenMigration {
  // Detect if we're transitioning from Safari to PWA
  static async detectTransition(): Promise<{
    isTransition: boolean;
    fromSafari: boolean;
    toPWA: boolean;
    needsNewToken: boolean;
  }> {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  // @ts-ignore
                  window.navigator.standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Check if we have a previous Safari session stored
    const safariSessionData = localStorage.getItem('safari_session_data');
    const isFirstPWALoad = isPWA && !localStorage.getItem('pwa_initialized');
    
    return {
      isTransition: isIOS && isPWA && safariSessionData !== null && isFirstPWALoad,
      fromSafari: safariSessionData !== null,
      toPWA: isPWA,
      needsNewToken: isIOS && isPWA
    };
  }

  // Store Safari session data before PWA installation
  static storeSafariSession(userId: string, userData: any) {
    const safariData = {
      userId,
      userData,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    localStorage.setItem('safari_session_data', JSON.stringify(safariData));
    console.log('Safari session data stored for PWA transition');
  }

  // Handle the transition when PWA launches for first time
  static async handlePWATransition(userId: string): Promise<string | null> {
    try {
      const transition = await this.detectTransition();
      
      if (!transition.isTransition) {
        console.log('No Safari->PWA transition detected');
        return null;
      }

      console.log('Safari->PWA transition detected, will need new FCM token...');

      // Mark PWA as initialized
      localStorage.setItem('pwa_initialized', 'true');
      localStorage.setItem('pwa_install_date', new Date().toISOString());

      // Clean up Safari session data
      localStorage.removeItem('safari_session_data');

      return 'transition_detected';
    } catch (error) {
      console.error('Error handling PWA transition:', error);
      return null;
    }
  }
}

// Track Safari sessions for transition
export function trackSafariSession(userId: string, userData: any) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
               // @ts-ignore
               window.navigator.standalone === true;

  // Only track if we're in Safari on iOS (not already PWA)
  if (isIOS && !isPWA) {
    IOSTokenMigration.storeSafariSession(userId, userData);
  }
}

// Hook to use in your main app component
export function useIOSPWADetection() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    const checkPWATransition = async () => {
      // Check if this is a first-time PWA load after Safari
      const transition = await IOSTokenMigration.detectTransition();
      
      if (transition.isTransition) {
        console.log('First PWA launch detected, handling transition...');
        await IOSTokenMigration.handlePWATransition(user.uid);
      } else if (transition.toPWA && !localStorage.getItem('pwa_initialized')) {
        // First time PWA load (not from Safari transition)
        localStorage.setItem('pwa_initialized', 'true');
        localStorage.setItem('pwa_install_date', new Date().toISOString());
      }
    };

    // Small delay to ensure everything is loaded
    setTimeout(checkPWATransition, 1000);
  }, [user?.uid]);
}

// Main iOS PWA Handler Component
export function IOSPWAHandler() {
  const { user } = useAuth();
  
  // Handle iOS PWA transition automatically
  useIOSPWADetection();
  
  // Track Safari sessions for transition
  useEffect(() => {
    if (user?.uid) {
      trackSafariSession(user.uid, { 
        role: user.role,
        teamId: user.teamId 
      });
    }
  }, [user]);

  return null; // This component doesn't render anything
}
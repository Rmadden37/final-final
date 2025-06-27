import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

// Type declarations for Badge API
declare global {
  interface Navigator {
    setAppBadge?: (count: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
    standalone?: boolean;
  }
}

// Enhanced badge management with iOS support
function setBadge(count: number) {
  try {
    if (navigator.setAppBadge) {
      navigator.setAppBadge(count);
    } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Fallback for iOS: use service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_BADGE',
        count: count
      });
    }
  } catch (error) {
    console.warn('Badge setting failed:', error);
  }
}

function clearBadge() {
  try {
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge();
    } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Fallback for iOS: use service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_BADGE'
      });
    }
  } catch (error) {
    console.warn('Badge clearing failed:', error);
  }
}

// iOS detection utilities
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         navigator.standalone === true;
}

function isIOSPushSupported(): boolean {
  if (!isIOS()) return true;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (!match) return false;
  
  const majorVersion = parseInt(match[1]);
  const minorVersion = parseInt(match[2]);
  
  return majorVersion > 16 || (majorVersion === 16 && minorVersion >= 4);
}

export function usePushNotifications(userId?: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!app) return;

    // Check iOS compatibility
    if (isIOS()) {
      if (!isIOSPushSupported()) {
        console.warn('iOS version does not support web push notifications');
        return;
      }
      
      if (!isPWA()) {
        console.warn('iOS notifications require PWA installation');
        return;
      }
    }

    const messaging = getMessaging(app);

    // Enhanced permission and token handling
    const setupNotifications = async () => {
      try {
        const permission = await Notification.requestPermission();
        
        if (permission === "granted") {
          const currentToken = await getToken(messaging, { 
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
          });
          
          if (currentToken) {
            console.log("FCM token:", currentToken);
            
            // Save token to Firestore with context information
            if (userId) {
              await setDoc(doc(db, 'userTokens', userId), {
                fcmToken: currentToken,
                userId: userId,
                context: isPWA() ? 'pwa' : 'browser',
                platform: isIOS() ? 'ios' : 'other',
                userAgent: navigator.userAgent,
                updatedAt: new Date(),
                enabled: true,
                ...(isPWA() && { pwaMode: true }),
                ...(isIOS() && { 
                  iosVersion: navigator.userAgent.match(/OS (\d+)_(\d+)/)?.[0] 
                })
              }, { merge: true });
              
              console.log('FCM token saved to Firestore with context');
            }
          } else {
            console.warn('No FCM token available');
          }
        } else {
          console.warn('Notification permission denied');
        }
      } catch (err) {
        console.error("An error occurred while setting up notifications:", err);
      }
    };

    setupNotifications();

    // Enhanced foreground notification handler
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Push notification received:", payload);
      
      // Show browser notification if needed
      if (payload.notification) {
        const { title, body, icon } = payload.notification;
        
        // Create notification with iOS optimizations
        if (Notification.permission === 'granted') {
          const notification = new Notification(title || 'New Notification', {
            body: body || 'You have a new notification',
            icon: icon || '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: payload.data?.tag || 'default',
            requireInteraction: isIOS(), // Keep notification visible on iOS
            data: payload.data
          });

          // Handle notification click
          notification.onclick = () => {
            notification.close();
            if (payload.data?.actionUrl) {
              window.open(payload.data.actionUrl, '_blank');
            }
          };
        }
      }
      
      // Update badge
      setBadge(1);
    });

    // Clear badge on focus with iOS considerations
    const handleFocus = () => {
      clearBadge();
      
      // Also clear via service worker for iOS
      if (isIOS() && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_BADGE'
        });
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        clearBadge();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId]);

  // Return utility functions for external use
  return {
    setBadge,
    clearBadge,
    isIOSSupported: isIOSPushSupported(),
    isPWAMode: isPWA(),
    isIOSDevice: isIOS()
  };
}
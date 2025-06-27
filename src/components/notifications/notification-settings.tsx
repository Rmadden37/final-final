// Notification permission component for LeadFlow
'use client';

/* eslint-disable no-undef */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, Check, X, Smartphone, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermission, registerServiceWorker, onMessageListener } from '@/lib/firebase-messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

// iOS detection utilities
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         // @ts-ignore
         window.navigator.standalone === true;
}

function isIOSPushSupported(): boolean {
  if (!isIOS()) return true; // Not iOS, assume supported
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (!match) return false;
  
  const majorVersion = parseInt(match[1]);
  const minorVersion = parseInt(match[2]);
  
  // iOS 16.4+ required for web push
  return majorVersion > 16 || (majorVersion === 16 && minorVersion >= 4);
}

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // iOS-specific state
  const [iosInfo, setIosInfo] = useState({
    isIOS: false,
    isPWA: false,
    isSupported: true,
    needsInstallation: false
  });

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check iOS status
    const iosDevice = isIOS();
    const pwaMode = isPWA();
    const supported = isIOSPushSupported();
    
    setIosInfo({
      isIOS: iosDevice,
      isPWA: pwaMode,
      isSupported: supported,
      needsInstallation: iosDevice && !pwaMode
    });

    // Register service worker
    registerServiceWorker();

    // Listen for foreground messages
    const _unsubscribe = onMessageListener().then((payload: any) => {
      console.log('Foreground message received:', payload);
      
      toast({
        title: payload.notification?.title || 'New Notification',
        description: payload.notification?.body || 'You have a new notification',
      });
    }).catch(console.error);

    return () => {
      // Cleanup if needed
    };
  }, [toast]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    
    try {
      // Check iOS compatibility first
      if (iosInfo.isIOS && !iosInfo.isSupported) {
        toast({
          title: "❌ iOS Version Not Supported",
          description: "iOS 16.4+ is required for push notifications. Please update your device.",
          variant: "destructive"
        });
        return;
      }

      if (iosInfo.needsInstallation) {
        toast({
          title: "📱 Installation Required",
          description: "Add this app to your home screen first to enable notifications on iOS.",
          variant: "destructive"
        });
        return;
      }

      const token = await requestNotificationPermission();
      
      if (token) {
        setFcmToken(token);
        setPermission('granted');
        
        // Save token to Firestore for the current user
        if (user?.uid) {
          await setDoc(doc(db, 'userTokens', user.uid), {
            fcmToken: token,
            userId: user.uid,
            context: iosInfo.isPWA ? 'pwa' : 'browser',
            platform: iosInfo.isIOS ? 'ios' : 'other',
            userAgent: navigator.userAgent,
            updatedAt: new Date(),
            enabled: true,
            ...(iosInfo.isPWA && { pwaInstallDate: new Date() })
          }, { merge: true });
        }
        
        toast({
          title: "✅ Notifications Enabled!",
          description: iosInfo.isPWA 
            ? "You'll now receive push notifications in your home screen app."
            : "You'll now receive push notifications for new leads and appointments.",
        });
      } else {
        toast({
          title: "❌ Permission Denied",
          description: "Please enable notifications in your browser settings to receive alerts.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "❌ Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    
    try {
      // Update Firestore to disable notifications
      if (user?.uid) {
        await setDoc(doc(db, 'userTokens', user.uid), {
          enabled: false,
          disabledAt: new Date()
        }, { merge: true });
      }
      
      setPermission('denied');
      setFcmToken(null);
      
      toast({
        title: "🔕 Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({
        title: "❌ Error", 
        description: "Failed to disable notifications. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚀 Test Notification', {
        body: 'Push notifications are working perfectly!',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'test-notification'
      });
      
      toast({
        title: "📱 Test Sent!",
        description: "Check your device for the test notification.",
      });
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {permission === 'granted' ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-500" />
            )}
            Push Notifications
          </CardTitle>
          <CardDescription>
            Get notified about new leads, appointments, and important updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* iOS Status Info */}
          {iosInfo.isIOS && (
            <Alert className={iosInfo.needsInstallation ? "border-yellow-200 bg-yellow-50" : "border-blue-200 bg-blue-50"}>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                {iosInfo.needsInstallation ? (
                  <>
                    <strong>iOS Installation Required:</strong> Add this app to your home screen to enable notifications.
                    <br />
                    <small>Tap the Share button → &quot;Add to Home Screen&quot;</small>
                  </>
                ) : iosInfo.isPWA ? (
                  <>
                    <strong>iOS PWA Mode:</strong> Perfect! Notifications will work in your home screen app.
                  </>
                ) : (
                  <>
                    <strong>iOS Browser Mode:</strong> Limited notification support.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm">
              Status: 
              <span className={`ml-1 font-medium ${
                permission === 'granted' ? 'text-green-600' : 
                permission === 'denied' ? 'text-red-600' : 
                'text-yellow-600'
              }`}>
                {permission === 'granted' ? 'Enabled' : 
                 permission === 'denied' ? 'Disabled' : 
                 'Not Set'}
              </span>
            </span>
            {permission === 'granted' && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {permission === 'denied' && (
              <X className="h-4 w-4 text-red-500" />
            )}
          </div>

          {permission !== 'granted' ? (
            <Button 
              onClick={handleEnableNotifications}
              disabled={isLoading || (iosInfo.isIOS && !iosInfo.isSupported)}
              className="w-full"
            >
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button 
                onClick={testNotification}
                variant="outline"
                className="w-full"
              >
                Send Test Notification
              </Button>
              <Button 
                onClick={handleDisableNotifications}
                disabled={isLoading}
                variant="destructive"
                className="w-full"
              >
                {isLoading ? 'Disabling...' : 'Disable Notifications'}
              </Button>
            </div>
          )}

          {fcmToken && (
            <div className="text-xs text-muted-foreground">
              <p>✅ Connected to push service</p>
              {iosInfo.isPWA && <p>📱 PWA mode active</p>}
            </div>
          )}

          {/* iOS installation instructions */}
          {iosInfo.needsInstallation && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>To enable notifications on iPhone/iPad:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                  <li>Tap the Share button (□↗) in Safari</li>
                  <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                  <li>Tap &quot;Add&quot; to install the app</li>
                  <li>Open the app from your home screen</li>
                  <li>Enable notifications when prompted</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
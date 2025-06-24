// Notification permission component for LeadFlow
'use client';

/* eslint-disable no-undef */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermission, registerServiceWorker, onMessageListener } from '@/lib/firebase-messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

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
      const token = await requestNotificationPermission();
      
      if (token) {
        setFcmToken(token);
        setPermission('granted');
        
        // Save token to Firestore for the current user
        if (user?.uid) {
          await setDoc(doc(db, 'userTokens', user.uid), {
            fcmToken: token,
            userId: user.uid,
            updatedAt: new Date(),
            enabled: true
          }, { merge: true });
        }
        
        toast({
          title: "✅ Notifications Enabled!",
          description: "You'll now receive push notifications for new leads and appointments.",
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

  const testAppointmentReminder = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ Appointment Reminder', {
        body: 'John Smith appointment in 30 minutes at 123 Main St',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'test-reminder'
      });
      
      toast({
        title: "⏰ Reminder Test Sent!",
        description: "This is how appointment reminders will look.",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
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
            disabled={isLoading}
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
              onClick={testAppointmentReminder}
              variant="outline"
              className="w-full"
            >
              Test Appointment Reminder
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

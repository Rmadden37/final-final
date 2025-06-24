"use client";

/* eslint-disable no-undef */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock, UserPlus, AlertCircle, CheckCircle, Calendar } from "lucide-react";

interface NotificationTestPanelProps {
  className?: string;
}

export default function NotificationTestPanel({ className }: NotificationTestPanelProps) {
  const { toast } = useToast();
  const [isLoading, _setIsLoading] = useState(false);

  const showTestNotification = async (type: string, title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `test-${type}`,
        requireInteraction: true
      });
      
      toast({
        title: "📱 Test Sent!",
        description: `${type} notification sent to your device.`,
      });
    } else {
      toast({
        title: "❌ Notifications Disabled",
        description: "Please enable notifications first.",
        variant: "destructive"
      });
    }
  };

  const testNotifications = [
    {
      type: "New Lead",
      title: "🔥 New Lead!",
      body: "John Smith from 123 Main St - (555) 123-4567",
      icon: <UserPlus className="h-4 w-4" />,
      color: "text-green-600"
    },
    {
      type: "Lead Assigned",
      title: "📋 Lead Assigned to You",
      body: "Sarah Johnson has been assigned to you",
      icon: <Bell className="h-4 w-4" />,
      color: "text-blue-600"
    },
    {
      type: "Appointment Reminder",
      title: "⏰ Appointment Reminder",
      body: "Mike Wilson appointment in 30 minutes at 456 Oak Ave",
      icon: <Clock className="h-4 w-4" />,
      color: "text-orange-600"
    },
    {
      type: "Lead Sold",
      title: "📝 Lead Updated",
      body: "Emma Davis: Lead marked as sold! 🎉",
      icon: <CheckCircle className="h-4 w-4" />,
      color: "text-green-600"
    },
    {
      type: "Lead Rescheduled",
      title: "📝 Lead Updated",
      body: "Robert Brown: Lead was rescheduled",
      icon: <Calendar className="h-4 w-4" />,
      color: "text-yellow-600"
    },
    {
      type: "Lead Canceled",
      title: "📝 Lead Updated",
      body: "Lisa Anderson: Lead was canceled",
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-red-600"
    },
    {
      type: "Team Update",
      title: "👥 Team Update", 
      body: "John Closer is now On Duty",
      icon: <UserPlus className="h-4 w-4" />,
      color: "text-blue-600"
    },
    {
      type: "Queue Alert",
      title: "⚠️ Queue Alert",
      body: "15 leads waiting for assignment",
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-orange-600"
    },
    {
      type: "Goal Achieved",
      title: "🎉 Goal Achieved!",
      body: "Sarah Johnson reached daily goal with 5 sales!",
      icon: <CheckCircle className="h-4 w-4" />,
      color: "text-green-600"
    },
    {
      type: "Verification Needed",
      title: "✅ Verification Needed",
      body: "3 leads require verification",
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-yellow-600"
    },
    {
      type: "Priority Lead",
      title: "🚨 Priority Lead!",
      body: "Robert Wilson - High-value lead assigned",
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-red-600"
    },
    {
      type: "Photos Added",
      title: "📸 Photos Added",
      body: "Mike added photos for Emma Davis",
      icon: <UserPlus className="h-4 w-4" />,
      color: "text-blue-600"
    },
    {
      type: "Chat Mention",
      title: "💬 Sarah mentioned you",
      body: "Can you help with the Johnson lead?",
      icon: <Bell className="h-4 w-4" />,
      color: "text-purple-600"
    },
    {
      type: "Overdue Follow-up",
      title: "⏰ Follow-up Overdue",
      body: "David Smith - 3 days overdue",
      icon: <Clock className="h-4 w-4" />,
      color: "text-red-600"
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Test Panel
        </CardTitle>
        <CardDescription>
          Test different types of push notifications to see how they appear on your device
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {testNotifications.map((notification) => (
            <Button
              key={notification.type}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => showTestNotification(
                notification.type,
                notification.title,
                notification.body
              )}
              disabled={isLoading}
            >
              <div className="flex items-center gap-2 w-full">
                <span className={notification.color}>
                  {notification.icon}
                </span>
                <span className="font-medium text-sm">{notification.type}</span>
              </div>
              <div className="text-xs text-left text-muted-foreground">
                {notification.body}
              </div>
            </Button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-1">💡 Testing Tips:</p>
          <ul className="space-y-1 text-xs">
            <li>• Make sure notifications are enabled in your browser</li>
            <li>• Test on mobile for the full experience</li>
            <li>• Notifications may appear differently on different devices</li>
            <li>• Check your notification center if you miss them</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

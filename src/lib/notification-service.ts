// Notification service for LeadFlow app
// CONFIGURATION: Only "New lead assigned" notifications are enabled
// All other notification types have been disabled to reduce notification noise
import { collection, getDocs, query, where, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lead } from '@/types';
import { BadgeService } from './badge-service';

// Server-side function to send push notifications
// This would typically be in Firebase Functions for production
export async function sendPushNotification(
  userIds: string[],
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
  }
) {
  try {
    // Get FCM tokens for users
    const tokens: string[] = [];
    
    for (const userId of userIds) {
      const tokenQuery = query(
        collection(db, 'userTokens'), 
        where('userId', '==', userId),
        where('enabled', '==', true)
      );
      
      const tokenDocs = await getDocs(tokenQuery);
      tokenDocs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      });
    }

    if (tokens.length === 0) {
      console.log('No FCM tokens found for users:', userIds);
      return;
    }

    // Update badge count for mobile notifications
    await BadgeService.incrementBadge();

    // In production, this would use Firebase Admin SDK to send to FCM
    // For now, we'll log what would be sent
    console.log('Would send notification to tokens:', tokens.length);
    console.log('Notification:', notification);
    
    /* Example of what the server-side Firebase Function would look like:
    const admin = require('firebase-admin');
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        badge: notification.badge || '/icon-192x192.png',
      },
      data: notification.data || {},
      android: {
        notification: {
          notificationCount: await BadgeService.getBadgeCount(),
        }
      },
      apns: {
        payload: {
          aps: {
            badge: await BadgeService.getBadgeCount(),
          }
        }
      },
      tokens: tokens
    };
    
    const response = await admin.messaging().sendMulticast(message);
    console.log('Successfully sent message:', response);
    */
    
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

// Notification triggers for different lead events
export const LeadNotifications = {
  // When a new lead is created - DISABLED
  newLead: async (lead: Lead, assignedUserId?: string) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('newLead notification disabled - only lead assignment notifications allowed');
    return;
  },

  // When a lead is assigned to someone - ENABLED (This is the only allowed notification)
  leadAssigned: async (lead: Lead, assignedUserId: string) => {
    await sendPushNotification([assignedUserId], {
      title: '📋 New Lead Assigned',
      body: `${lead.customerName} has been assigned to you`,
      tag: `assigned-${lead.id}`,
      data: {
        type: 'lead_assigned',
        leadId: lead.id,
        actionUrl: `/dashboard/leads/${lead.id}`
      }
    });
  },

  // Appointment reminder (30 minutes before) - DISABLED
  appointmentReminder: async (lead: Lead, assignedUserId: string, appointmentTime: Date) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('appointmentReminder notification disabled - only lead assignment notifications allowed');
    return;
  },

  // When lead status changes - DISABLED
  leadUpdated: async (lead: Lead, assignedUserId: string, updateType: string) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('leadUpdated notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Follow-up reminder - DISABLED
  followUpDue: async (lead: Lead, assignedUserId: string) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('followUpDue notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Team management notifications - DISABLED
  closerStatusChange: async (closerName: string, newStatus: 'On Duty' | 'Off Duty', teamUserIds: string[]) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('closerStatusChange notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Lead queue alerts - DISABLED
  queueBacklog: async (queueCount: number, managerIds: string[]) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('queueBacklog notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Performance alerts - DISABLED
  dailyGoalReached: async (closerName: string, salesCount: number, teamUserIds: string[]) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('dailyGoalReached notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Verification reminders - DISABLED
  verificationRequired: async (leadCount: number, setterIds: string[]) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('verificationRequired notification disabled - only lead assignment notifications allowed');
    return;
  },

  // System maintenance - DISABLED
  systemMaintenance: async (message: string, allUserIds: string[]) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('systemMaintenance notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Critical lead alerts - DISABLED
  highPriorityLead: async (lead: Lead, assignedUserId: string) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('highPriorityLead notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Photo uploaded notification - DISABLED
  photoUploaded: async (lead: Lead, uploaderName: string, assignedUserId: string) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('photoUploaded notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Closer rotation updates - DISABLED
  rotationUpdate: async (nextCloserName: string, teamUserIds: string[]) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('rotationUpdate notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Chat mentions - DISABLED
  chatMention: async (mentionerName: string, message: string, mentionedUserId: string) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('chatMention notification disabled - only lead assignment notifications allowed');
    return;
  },

  // Overdue follow-ups - DISABLED
  overdueFollowUp: async (lead: Lead, assignedUserId: string, daysPastDue: number) => {
    // DISABLED: Only lead assignment notifications are allowed
    console.log('overdueFollowUp notification disabled - only lead assignment notifications allowed');
    return;
  }
};

// Helper to schedule notifications (would use a job queue in production)
export const scheduleNotification = (
  notificationFn: () => Promise<void>,
  delay: number
) => {
  setTimeout(notificationFn, delay);
};

// Example usage in your lead history code:
/*
// When creating a new lead:
await LeadNotifications.newLead(newLead, assignedUserId);

// When assigning a lead:
await LeadNotifications.leadAssigned(lead, newAssignedUserId);

// When scheduling an appointment:
const appointmentTime = new Date(scheduledTime);
const reminderTime = new Date(appointmentTime.getTime() - 30 * 60 * 1000); // 30 minutes before
const delay = reminderTime.getTime() - Date.now();

if (delay > 0) {
  scheduleNotification(
    () => LeadNotifications.appointmentReminder(lead, assignedUserId, appointmentTime),
    delay
  );
}
*/

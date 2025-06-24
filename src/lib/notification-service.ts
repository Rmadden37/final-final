// Notification service for LeadFlow app
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
  // When a new lead is created
  newLead: async (lead: Lead, assignedUserId?: string) => {
    const userIds = assignedUserId ? [assignedUserId] : [];
    
    await sendPushNotification(userIds, {
      title: '🔥 New Lead!',
      body: `${lead.customerName} from ${lead.address} - ${lead.customerPhone}`,
      tag: `new-lead-${lead.id}`,
      data: {
        type: 'new_lead',
        leadId: lead.id,
        actionUrl: `/dashboard/leads/${lead.id}`
      }
    });
  },

  // When a lead is assigned to someone
  leadAssigned: async (lead: Lead, assignedUserId: string) => {
    await sendPushNotification([assignedUserId], {
      title: '📋 Lead Assigned to You',
      body: `${lead.customerName} has been assigned to you`,
      tag: `assigned-${lead.id}`,
      data: {
        type: 'lead_assigned',
        leadId: lead.id,
        actionUrl: `/dashboard/leads/${lead.id}`
      }
    });
  },

  // Appointment reminder (30 minutes before)
  appointmentReminder: async (lead: Lead, assignedUserId: string, appointmentTime: Date) => {
    const timeStr = appointmentTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    await sendPushNotification([assignedUserId], {
      title: '📅 Appointment Reminder',
      body: `Meeting with ${lead.customerName} in 30 minutes (${timeStr})`,
      tag: `reminder-${lead.id}`,
      data: {
        type: 'appointment_reminder',
        leadId: lead.id,
        appointmentTime: appointmentTime.toISOString(),
        actionUrl: `/dashboard/schedule`
      }
    });
  },

  // When lead status changes
  leadUpdated: async (lead: Lead, assignedUserId: string, updateType: string) => {
    const messages = {
      'status_change': `Status changed to ${lead.status}`,
      'contact_attempt': 'New contact attempt logged',
      'notes_added': 'New notes added',
      'rescheduled': 'Appointment rescheduled'
    };

    await sendPushNotification([assignedUserId], {
      title: '📝 Lead Updated',
      body: `${lead.customerName}: ${messages[updateType as keyof typeof messages] || 'Lead information updated'}`,
      tag: `update-${lead.id}`,
      data: {
        type: 'lead_updated',
        leadId: lead.id,
        updateType,
        actionUrl: `/dashboard/leads/${lead.id}`
      }
    });
  },

  // Follow-up reminder
  followUpDue: async (lead: Lead, assignedUserId: string) => {
    await sendPushNotification([assignedUserId], {
      title: '⏰ Follow-up Due',
      body: `Time to follow up with ${lead.customerName}`,
      tag: `followup-${lead.id}`,
      data: {
        type: 'follow_up_due',
        leadId: lead.id,
        actionUrl: `/dashboard/leads/${lead.id}`
      }
    });
  },

  // Team management notifications
  closerStatusChange: async (closerName: string, newStatus: 'On Duty' | 'Off Duty', teamUserIds: string[]) => {
    await sendPushNotification(teamUserIds, {
      title: '👥 Team Update',
      body: `${closerName} is now ${newStatus}`,
      tag: `status-change-${closerName}`,
      data: {
        type: 'team_update',
        actionUrl: '/dashboard'
      }
    });
  },

  // Lead queue alerts
  queueBacklog: async (queueCount: number, managerIds: string[]) => {
    await sendPushNotification(managerIds, {
      title: '⚠️ Queue Alert',
      body: `${queueCount} leads waiting for assignment`,
      tag: 'queue-backlog',
      data: {
        type: 'queue_alert',
        actionUrl: '/dashboard',
        priority: 'high'
      }
    });
  },

  // Performance alerts
  dailyGoalReached: async (closerName: string, salesCount: number, teamUserIds: string[]) => {
    await sendPushNotification(teamUserIds, {
      title: '🎉 Goal Achieved!',
      body: `${closerName} reached daily goal with ${salesCount} sales!`,
      tag: `goal-${closerName}`,
      data: {
        type: 'performance_milestone',
        actionUrl: '/dashboard/analytics'
      }
    });
  },

  // Verification reminders
  verificationRequired: async (leadCount: number, setterIds: string[]) => {
    await sendPushNotification(setterIds, {
      title: '✅ Verification Needed',
      body: `${leadCount} lead${leadCount > 1 ? 's' : ''} require verification`,
      tag: 'verification-reminder',
      data: {
        type: 'verification_reminder',
        actionUrl: '/dashboard/lead-history'
      }
    });
  },

  // System maintenance
  systemMaintenance: async (message: string, allUserIds: string[]) => {
    await sendPushNotification(allUserIds, {
      title: '🔧 System Notice',
      body: message,
      tag: 'system-maintenance',
      data: {
        type: 'system_alert',
        actionUrl: '/dashboard'
      }
    });
  },

  // Critical lead alerts
  highPriorityLead: async (lead: Lead, assignedUserId: string) => {
    await sendPushNotification([assignedUserId], {
      title: '🚨 Priority Lead!',
      body: `${lead.customerName} - High-value lead assigned`,
      tag: `priority-${lead.id}`,
      data: {
        type: 'priority_lead',
        leadId: lead.id,
        actionUrl: `/dashboard/leads/${lead.id}`,
        priority: 'high'
      }
    });
  },

  // Photo uploaded notification
  photoUploaded: async (lead: Lead, uploaderName: string, assignedUserId: string) => {
    await sendPushNotification([assignedUserId], {
      title: '📸 Photos Added',
      body: `${uploaderName} added photos for ${lead.customerName}`,
      tag: `photos-${lead.id}`,
      data: {
        type: 'photo_uploaded',
        leadId: lead.id,
        actionUrl: `/dashboard/leads/${lead.id}`
      }
    });
  },

  // Closer rotation updates
  rotationUpdate: async (nextCloserName: string, teamUserIds: string[]) => {
    await sendPushNotification(teamUserIds, {
      title: '🔄 Rotation Update',
      body: `${nextCloserName} is next in line for assignments`,
      tag: 'rotation-update',
      data: {
        type: 'rotation_update',
        actionUrl: '/dashboard'
      }
    });
  },

  // Chat mentions
  chatMention: async (mentionerName: string, message: string, mentionedUserId: string) => {
    await sendPushNotification([mentionedUserId], {
      title: `💬 ${mentionerName} mentioned you`,
      body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      tag: `chat-mention-${Date.now()}`,
      data: {
        type: 'chat_mention',
        actionUrl: '/dashboard/chat'
      }
    });
  },

  // Overdue follow-ups
  overdueFollowUp: async (lead: Lead, assignedUserId: string, daysPastDue: number) => {
    await sendPushNotification([assignedUserId], {
      title: '⏰ Follow-up Overdue',
      body: `${lead.customerName} - ${daysPastDue} days overdue`,
      tag: `overdue-${lead.id}`,
      data: {
        type: 'overdue_followup',
        leadId: lead.id,
        actionUrl: `/dashboard/leads/${lead.id}`,
        priority: 'high'
      }
    });
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

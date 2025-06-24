# LeadFlow Push Notifications Setup Guide

## Overview
The LeadFlow app now includes a comprehensive push notification system that sends real-time notifications for:
- 🔥 New lead creation
- 📋 Lead assignments
- 📝 Lead status updates (sold, canceled, rescheduled, etc.)
- ⏰ Appointment reminders (30 minutes before scheduled time)

## Features Implemented

### Frontend Components
1. **NotificationSettings Component** (`/src/components/notifications/notification-settings.tsx`)
   - Enable/disable push notifications
   - Request browser permissions
   - FCM token management
   - Test notifications

2. **NotificationTestPanel Component** (`/src/components/notifications/notification-test-panel.tsx`)
   - Development testing panel
   - Test all notification types
   - Only visible in development mode

3. **Firebase Messaging Service** (`/src/lib/firebase-messaging.ts`)
   - FCM configuration and token management
   - Foreground message handling
   - Service worker registration

### Backend Functions
1. **Push Notification Service** (in `/functions/src/index.ts`)
   - `sendPushNotification()` - Core notification sender
   - `LeadNotifications` - Lead-specific notification handlers
   - FCM token cleanup for invalid tokens

2. **Cloud Functions**
   - `assignLeadOnCreate` - Auto-assigns leads and sends notifications
   - `handleLeadDispositionUpdate` - Sends notifications for status changes
   - `scheduleAppointmentReminder` - Schedules appointment reminders
   - `processAppointmentReminders` - Processes due reminders every 5 minutes

### PWA Integration
1. **Service Worker** (`/public/firebase-messaging-sw.js`)
   - Handles background notifications
   - Firebase Cloud Messaging integration
   - Notification click handling

2. **Web App Manifest** (`/public/manifest.json`)
   - PWA configuration
   - App icons and metadata
   - Install prompts

## Setup Instructions

### 1. Firebase Configuration
First, you need to set up Firebase Cloud Messaging:

```bash
# 1. Go to Firebase Console (https://console.firebase.google.com)
# 2. Select your project
# 3. Go to Project Settings > Cloud Messaging
# 4. Generate a new Web Push certificate
# 5. Copy the VAPID key
```

### 2. Environment Variables
Create or update your `.env.local` file:

```bash
# Firebase Configuration (existing)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Push Notifications (new)
NEXT_PUBLIC_VAPID_KEY=your_vapid_key_from_firebase_console
```

### 3. Install Dependencies
The required dependencies should already be installed, but if needed:

```bash
npm install firebase
```

### 4. Deploy Firebase Functions
Deploy the updated Cloud Functions:

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 5. Test the System
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard/profile`
3. Enable push notifications in the "Push Notifications" section
4. Use the "Notification Test Panel" (only visible in development) to test different notification types

## How It Works

### Notification Flow
1. **Lead Creation**: When a new lead is created via `create-lead-form.tsx`, a notification is sent to relevant users
2. **Lead Assignment**: Firebase Function automatically assigns leads and sends notifications to assigned closers
3. **Status Updates**: When lead status changes (via disposition modals), notifications are sent to assigned closers
4. **Appointment Reminders**: When leads are scheduled, reminders are automatically scheduled 30 minutes before appointment time

### Data Storage
- **FCM Tokens**: Stored in Firestore collection `userTokens` with user UID as document ID
- **Appointment Reminders**: Stored in Firestore collection `appointmentReminders` for scheduled processing
- **User Preferences**: Notification enabled/disabled status stored with FCM tokens

### Permission Handling
1. Browser requests notification permission
2. FCM token is generated and stored in Firestore
3. Service worker handles background notifications
4. Invalid tokens are automatically cleaned up

## Testing Checklist

### Browser Testing
- [ ] Chrome/Edge (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)

### Notification Types
- [ ] New lead notifications
- [ ] Lead assignment notifications
- [ ] Lead status update notifications
- [ ] Appointment reminder notifications

### Scenarios
- [ ] Foreground notifications (app open)
- [ ] Background notifications (app closed)
- [ ] PWA installation and notifications
- [ ] Permission denied/granted states
- [ ] Token refresh and cleanup

## Troubleshooting

### Common Issues
1. **Notifications not appearing**
   - Check browser notification permissions
   - Verify VAPID key is correct
   - Check console for FCM token errors

2. **Service worker not registering**
   - Ensure HTTPS (localhost is ok for development)
   - Check service worker file path
   - Verify Firebase configuration

3. **Functions not deploying**
   - Check Firebase CLI is logged in
   - Verify functions build without errors
   - Check Firebase project permissions

### Debug Steps
1. Open browser DevTools
2. Check Console for errors
3. Go to Application > Service Workers
4. Verify Firebase Messaging service worker is active
5. Check Network tab for FCM token requests

## Production Deployment

### Requirements
- HTTPS certificate (required for service workers)
- Valid Firebase project with FCM enabled
- Environment variables properly set
- Functions deployed to Firebase

### Performance Considerations
- FCM tokens are cached and reused
- Invalid tokens are automatically cleaned up
- Batch processing for multiple notifications
- Appointment reminders processed every 5 minutes

## Security Features
- User-specific FCM tokens
- Team-based notification filtering
- Permission-based access control
- Token validation and cleanup

## Future Enhancements
- [ ] Notification sound customization
- [ ] Rich notification actions (approve/deny)
- [ ] Email fallback for critical notifications
- [ ] Notification history/archive
- [ ] Advanced scheduling options
- [ ] Custom notification templates
- [ ] Analytics and delivery tracking

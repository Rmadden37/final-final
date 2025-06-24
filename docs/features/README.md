# LeadFlow - Lead Management System

A comprehensive lead management system built with Next.js, Firebase, and TypeScript.

## 🚀 Features

### Core Functionality
- **Live Dashboard**: Real-time lead tracking and management
- **Automated Lead Distribution**: Smart assignment system with round-robin rotation
- **Role-Based Access Control**: Setter, Closer, and Manager roles
- **Lead Disposition**: Complete lead lifecycle management
- **Team Management**: Multi-team support with isolated data

### 🔔 Push Notifications (NEW!)
- **Real-time Notifications**: Instant alerts for new leads, assignments, and updates
- **Progressive Web App**: Install on mobile devices for native-like experience
- **Appointment Reminders**: Automatic reminders 30 minutes before scheduled appointments
- **Background Sync**: Receive notifications even when app is closed
- **Multi-device Support**: Notifications sync across all user devices

### Lead Management
- **Smart Assignment**: Automatic lead distribution to available closers
- **Status Tracking**: Complete lead lifecycle from creation to disposition
- **Appointment Scheduling**: Schedule and reschedule appointments
- **Photo Upload**: Attach photos to leads for better context
- **Notes & History**: Track all lead interactions and changes

### Team Features
- **Closer Lineup**: Visual queue management system
- **Availability Toggle**: Real-time status updates
- **Performance Tracking**: Lead statistics and team metrics
- **Manager Tools**: Team oversight and management capabilities

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Firebase Functions, Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **PWA**: Service Workers, Web App Manifest
- **UI Components**: Shadcn/ui, Radix UI
- **Forms**: React Hook Form, Zod validation

## 📱 Progressive Web App

LeadFlow is a full Progressive Web App that can be installed on mobile devices:

- **Installable**: Add to home screen on iOS/Android
- **Offline Ready**: Core functionality available offline
- **Push Notifications**: Native-like notification experience
- **Responsive Design**: Optimized for all screen sizes

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+ 
- Firebase CLI
- Firebase project with Firestore, Auth, and Functions enabled

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd leadflow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase configuration

# Start development server
npm run dev
```

### Push Notifications Setup
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Generate Web Push certificate and copy VAPID key
3. Add VAPID key to your `.env.local`:
   ```
   NEXT_PUBLIC_VAPID_KEY=your_vapid_key_here
   ```
4. Deploy Firebase Functions:
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

See [Push Notifications Setup Guide](./docs/push-notifications-setup.md) for detailed instructions.

## 📖 Documentation

- [Push Notifications Setup](./docs/push-notifications-setup.md)
- [Project Blueprint](./docs/blueprint.md)

## 🚀 Deployment

### Firebase Hosting
```bash
npm run build
firebase deploy
```

### Environment Variables
Make sure to set all required environment variables in your production environment:
- Firebase configuration
- VAPID key for push notifications

## 🧪 Testing

The app includes comprehensive testing tools:

- **Notification Test Panel**: Test all notification types (development mode)
- **Unit Tests**: Core functionality testing
- **E2E Tests**: Complete user workflow testing

```bash
# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

## 📱 Mobile Experience

- **PWA Installation**: Installable on iOS/Android home screens
- **Offline Support**: Core features work without internet
- **Native Notifications**: Push notifications work like native apps
- **Touch Optimized**: Designed for mobile-first experience

## 🔐 Security

- **Role-based permissions**: Secure access control
- **Team isolation**: Data separation between teams
- **Firebase security rules**: Server-side data protection
- **Secure authentication**: Firebase Auth integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For setup help and troubleshooting, see the documentation in the `/docs` folder or contact the development team.

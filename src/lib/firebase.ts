import {initializeApp, getApps, getApp} from "firebase/app";
import {getAuth, connectAuthEmulator} from "firebase/auth";
import {getFirestore, connectFirestoreEmulator} from "firebase/firestore";
import {getStorage} from "firebase/storage";
import {getFunctions, httpsCallable, connectFunctionsEmulator} from "firebase/functions";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBc3jmFE6dRXBApmWD9Jg2PO86suqGgaZw",
  authDomain: "leadflow-4lvrr.firebaseapp.com",
  projectId: "leadflow-4lvrr",
  storageBucket: "leadflow-4lvrr.firebasestorage.app",
  messagingSenderId: "13877630896",
  appId: "1:13877630896:web:ab7d2717024960ec36e875",
  measurementId: "G-KDEF2C21SH",
};

// Initialize Firebase (singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Track if emulators are connected to prevent multiple connections
let emulatorsConnected = false;

// Connect to emulators in development (with safety checks)
if (typeof window !== 'undefined' && 
    process.env.NODE_ENV === 'development' && 
    !emulatorsConnected) {
  
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    console.log('🔧 Development mode detected, checking for emulators...');
    
    // Only connect if emulators are actually running
    // This prevents errors if emulators aren't started
    fetch('http://localhost:4000/emulators')
      .then(() => {
        console.log('✅ Emulators detected, connecting...');
        
        try {
          connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
          connectFirestoreEmulator(db, 'localhost', 8080);
          connectFunctionsEmulator(functions, 'localhost', 5001);
          emulatorsConnected = true;
          console.log('🔥 Connected to Firebase emulators');
        } catch (error) {
          console.log('⚠️ Emulators already connected or error:', error);
        }
      })
      .catch(() => {
        console.log('ℹ️ Firebase emulators not running, using production services');
      });
  }
}

// Cloud function references
export const acceptJobFunction = httpsCallable(functions, 'acceptJob');
export const inviteUserFunction = httpsCallable(functions, 'inviteUser');
export const updateAdminRolesFunction = httpsCallable(functions, 'updateAdminRoles');
export const getTeamStatsFunction = httpsCallable(functions, 'getTeamStats');
export const getDetailedAnalyticsFunction = httpsCallable(functions, 'getDetailedAnalytics');
export const generateAnalyticsReportFunction = httpsCallable(functions, 'generateAnalyticsReport');

// Export initialized services
export {app, auth, db, storage, functions};
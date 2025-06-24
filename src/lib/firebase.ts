import {initializeApp, getApps, getApp} from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore, connectFirestoreEmulator} from "firebase/firestore";
import {getStorage} from "firebase/storage";
import {getFunctions, httpsCallable} from "firebase/functions";

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

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Connect to emulator in development (commented out for now)
// if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     console.log('🔥 Connected to Firestore emulator');
//   } catch (error) {
//     console.log('Firestore emulator already connected or not available');
//   }
// }

// Cloud function calls
export const acceptJobFunction = httpsCallable(functions, 'acceptJob');
export const inviteUserFunction = httpsCallable(functions, 'inviteUser');
export const updateAdminRolesFunction = httpsCallable(functions, 'updateAdminRoles');
export const getTeamStatsFunction = httpsCallable(functions, 'getTeamStats');
export const getDetailedAnalyticsFunction = httpsCallable(functions, 'getDetailedAnalytics');
export const generateAnalyticsReportFunction = httpsCallable(functions, 'generateAnalyticsReport');

// Debug function for job acceptance issues
export const debugAcceptJobFunction = async (leadId: string): Promise<any> => {
  const result = await acceptJobFunction({ leadId });
  return result;
};

export {app, auth, db, storage, functions};

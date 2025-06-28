// types/index.ts

// If you're using Firebase Firestore
import type { Timestamp } from 'firebase/firestore';

export interface Lead {
  id?: string;
  
  // Setter information
  setter_id: string;
  setter_name: string;
  
  // Customer information
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  
  // Lead details
  status: 'new' | 'dispatched' | 'sit' | 'sold' | 'no_sale' | 'canceled' | 'credit_fail';
  source?: string;
  notes?: string;
  
  // Assignment
  assigned_closer_id?: string;
  assigned_closer_name?: string;
  
  // Appointment details
  appointment_date?: Date | Timestamp;
  appointment_time?: string;
  
  // Results
  sale_amount?: number;
  commission_amount?: number;
  
  // Timestamps - can be either Date or Firestore Timestamp
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  
  // Metadata
  isImmediateDispatch?: boolean;
  isSelfGenerated?: boolean;
  
  // Any additional fields your app uses
  [key: string]: any;
}

// Helper function to convert Timestamp to Date
export function timestampToDate(timestamp: Date | Timestamp | undefined): Date {
  if (!timestamp) return new Date();
  
  // If it's already a Date, return it
  if (timestamp instanceof Date) return timestamp;
  
  // If it's a Firestore Timestamp, convert it
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return timestamp.toDate();
  }
  
  // Fallback
  return new Date();
}

// Add any other types your app uses here
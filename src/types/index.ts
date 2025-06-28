// types/index.ts

// If you're using Firebase Firestore
import type { Timestamp } from 'firebase/firestore';

// User role type
export type UserRole = 'admin' | 'manager' | 'setter' | 'closer';

// User type
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  teamId?: string;
  avatarUrl?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

// Closer type
export interface Closer {
  uid: string;
  name: string;
  status: 'On Duty' | 'Off Duty';
  teamId: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  lineupOrder?: number;
  email?: string;
}

// Lead status type
export type LeadStatus = 
  | 'new'
  | 'dispatched'
  | 'waiting_assignment'
  | 'scheduled'
  | 'accepted'
  | 'in_process'
  | 'sit'
  | 'sold'
  | 'no_sale'
  | 'canceled'
  | 'credit_fail';

// Lead type
export interface Lead {
  id?: string;
  
  // Team association
  teamId: string;
  
  // Setter information
  setter_id: string;
  setter_name: string;
  
  // Customer information
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  
  // Lead details
  status: LeadStatus;
  source?: string;
  notes?: string;
  
  // Assignment
  assignedCloserId?: string;
  assignedCloserName?: string;
  assigned_closer_id?: string;  // Legacy field
  assigned_closer_name?: string; // Legacy field
  
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
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Fallback
  return new Date();
}

// Performance types for analytics
export interface SetterPerformance {
  uid: string;
  name: string;
  totalLeads: number;
  sitRate: number;
  failedCreditRate: number;
  cancelNoShowRate: number;
}

export interface CloserPerformance {
  uid: string;
  name: string;
  totalAssigned: number;
  closeRate: number;
  conversionRate: number;
  selfGenRate: number;
}

export interface TeamMetrics {
  totalLeads: number;
  totalSits: number;
  totalSales: number;
  avgSitRate: number;
  avgCloseRate: number;
  avgConversionRate: number;
  topSetterName: string;
  topCloserName: string;
}

export interface TrendData {
  date: string;
  totalLeads: number;
  sitRate: number;
  closeRate: number;
  isSpecialPoint?: boolean;
  pointType?: 'today' | 'projection';
}
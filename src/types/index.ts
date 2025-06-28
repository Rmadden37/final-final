// src/types/index.ts
import { Timestamp } from 'firebase/firestore';

export type LeadStatus = 
  | "waiting_assignment" 
  | "scheduled" 
  | "rescheduled" 
  | "accepted" 
  | "in_process" 
  | "completed" 
  | "canceled" 
  | "expired" 
  | "no_show";

export interface Lead {
  id: string;
  customerName: string;
  customerPhone: string;
  address?: string;
  status: LeadStatus;
  teamId: string;
  dispatchType: string;
  assignedCloserId?: string | null;
  assignedCloserName?: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  dispositionNotes?: string;
  scheduledAppointmentTime?: Timestamp | null;
  setterId?: string | null;
  setterName?: string | null;
  setterLocation?: string | null;
  setterVerified?: boolean;
  verifiedAt?: Timestamp | null;
  verifiedBy?: string | null;
  photoUrls?: string[];
  
  // Additional fields that might be present
  clientName?: string;
  phone?: string;
  type?: string;
  assignedCloser?: string;
  scheduledTime?: Timestamp | null;
  submissionTime?: Timestamp | string | null;
}

export interface Closer {
  uid: string;
  name: string;
  status: "On Duty" | "Off Duty";
  teamId: string;
  role?: string;
  avatarUrl?: string;
  phone?: string;
  lineupOrder?: number;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  teamId?: string;
  role?: string;
  avatarUrl?: string;
}

// Date utility types for Firebase Timestamp handling
export interface TimestampField {
  toDate(): Date;
  toMillis(): number;
}

// Lead with converted dates for easier handling
export interface LeadWithDates extends Omit<Lead, 'createdAt' | 'updatedAt' | 'scheduledAppointmentTime' | 'verifiedAt'> {
  createdAt: Date | null;
  updatedAt: Date | null;
  scheduledAppointmentTime: Date | null;
  verifiedAt: Date | null;
}

// Form data types
export interface LeadFormData {
  customerName: string;
  customerPhone: string;
  address?: string;
  dispatchType: string;
  scheduledAppointmentTime?: Date | null;
  setterId?: string;
  setterName?: string;
  notes?: string;
}

// Calendar event type for scheduled leads display
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  lead: Lead;
  status: LeadStatus;
}
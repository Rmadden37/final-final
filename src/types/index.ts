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
  
  // Additional fields that might be present in Firestore
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
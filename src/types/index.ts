import { Timestamp } from "firebase/firestore";

export type UserRole = "setter" | "closer" | "manager" | "admin";

export type DispatchType = "immediate" | "scheduled";

export type LeadStatus = 
  | "waiting_assignment"
  | "accepted" 
  | "in_process"
  | "sold"
  | "no_sale"
  | "canceled"
  | "rescheduled"
  | "scheduled"
  | "credit_fail"
  | "expired";

export interface User {
  uid: string;
  email: string;
  displayName?: string | null;
  role: UserRole;
  teamId: string;
  status?: "On Duty" | "Off Duty";
  avatarUrl?: string;
  phone?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Lead {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  status: LeadStatus;
  teamId: string;
  dispatchType: DispatchType;
  assignedCloserId: string | null;
  assignedCloserName: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  dispositionNotes: string;
  scheduledAppointmentTime: Timestamp | null;
  setterId: string | null;
  setterName: string | null;
  setterLocation: {
    latitude: number;
    longitude: number;
  } | null;
  setterVerified?: boolean;
  verifiedAt?: Timestamp | null;
  verifiedBy?: string | null;
  photoUrls: string[];
}

export interface Closer {
  uid: string;
  name: string;
  status: "On Duty" | "Off Duty";
  teamId: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  lineupOrder?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  closerOrder?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
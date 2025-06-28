// src/types/index.ts - Clean types without conflicts

import { Timestamp } from "firebase/firestore";

export type UserRole = "setter" | "closer" | "manager" | "admin";

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

export type DispatchType = "immediate" | "scheduled";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
  teamId: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Closer {
  uid: string;
  name: string | null;
  status: "On Duty" | "Off Duty";
  teamId: string | null;
  role: UserRole | null;
  avatarUrl?: string | null;
  phone?: string | null;
  lineupOrder?: number | null;
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
  scheduledAppointmentTime?: Timestamp | null;
  setterId: string | null;
  setterName: string | null;
  setterLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  setterVerified?: boolean;
  verifiedAt?: Timestamp | null;
  verifiedBy?: string | null;
  photoUrls?: string[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  regionId?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closerOrder?: string[];
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string | null;
  senderRole: string | null;
  senderAvatar?: string | null;
  channelId: string;
  timestamp: Timestamp | Date | string;
  editedAt?: Timestamp | null;
  replyToId?: string | null;
  messageType: "text" | "image" | "gif" | "sticker";
  mediaUrl?: string | null;
  mediaMetadata?: {
    width?: number;
    height?: number;
    fileName?: string;
    altText?: string;
  } | null;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: "team" | "region";
  teamId?: string | null;
  regionId?: string | null;
  memberIds: string[];
  memberCount: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageContent?: string | null;
  lastMessageSender?: string | null;
  lastMessageTimestamp?: Timestamp | null;
}
import type {Timestamp, GeoPoint} from "firebase/firestore";

export type UserRole = "setter" | "closer" | "manager" | "admin";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role: UserRole;
  teamId: string;
  avatarUrl?: string;
  phoneNumber?: string | null;
  status?: "On Duty" | "Off Duty" | string;
}

export type LeadStatus =
  | "waiting_assignment"
  | "accepted"
  | "in_process"
  | "sold"
  | "no_sale"
  | "canceled"
  | "rescheduled"
  | "scheduled"
  | "credit_fail";

export type DispatchType = "immediate" | "scheduled";

export interface Lead {
  id: string;
  customerName: string;
  customerPhone: string;
  address?: string; // New field for address
  status: LeadStatus;
  teamId: string;
  dispatchType: DispatchType; // New field for dispatch type
  assignedCloserId?: string | null;
  assignedCloserName?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp; // When the job was accepted by the closer
  acceptedBy?: string; // UID of the closer who accepted the job
  dispositionNotes?: string;
  scheduledAppointmentTime?: Timestamp | null; // Will be used for scheduled dispatch time as well
  setterId?: string;
  setterName?: string;
  setterLocation?: GeoPoint | null;
  photoUrls?: string[]; // New field for photo URLs (placeholder for now)
  setterVerified?: boolean; // Whether setter has verified the scheduled appointment
  verifiedAt?: Timestamp; // When the appointment was verified by setter
  verifiedBy?: string; // UID of the setter who verified the appointment
  isVerified?: boolean; // General verification status for the lead
}

export interface Closer {
  uid: string;
  name: string;
  status: "On Duty" | "Off Duty";
  teamId: string;
  role?: UserRole;
  avatarUrl?: string;
  phone?: string;
  lineupOrder?: number; // Field for managing closer lineup order
  lastExceptionTimestamp?: Timestamp; // Timestamp of last exception (canceled/rescheduled lead)
  lastExceptionReason?: string; // Reason for last exception ("canceled" or "rescheduled")
  normalizedAt?: Timestamp; // Timestamp when lineup order was last normalized
}

// Chat types for team messaging
export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string; // URL to sender's profile photo
  chatId: string; // teamId for team chat or regionId for region chat
  chatType: "team" | "region";
  timestamp: Timestamp;
  editedAt?: Timestamp;
  isDeleted?: boolean;
  replyToId?: string; // For threaded replies
  messageType?: "text" | "emoji" | "sticker" | "gif" | "image"; // Type of message content
  mediaUrl?: string; // URL for stickers, GIFs, or images
  mediaMetadata?: {
    width?: number;
    height?: number;
    altText?: string;
    fileName?: string;
  }; // Metadata for media content
}

export interface ChatChannel {
  id: string; // teamId or regionId
  name: string; // team name or region name
  type: "team" | "region";
  teamId?: string; // for team chats
  regionId?: string; // for region chats
  lastMessageId?: string;
  lastMessageContent?: string;
  lastMessageTimestamp?: Timestamp;
  lastMessageSender?: string;
  memberCount: number;
  isActive: boolean;
}

// src/lib/firebase-utils.ts
import { Timestamp } from 'firebase/firestore';

export function parseTimestamp(value: any): Timestamp | null {
  if (!value) return null;
  
  if (value instanceof Timestamp) {
    return value;
  }
  
  if (typeof value === 'string') {
    const date = parseDateString(value);
    if (date) {
      return Timestamp.fromDate(date);
    }
  }
  
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  
  // Handle objects with seconds and nanoseconds (Firestore format)
  if (typeof value === 'object' && value !== null) {
    if ('seconds' in value && typeof value.seconds === 'number') {
      return new Timestamp(value.seconds, value.nanoseconds || 0);
    }
    
    if ('toDate' in value && typeof value.toDate === 'function') {
      return value as Timestamp;
    }
  }
  
  return null;
}

export function timestampToDate(timestamp: Timestamp | null | undefined): Date | null {
  if (!timestamp) return null;
  
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
  } catch (error) {
    console.warn('Error converting timestamp to date:', error);
  }
  
  return null;
}

export function dateToTimestamp(date: Date | null | undefined): Timestamp | null {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  
  return Timestamp.fromDate(date);
}

// Helper to safely get milliseconds from Timestamp
export function getTimestampMillis(timestamp: Timestamp | null | undefined): number {
  if (!timestamp) return 0;
  
  try {
    if (typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }
  } catch (error) {
    console.warn('Error getting timestamp millis:', error);
  }
  
  return 0;
}

// Helper for parsing various date string formats
export function parseDateString(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") return null;
  
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;

  const recognizedFormatMatch = dateString.match(/(\w+\s\d{1,2},\s\d{4})\s(?:at)\s(\d{1,2}:\d{2}:\d{2}\s[AP]M)/i);
  if (recognizedFormatMatch) {
    const datePart = recognizedFormatMatch[1];
    const timePart = recognizedFormatMatch[2];
    date = new Date(`${datePart} ${timePart}`);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}
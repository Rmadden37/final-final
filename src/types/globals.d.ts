/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference lib="dom" />

// DOM types to fix compilation errors
interface HTMLElement extends Element {}
interface HTMLHeadingElement extends HTMLElement {}
interface HTMLParagraphElement extends HTMLElement {}
interface HTMLSpanElement extends HTMLElement {}
interface HTMLUListElement extends HTMLElement {}
interface HTMLLIElement extends HTMLElement {}
interface HTMLTableElement extends HTMLElement {}
interface HTMLTableSectionElement extends HTMLElement {}
interface HTMLTableRowElement extends HTMLElement {}
interface HTMLTableCellElement extends HTMLElement {}
interface HTMLTableCaptionElement extends HTMLElement {}

// Notification API types
type NotificationPermission = "default" | "denied" | "granted";

interface NotificationOptions {
  body?: string;
  icon?: string;
  image?: string;
  badge?: string;
  sound?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  silent?: boolean;
  timestamp?: number;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface Notification {
  close(): void;
  onclick: ((this: Notification, ev: Event) => any) | null;
  onclose: ((this: Notification, ev: Event) => any) | null;
  onerror: ((this: Notification, ev: Event) => any) | null;
  onshow: ((this: Notification, ev: Event) => any) | null;
}

interface NotificationConstructor {
  new(title: string, options?: NotificationOptions): Notification;
  permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
}

// Global declarations
declare var Notification: NotificationConstructor;
declare var NotificationOptions: NotificationOptions;
declare var NotificationPermission: NotificationPermission;

export {};

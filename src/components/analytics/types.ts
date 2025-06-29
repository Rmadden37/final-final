import { Timestamp } from "firebase/firestore";

export interface TeamStats {
  teamId: string;
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  closers: Array<{
    uid: string;
    name: string;
    status: string;
    assignedLeads: number;
  }>;
  onDutyClosers: number;
  timestamp: Timestamp | Date | null;
}

export interface AnalyticsData {
  leads: Lead[];
  closers: Closer[];
  teamStats: TeamStats | null;
}

export interface SetterAnalytics {
  uid: string;
  name: string;
  totalLeads: number;
  soldLeads: number;
  conversionRate: number;
  immediateLeads: number;
  scheduledLeads: number;
}

export interface CloserAnalytics {
  uid: string;
  name: string;
  totalAssigned: number;
  totalSold: number;
  totalNoSale: number;
  totalFailedCredits: number;
  closingRatio: number;
  closingPercentage: number;
}

export interface DispatchAnalytics {
  immediate: {
    total: number;
    sold: number;
    conversionRate: number;
  };
  scheduled: {
    total: number;
    sold: number;
    conversionRate: number;
  };
}

export interface FilteredMetrics {
  totalLeads: number;
  soldLeads: number;
  sitLeads: number;
  sitRate: string;
  conversionRate: string;
}

// Interfaces for your core data types
export interface Lead {
  id: string;
  teamId: string;
  createdAt: Timestamp | Date;
  setterId: string;
  setterName: string;
  assignedCloserId?: string;
  assignedCloserName?: string;
  status: string;
  dispatchType: 'immediate' | 'scheduled';
  customerName: string;
  customerPhone: string;
  address?: string;
  dispositionNotes?: string;
  scheduledAppointmentTime?: Timestamp | null;
  setterLocation?: any;
  photoUrls?: string[];
  updatedAt?: Timestamp;
  setterVerified?: boolean;
  verifiedAt?: Timestamp | null;
  verifiedBy?: string | null;
}

export interface Closer {
  uid: string;
  teamId: string;
  name: string;
  status: "On Duty" | "Off Duty";
  role?: string;
  avatarUrl?: string | null;
  phone?: string | null;
  lineupOrder?: number | null;
}

// Interfaces for AI-generated chart data
export interface AiChartDataPoint {
  [key: string]: string | number;
}

export interface AiChart {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: AiChartDataPoint[];
  dataKey: string | string[];
  categoryKey: string;
  trendLineKey?: string;
  stacked?: boolean;
}

export interface AiApiResponse {
  text_response?: string;
  chart_response?: AiChart;
}

// UPDATED PERFORMANCE INTERFACES WITH ALL REQUIRED PROPERTIES
export interface SetterPerformance {
  uid: string;
  name: string;
  totalLeads: number;
  soldLeads: number;
  conversionRate: number;
  immediateLeads: number;
  scheduledLeads: number;
  avgLeadsPerDay?: number;
  // Additional properties expected by components
  sitCount: number;
  sitRate: number;
  failedCreditCount: number;
  failedCreditRate: number;
  immediateDispatchCount: number;
  immediateDispatchPercentage: number;
  scheduledDispatchCount: number;
  cancelNoShowCount: number;
  cancelNoShowRate: number;
}

export interface CloserPerformance {
  uid: string;
  name: string;
  totalAssigned: number;
  totalSold: number;
  totalNoSale: number;
  totalFailedCredits: number;
  closingRatio: number;
  closingPercentage: number;
  avgDealsPerDay?: number;
  // Additional properties expected by components
  soldCount: number;
  closeRate: number;
  noSaleCount: number;
  failedCreditCount: number;
  selfGenCount: number;
  selfGenRate: number;
  conversionRate: number;
}

export interface TeamMetrics {
  totalLeads: number;
  totalSold: number;
  conversionRate: number;
  totalSetters: number;
  totalClosers: number;
  activeClosers: number;
  avgLeadsPerSetter: number;
  avgSalesPerCloser: number;
  // Additional properties expected by components
  samedaySitRate?: number;
  scheduledSitRate?: number;
  samedaySitCloseRate?: number;
  scheduledAppointmentCloseRate?: number;
}

export interface TrendData {
  date: string;
  leads: number;
  sales: number;
  conversionRate: number;
  // Additional properties expected by components
  totalLeads: number;
  sitRate: number;
  closeRate: number;
  isSpecialPoint?: boolean;
  pointType?: 'today' | 'projection';
}
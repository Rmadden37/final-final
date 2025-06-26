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
  // Add other lead properties as needed
}

export interface Closer {
  uid: string;
  teamId: string;
  name: string;
  // Add other closer properties as needed
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

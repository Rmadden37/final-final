// Analytics types and interfaces

export interface SetterPerformance {
  uid: string;
  name: string;
  totalLeads: number;
  sitCount: number;
  sitRate: number;
  failedCreditCount: number;
  failedCreditRate: number;
  immediateDispatchCount: number;
  scheduledDispatchCount: number;
  immediateDispatchPercentage: number;
  cancelNoShowCount: number;
  cancelNoShowRate: number;
  avgLeadsPerDay: number;
}

export interface CloserPerformance {
  uid: string;
  name: string;
  totalAssigned: number;
  soldCount: number;
  noSaleCount: number;
  failedCreditCount: number;
  closeRate: number;
  selfGenCount: number;
  selfGenRate: number;
  avgLeadsPerDay: number;
  conversionRate: number;
}

export interface TeamMetrics {
  totalLeads: number;
  totalSetters: number;
  totalClosers: number;
  avgCloseRate: number;
  avgSitRate: number;
  totalRevenue: number;
  avgRevenuePerLead: number;
  conversionRate: number;
  canceledLeadRate: number;
  samedaySitCloseRate: number;
  scheduledAppointmentCloseRate: number;
  samedaySitRate: number;
  scheduledSitRate: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
}

export interface TrendData {
  date: string;
  totalLeads: number;
  sitRate: number;
  closeRate: number;
}

export interface PerformanceDashboardProps {
  className?: string;
}

export const chartConfig = {
  total: { label: "Total Leads", color: "hsl(185 85% 45%)" },
  sitRate: { label: "Sit Rate", color: "hsl(145 65% 50%)" },
  closeRate: { label: "Close Rate", color: "hsl(25 75% 55%)" },
  failedCredit: { label: "Failed Credit", color: "hsl(358 75% 58%)" },
  cancelNoShow: { label: "Cancel/No Show", color: "hsl(280 50% 55%)" },
  selfGen: { label: "Self-Generated", color: "hsl(45 85% 55%)" },
  immediate: { label: "Immediate", color: "hsl(200 70% 50%)" }
};

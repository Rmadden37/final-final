import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SetterPerformance, CloserPerformance, TeamMetrics, TrendData, Lead, Closer } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to safely convert timestamp to Date
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

// Calculate all setter performance metrics (returns array of all setters)
export function calculateSetterPerformance(leads: Lead[]): SetterPerformance[] {
  const setterMap = new Map<string, SetterPerformance>();
  
  // Group leads by setter
  leads.forEach(lead => {
    const setterId = lead.setterId;
    const setterName = lead.setterName || 'Unknown';
    
    if (!setterMap.has(setterId)) {
      setterMap.set(setterId, {
        uid: setterId,
        name: setterName,
        totalLeads: 0,
        soldLeads: 0,
        conversionRate: 0,
        immediateLeads: 0,
        scheduledLeads: 0,
        sitCount: 0,
        sitRate: 0,
        failedCreditCount: 0,
        failedCreditRate: 0,
        immediateDispatchCount: 0,
        immediateDispatchPercentage: 0,
        scheduledDispatchCount: 0,
        cancelNoShowCount: 0,
        cancelNoShowRate: 0,
        avgLeadsPerDay: 0,
      });
    }
    
    const setter = setterMap.get(setterId)!;
    setter.totalLeads++;
    
    // Count by status
    if (lead.status === 'sold') {
      setter.soldLeads++;
    }
    
    // Count sits (not canceled or no_show)
    if (lead.status !== 'canceled' && lead.status !== 'no_show') {
      setter.sitCount++;
    }
    
    // Count failed credits
    if (lead.status === 'credit_fail') {
      setter.failedCreditCount++;
    }
    
    // Count cancel/no shows
    if (lead.status === 'canceled' || lead.status === 'no_show') {
      setter.cancelNoShowCount++;
    }
    
    // Count by dispatch type
    if (lead.dispatchType === 'immediate') {
      setter.immediateLeads++;
      setter.immediateDispatchCount++;
    } else if (lead.dispatchType === 'scheduled') {
      setter.scheduledLeads++;
      setter.scheduledDispatchCount++;
    }
  });
  
  // Calculate percentages and averages
  setterMap.forEach((setter) => {
    setter.conversionRate = setter.totalLeads > 0 ? (setter.soldLeads / setter.totalLeads) * 100 : 0;
    setter.sitRate = setter.totalLeads > 0 ? (setter.sitCount / setter.totalLeads) * 100 : 0;
    setter.failedCreditRate = setter.totalLeads > 0 ? (setter.failedCreditCount / setter.totalLeads) * 100 : 0;
    setter.cancelNoShowRate = setter.totalLeads > 0 ? (setter.cancelNoShowCount / setter.totalLeads) * 100 : 0;
    setter.immediateDispatchPercentage = setter.totalLeads > 0 ? (setter.immediateDispatchCount / setter.totalLeads) * 100 : 0;
    
    // Calculate average leads per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLeads = leads.filter(lead => 
      lead.setterId === setter.uid && toDate(lead.createdAt) >= thirtyDaysAgo
    );
    setter.avgLeadsPerDay = recentLeads.length / 30;
  });
  
  return Array.from(setterMap.values());
}

// Calculate all closer performance metrics (returns array of all closers)
export function calculateCloserPerformance(leads: Lead[]): CloserPerformance[] {
  const closerMap = new Map<string, CloserPerformance>();
  
  // Group leads by closer
  leads.forEach(lead => {
    if (!lead.assignedCloserId) return;
    
    const closerId = lead.assignedCloserId;
    const closerName = lead.assignedCloserName || 'Unknown';
    
    if (!closerMap.has(closerId)) {
      closerMap.set(closerId, {
        uid: closerId,
        name: closerName,
        totalAssigned: 0,
        totalSold: 0,
        totalNoSale: 0,
        totalFailedCredits: 0,
        closingRatio: 0,
        closingPercentage: 0,
        soldCount: 0,
        closeRate: 0,
        noSaleCount: 0,
        failedCreditCount: 0,
        selfGenCount: 0,
        selfGenRate: 0,
        conversionRate: 0,
        avgDealsPerDay: 0,
      });
    }
    
    const closer = closerMap.get(closerId)!;
    closer.totalAssigned++;
    
    // Count by status
    if (lead.status === 'sold') {
      closer.totalSold++;
      closer.soldCount++;
    } else if (lead.status === 'no_sale') {
      closer.totalNoSale++;
      closer.noSaleCount++;
    } else if (lead.status === 'credit_fail') {
      closer.totalFailedCredits++;
      closer.failedCreditCount++;
    }
    
    // Count self-generated (assuming it's when setter and closer are same person)
    if (lead.setterId === lead.assignedCloserId) {
      closer.selfGenCount++;
    }
  });
  
  // Calculate percentages and averages
  closerMap.forEach((closer) => {
    closer.closingRatio = closer.totalAssigned > 0 ? closer.totalSold / closer.totalAssigned : 0;
    closer.closingPercentage = closer.totalAssigned > 0 ? (closer.totalSold / closer.totalAssigned) * 100 : 0;
    closer.closeRate = closer.closingPercentage;
    closer.conversionRate = closer.closingPercentage;
    closer.selfGenRate = closer.totalAssigned > 0 ? (closer.selfGenCount / closer.totalAssigned) * 100 : 0;
    
    // Calculate average deals per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLeads = leads.filter(lead => 
      lead.assignedCloserId === closer.uid && toDate(lead.createdAt) >= thirtyDaysAgo
    );
    closer.avgDealsPerDay = recentLeads.length / 30;
  });
  
  return Array.from(closerMap.values());
}

// Calculate team metrics (now only takes leads and closers array)
export function calculateTeamMetrics(leads: Lead[], closers: Closer[]): TeamMetrics {
  const soldLeads = leads.filter(lead => lead.status === 'sold');
  const uniqueSetters = new Set(leads.map(lead => lead.setterId)).size;
  const uniqueClosers = new Set(leads.map(lead => lead.assignedCloserId).filter(Boolean)).size;
  const activeClosers = closers.filter(closer => closer.status === 'On Duty').length;
  
  // Calculate sit rates for immediate vs scheduled
  const immediateLeads = leads.filter(lead => lead.dispatchType === 'immediate');
  const scheduledLeads = leads.filter(lead => lead.dispatchType === 'scheduled');
  
  const immediateSits = immediateLeads.filter(lead => lead.status !== 'canceled' && lead.status !== 'no_show');
  const scheduledSits = scheduledLeads.filter(lead => lead.status !== 'canceled' && lead.status !== 'no_show');
  
  const immediateSales = immediateLeads.filter(lead => lead.status === 'sold');
  const scheduledSales = scheduledLeads.filter(lead => lead.status === 'sold');
  
  return {
    totalLeads: leads.length,
    totalSold: soldLeads.length,
    conversionRate: leads.length > 0 ? (soldLeads.length / leads.length) * 100 : 0,
    totalSetters: uniqueSetters,
    totalClosers: uniqueClosers,
    activeClosers,
    avgLeadsPerSetter: uniqueSetters > 0 ? leads.length / uniqueSetters : 0,
    avgSalesPerCloser: uniqueClosers > 0 ? soldLeads.length / uniqueClosers : 0,
    samedaySitRate: immediateLeads.length > 0 ? (immediateSits.length / immediateLeads.length) * 100 : 0,
    scheduledSitRate: scheduledLeads.length > 0 ? (scheduledSits.length / scheduledLeads.length) * 100 : 0,
    samedaySitCloseRate: immediateSits.length > 0 ? (immediateSales.length / immediateSits.length) * 100 : 0,
    scheduledAppointmentCloseRate: scheduledSits.length > 0 ? (scheduledSales.length / scheduledSits.length) * 100 : 0,
  };
}

// Generate trend data for charts
export function generateTrendData(leads: Lead[], days: number = 30): TrendData[] {
  const today = new Date();
  const trendData: TrendData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const dayLeads = leads.filter(lead => {
      const leadDate = toDate(lead.createdAt);
      return leadDate.toISOString().split('T')[0] === dateString;
    });
    
    const daySales = dayLeads.filter(lead => lead.status === 'sold');
    const daySits = dayLeads.filter(lead => lead.status !== 'canceled' && lead.status !== 'no_show');
    
    trendData.push({
      date: dateString,
      leads: dayLeads.length,
      sales: daySales.length,
      conversionRate: dayLeads.length > 0 ? (daySales.length / dayLeads.length) * 100 : 0,
      totalLeads: dayLeads.length,
      sitRate: dayLeads.length > 0 ? (daySits.length / dayLeads.length) * 100 : 0,
      closeRate: dayLeads.length > 0 ? (daySales.length / dayLeads.length) * 100 : 0,
    });
  }
  
  return trendData;
}

// Export data to CSV
export function exportToCSV(data: { setterPerformance: SetterPerformance[], closerPerformance: CloserPerformance[], teamMetrics: TeamMetrics }, filename: string): void {
  // Flatten the data for CSV export
  const csvData = [
    // Add team metrics as first row
    {
      type: 'Team Metrics',
      name: 'Team Total',
      totalLeads: data.teamMetrics.totalLeads,
      totalSold: data.teamMetrics.totalSold,
      conversionRate: data.teamMetrics.conversionRate,
      totalSetters: data.teamMetrics.totalSetters,
      totalClosers: data.teamMetrics.totalClosers,
      activeClosers: data.teamMetrics.activeClosers,
    },
    // Add setter data
    ...data.setterPerformance.map(setter => ({
      type: 'Setter',
      name: setter.name,
      totalLeads: setter.totalLeads,
      soldLeads: setter.soldLeads,
      conversionRate: setter.conversionRate,
      sitRate: setter.sitRate,
      avgLeadsPerDay: setter.avgLeadsPerDay,
    })),
    // Add closer data
    ...data.closerPerformance.map(closer => ({
      type: 'Closer',
      name: closer.name,
      totalAssigned: closer.totalAssigned,
      totalSold: closer.totalSold,
      closeRate: closer.closeRate,
      conversionRate: closer.conversionRate,
      avgDealsPerDay: closer.avgDealsPerDay,
    }))
  ];
  
  if (csvData.length === 0) return;
  
  const headers = Object.keys(csvData[0]);
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => 
      headers.map(header => {
        const value = (row as any)[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `performance-analytics-${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
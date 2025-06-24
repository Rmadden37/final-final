// Analytics utility functions and calculations
import { Lead, Closer } from "@/types";
import { SetterPerformance, CloserPerformance, TeamMetrics, TrendData } from "./types";

export const calculateSetterPerformance = (leads: Lead[]): SetterPerformance[] => {
  try {
    // Ensure leads is an array and not null/undefined
    const safeLeads = Array.isArray(leads) ? leads : [];
    const setterMap = new Map<string, SetterPerformance>();

    safeLeads.forEach(lead => {
      if (!lead || !lead.setterId || !lead.setterName) return;

      const existing = setterMap.get(lead.setterId) || {
        uid: lead.setterId,
        name: lead.setterName,
        totalLeads: 0,
        sitCount: 0,
        sitRate: 0,
        failedCreditCount: 0,
        failedCreditRate: 0,
        immediateDispatchCount: 0,
        scheduledDispatchCount: 0,
        immediateDispatchPercentage: 0,
        cancelNoShowCount: 0,
        cancelNoShowRate: 0,
        avgLeadsPerDay: 0
      };

      existing.totalLeads++;

      // Count sits (actual appointments that showed up) - sold and no_sale only
      if (['sold', 'no_sale'].includes(lead.status)) {
        existing.sitCount++;
      }

      // Count failed credit
      if (lead.status === 'credit_fail') {
        existing.failedCreditCount++;
      }

      // Count dispatch types
      if (lead.dispatchType === 'immediate') {
        existing.immediateDispatchCount++;
      } else if (lead.dispatchType === 'scheduled') {
        existing.scheduledDispatchCount++;
      }

      // Count cancellations and no-shows
      if (lead.status === 'canceled') {
        existing.cancelNoShowCount++;
      }

      setterMap.set(lead.setterId, existing);
    });

    // Calculate rates and averages
    const daysInRange = 30; // Default to 30 days
    return Array.from(setterMap.values()).map(setter => ({
      ...setter,
      sitRate: setter.totalLeads > 0 ? (setter.sitCount / setter.totalLeads) * 100 : 0,
      failedCreditRate: setter.totalLeads > 0 ? (setter.failedCreditCount / setter.totalLeads) * 100 : 0,
      immediateDispatchPercentage: setter.totalLeads > 0 ? (setter.immediateDispatchCount / setter.totalLeads) * 100 : 0,
      cancelNoShowRate: setter.totalLeads > 0 ? (setter.cancelNoShowCount / setter.totalLeads) * 100 : 0,
      avgLeadsPerDay: setter.totalLeads / daysInRange
    }));
  } catch (error) {
    console.error("Error calculating setter performance:", error);
    return [];
  }
};

export const calculateCloserPerformance = (leads: Lead[]): CloserPerformance[] => {
  try {
    // Ensure leads is an array and not null/undefined
    const safeLeads = Array.isArray(leads) ? leads : [];
    const closerMap = new Map<string, CloserPerformance>();

    safeLeads.forEach(lead => {
      // Use assignedCloserId and assignedCloserName from the actual Lead type
      if (!lead || !lead.assignedCloserId || !lead.assignedCloserName) return;

      const existing = closerMap.get(lead.assignedCloserId) || {
        uid: lead.assignedCloserId,
        name: lead.assignedCloserName,
        totalAssigned: 0,
        soldCount: 0,
        noSaleCount: 0,
        failedCreditCount: 0,
        closeRate: 0,
        selfGenCount: 0,
        selfGenRate: 0,
        avgLeadsPerDay: 0,
        conversionRate: 0
      };

      existing.totalAssigned++;

      if (lead.status === 'sold') {
        existing.soldCount++;
      } else if (lead.status === 'no_sale') {
        existing.noSaleCount++;
      } else if (lead.status === 'credit_fail') {
        existing.failedCreditCount++;
      }

      // Note: Self-generated tracking would need to be added to Lead type
      // For now, this will be 0 since the property doesn't exist

      closerMap.set(lead.assignedCloserId, existing);
    });

    const daysInRange = 30;
    return Array.from(closerMap.values()).map(closer => ({
      ...closer,
      closeRate: closer.totalAssigned > 0 ? (closer.soldCount / closer.totalAssigned) * 100 : 0,
      selfGenRate: closer.totalAssigned > 0 ? (closer.selfGenCount / closer.totalAssigned) * 100 : 0,
      conversionRate: closer.totalAssigned > 0 ? (closer.soldCount / closer.totalAssigned) * 100 : 0,
      avgLeadsPerDay: closer.totalAssigned / daysInRange
    }));
  } catch (error) {
    console.error("Error calculating closer performance:", error);
    return [];
  }
};

export const calculateTeamMetrics = (
  leads: Lead[], 
  setterPerformance: SetterPerformance[], 
  closerPerformance: CloserPerformance[]
): TeamMetrics => {
  try {
    // Ensure leads is an array and not null/undefined
    const safeLeads = Array.isArray(leads) ? leads : [];
    const safeSetterPerformance = Array.isArray(setterPerformance) ? setterPerformance : [];
    const safeCloserPerformance = Array.isArray(closerPerformance) ? closerPerformance : [];
    
    const totalSits = safeLeads.filter(lead => 
      lead && lead.status && ['sold', 'no_sale', 'credit_fail'].includes(lead.status)
    ).length;
    const totalSold = safeLeads.filter(lead => 
      lead && lead.status === 'sold'
    ).length;
    
    // Calculate canceled lead rate (now displayed as "Scheduled Appointments That Close %")
    const canceledLeads = safeLeads.filter(lead => 
      lead && lead.status === 'canceled'
    ).length;
    const canceledLeadRate = safeLeads.length > 0 ? (canceledLeads / safeLeads.length) * 100 : 0;
    
    // Calculate same-day sits that close (now displayed as "Sameday Close %")
    const samedaySits = safeLeads.filter(lead => 
      lead && lead.dispatchType === 'immediate' && ['sold', 'no_sale', 'credit_fail'].includes(lead.status)
    );
    const samedaySold = safeLeads.filter(lead => 
      lead && lead.dispatchType === 'immediate' && lead.status === 'sold'
    ).length;
    const samedaySitCloseRate = samedaySits.length > 0 ? (samedaySold / samedaySits.length) * 100 : 0;
    
    // Calculate scheduled appointments that close (now displayed as "Failed Credits %")
    const scheduledAppointments = safeLeads.filter(lead => 
      lead && lead.dispatchType === 'scheduled' && ['sold', 'no_sale', 'credit_fail'].includes(lead.status)
    );
    const scheduledSold = safeLeads.filter(lead => 
      lead && lead.dispatchType === 'scheduled' && lead.status === 'sold'
    ).length;
    const scheduledAppointmentCloseRate = scheduledAppointments.length > 0 ? (scheduledSold / scheduledAppointments.length) * 100 : 0;
    
    // Calculate sameday sit rate (percentage of immediate leads that actually sit)
    const samedayLeads = safeLeads.filter(lead => 
      lead && lead.dispatchType === 'immediate'
    );
    const samedaySitRate = samedayLeads.length > 0 ? (samedaySits.length / samedayLeads.length) * 100 : 0;
    
    // Calculate scheduled sit rate (percentage of scheduled leads that actually sit)
    const scheduledLeads = safeLeads.filter(lead => 
      lead && lead.dispatchType === 'scheduled'
    );
    const scheduledSitRate = scheduledLeads.length > 0 ? (scheduledAppointments.length / scheduledLeads.length) * 100 : 0;
    
    // Note: saleAmount doesn't exist on Lead type, so totalRevenue will be 0
    const totalRevenue = 0; // Would need saleAmount property on Lead

    return {
      totalLeads: safeLeads.length,
      totalSetters: safeSetterPerformance.length,
      totalClosers: safeCloserPerformance.length,
      avgSitRate: safeLeads.length > 0 ? (totalSits / safeLeads.length) * 100 : 0,
      avgCloseRate: totalSits > 0 ? (totalSold / totalSits) * 100 : 0,
      totalRevenue,
      avgRevenuePerLead: safeLeads.length > 0 ? totalRevenue / safeLeads.length : 0,
      conversionRate: safeLeads.length > 0 ? (totalSold / safeLeads.length) * 100 : 0,
      canceledLeadRate,
      samedaySitCloseRate,
      scheduledAppointmentCloseRate,
      samedaySitRate,
      scheduledSitRate,
      leadsToday: 0, // Would need date calculation
      leadsThisWeek: 0, // Would need date calculation  
      leadsThisMonth: safeLeads.length // Simplified for now
    };
  } catch (error) {
    console.error("Error calculating team metrics:", error);
    return {
      totalLeads: 0,
      totalSetters: 0,
      totalClosers: 0,
      avgSitRate: 0,
      avgCloseRate: 0,
      totalRevenue: 0,
      avgRevenuePerLead: 0,
      conversionRate: 0,
      canceledLeadRate: 0,
      samedaySitCloseRate: 0,
      scheduledAppointmentCloseRate: 0,
      samedaySitRate: 0,
      scheduledSitRate: 0,
      leadsToday: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0
    };
  }
};

export const generateTrendData = (leads: Lead[]): TrendData[] => {
  try {
    const days = 7; // Last 7 days
    const trendData: TrendData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLeads = leads.filter(lead => {
        // Handle Firestore Timestamp properly
        const leadDate = lead.createdAt.toDate();
        return leadDate.toISOString().split('T')[0] === dateStr;
      });

      trendData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalLeads: dayLeads.length,
        sitRate: dayLeads.length > 0 ? dayLeads.filter(lead => ['sold', 'no_sale', 'credit_fail'].includes(lead.status)).length / dayLeads.length : 0,
        closeRate: dayLeads.length > 0 ? dayLeads.filter(lead => lead.status === 'sold').length / dayLeads.length : 0
      });
    }

    return trendData;
  } catch (error) {
    console.error("Error generating trend data:", error);
    return [];
  }
};

export const exportToCSV = (data: {
  setterPerformance: SetterPerformance[];
  closerPerformance: CloserPerformance[];
  teamMetrics: TeamMetrics;
}, dateRange: string) => {
  try {
    const csvContent = [
      ['Performance Report'],
      ['Date Range:', dateRange],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Team Metrics'],
      ['Total Leads:', data.teamMetrics.totalLeads],
      ['Avg Sit Rate:', `${data.teamMetrics.avgSitRate.toFixed(1)}%`],
      ['Avg Close Rate:', `${data.teamMetrics.avgCloseRate.toFixed(1)}%`],
      ['Scheduled Appointments That Close:', `${data.teamMetrics.canceledLeadRate.toFixed(1)}%`],
      ['Sameday Close Rate:', `${data.teamMetrics.samedaySitCloseRate.toFixed(1)}%`],
      ['Failed Credits Rate:', `${data.teamMetrics.scheduledAppointmentCloseRate.toFixed(1)}%`],
      [''],
      ['Setter Performance'],
      ['Name', 'Total Leads', 'Sits', 'Sit Rate', 'Avg/Day'],
      ...data.setterPerformance.map(s => [
        s.name,
        s.totalLeads,
        s.sitCount,
        `${s.sitRate.toFixed(1)}%`,
        s.avgLeadsPerDay.toFixed(1)
      ]),
      [''],
      ['Closer Performance'],
      ['Name', 'Assigned', 'Sold', 'Close Rate', 'Avg/Day'],
      ...data.closerPerformance.map(c => [
        c.name,
        c.totalAssigned,
        c.soldCount,
        `${c.closeRate.toFixed(1)}%`,
        c.avgLeadsPerDay.toFixed(1)
      ])
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${dateRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting CSV:", error);
  }
};

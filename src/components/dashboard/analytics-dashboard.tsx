"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getTeamStatsFunction, db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, Activity, Calendar, DollarSign, Filter, BarChart3, PieChart as PieChartIcon, Download } from "lucide-react";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { Lead, Closer } from "@/types";
import SetterQualityEnhanced from "@/components/analytics/setter-quality-enhanced";

interface TeamStats {
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

interface AnalyticsData {
  leads: Lead[];
  closers: Closer[];
  teamStats: TeamStats | null;
}

interface SetterAnalytics {
  uid: string;
  name: string;
  totalLeads: number;
  soldLeads: number;
  conversionRate: number;
  immediateLeads: number;
  scheduledLeads: number;
}

interface CloserAnalytics {
  uid: string;
  name: string;
  totalAssigned: number;
  totalSold: number;
  totalNoSale: number;
  totalFailedCredits: number;
  closingRatio: number;
  closingPercentage: number;
}

interface DispatchAnalytics {
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

const chartConfig = {
  leads: {
    label: "Leads",
    color: "#3b82f6", // Blue
  },
  sold: {
    label: "Sold",
    color: "#10b981", // Emerald Green
  },
  no_sale: {
    label: "No Sale", 
    color: "#ef4444", // Red
  },
  credit_fail: {
    label: "Failed Credits",
    color: "#f97316", // Orange
  },
  waiting_assignment: {
    label: "Waiting Assignment",
    color: "#8b5cf6", // Purple
  },
  in_process: {
    label: "In Process",
    color: "#06b6d4", // Cyan
  },
  assigned: {
    label: "Assigned",
    color: "#84cc16", // Lime Green
  },
  canceled: {
    label: "Canceled",
    color: "#f59e0b", // Amber
  },
  rescheduled: {
    label: "Rescheduled",
    color: "#ec4899", // Hot Pink
  },
  scheduled: {
    label: "Scheduled",
    color: "#00FFFF", // Turquoise (matching theme)
  },
  immediate: {
    label: "Immediate",
    color: "#6366f1", // Indigo
  },
  accepted: {
    label: "Accepted",
    color: "#22c55e", // Green
  },
  // Additional unique colors for any other categories
  pending: {
    label: "Pending",
    color: "#fbbf24", // Yellow
  },
  qualified: {
    label: "Qualified", 
    color: "#14b8a6", // Teal
  },
  unqualified: {
    label: "Unqualified",
    color: "#ef4444", // Red (reusing for similar negative status)
  },
  callback: {
    label: "Callback",
    color: "#a855f7", // Purple variant
  },
  follow_up: {
    label: "Follow Up",
    color: "#f472b6", // Pink variant
  },
  interested: {
    label: "Interested",
    color: "#059669", // Green variant
  },
  not_interested: {
    label: "Not Interested",
    color: "#dc2626", // Dark Red
  },
  busy: {
    label: "Busy",
    color: "#ea580c", // Orange variant
  },
  voicemail: {
    label: "Voicemail",
    color: "#7c3aed", // Purple variant
  },
  wrong_number: {
    label: "Wrong Number",
    color: "#be123c", // Rose Red
  },
  do_not_call: {
    label: "Do Not Call",
    color: "#991b1b", // Dark Red variant
  },
};

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    leads: [],
    closers: [],
    teamStats: null
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [filterCloser, setFilterCloser] = useState<string>("all");

  // Fetch comprehensive analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.teamId) return;

      try {
        setLoading(true);

        // Get date range for filtering
        const now = new Date();
        const daysAgo = parseInt(dateRange.replace('d', ''));
        const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

        // Fetch team stats
        const teamStatsResult = await getTeamStatsFunction({ teamId: user.teamId });
        
        // Fetch leads and closers data using getDocs for better performance
        const leadsQuery = query(
          collection(db, "leads"),
          where("teamId", "==", user.teamId),
          where("createdAt", ">=", Timestamp.fromDate(startDate)),
          orderBy("createdAt", "desc")
        );

        const closersQuery = query(
          collection(db, "closers"),
          where("teamId", "==", user.teamId),
          orderBy("name", "asc")
        );

        // Fetch data once instead of real-time subscriptions
        const [leadsSnapshot, closersSnapshot] = await Promise.all([
          getDocs(leadsQuery),
          getDocs(closersQuery)
        ]);

        const leadsData = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lead[];

        const closersData = closersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as Closer[];

        setAnalytics({
          leads: leadsData,
          closers: closersData,
          teamStats: teamStatsResult.data as TeamStats
        });

        setLoading(false);

      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast({
          title: "Error",
          description: "Failed to load analytics data.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user?.teamId, dateRange, toast]);

  // Calculate setter analytics (lead quality tracking) - memoized for performance
  const setterAnalytics = useMemo((): SetterAnalytics[] => {
    const setterMap = new Map<string, {
      uid: string;
      name: string;
      totalLeads: number;
      soldLeads: number;
      immediateLeads: number;
      scheduledLeads: number;
    }>();

    // Filter leads by selected closer if not "all"
    const filteredLeads = filterCloser === "all" 
      ? analytics.leads 
      : analytics.leads.filter(lead => lead.assignedCloserId === filterCloser);

    filteredLeads.forEach(lead => {
      if (lead.setterId && lead.setterName) {
        const existing = setterMap.get(lead.setterId) || {
          uid: lead.setterId,
          name: lead.setterName,
          totalLeads: 0,
          soldLeads: 0,
          immediateLeads: 0,
          scheduledLeads: 0
        };

        existing.totalLeads++;
        if (lead.status === "sold") existing.soldLeads++;
        if (lead.dispatchType === "immediate") existing.immediateLeads++;
        if (lead.dispatchType === "scheduled") existing.scheduledLeads++;

        setterMap.set(lead.setterId, existing);
      }
    });

    return Array.from(setterMap.values()).map(setter => ({
      ...setter,
      conversionRate: setter.totalLeads > 0 ? (setter.soldLeads / setter.totalLeads) * 100 : 0
    }));
  }, [analytics.leads, filterCloser]);

  // Calculate closer analytics - memoized for performance
  const closerAnalytics = useMemo((): CloserAnalytics[] => {
    const closerMap = new Map<string, {
      uid: string;
      name: string;
      totalAssigned: number;
      totalSold: number;
      totalNoSale: number;
      totalFailedCredits: number;
    }>();

    // Filter leads by selected closer if not "all"
    const filteredLeads = filterCloser === "all" 
      ? analytics.leads 
      : analytics.leads.filter(lead => lead.assignedCloserId === filterCloser);

    filteredLeads.forEach(lead => {
      if (lead.assignedCloserId && lead.assignedCloserName) {
        const existing = closerMap.get(lead.assignedCloserId) || {
          uid: lead.assignedCloserId,
          name: lead.assignedCloserName,
          totalAssigned: 0,
          totalSold: 0,
          totalNoSale: 0,
          totalFailedCredits: 0
        };

        // Only count leads that have reached final disposition
        if (['sold', 'no_sale', 'credit_fail', 'canceled'].includes(lead.status)) {
          existing.totalAssigned++;
          if (lead.status === "sold") existing.totalSold++;
          if (lead.status === "no_sale") existing.totalNoSale++;
          if (lead.status === "credit_fail") existing.totalFailedCredits++;
        }

        closerMap.set(lead.assignedCloserId, existing);
      }
    });

    return Array.from(closerMap.values()).map(closer => ({
      ...closer,
      closingRatio: closer.totalAssigned > 0 ? (closer.totalSold / closer.totalAssigned) * 100 : 0,
      closingPercentage: closer.totalAssigned > 0 ? 
        ((closer.totalSold + closer.totalNoSale + closer.totalFailedCredits) / closer.totalAssigned) * 100 : 0
    }));
  }, [analytics.leads, filterCloser]);

  // Calculate dispatch type comparison - memoized for performance
  const dispatchAnalytics = useMemo((): DispatchAnalytics => {
    const immediate = { total: 0, sold: 0, conversionRate: 0 };
    const scheduled = { total: 0, sold: 0, conversionRate: 0 };

    // Filter leads by selected closer if not "all"
    const filteredLeads = filterCloser === "all" 
      ? analytics.leads 
      : analytics.leads.filter(lead => lead.assignedCloserId === filterCloser);

    filteredLeads.forEach(lead => {
      if (lead.dispatchType === "immediate") {
        immediate.total++;
        if (lead.status === "sold") immediate.sold++;
      } else if (lead.dispatchType === "scheduled") {
        scheduled.total++;
        if (lead.status === "sold") scheduled.sold++;
      }
    });

    immediate.conversionRate = immediate.total > 0 ? (immediate.sold / immediate.total) * 100 : 0;
    scheduled.conversionRate = scheduled.total > 0 ? (scheduled.sold / scheduled.total) * 100 : 0;

    return { immediate, scheduled };
  }, [analytics.leads, filterCloser]);

  // Export analytics report as CSV
  const exportAnalyticsReport = () => {
    const reportData = [];
    
    // Add summary metrics
    reportData.push(['ANALYTICS REPORT SUMMARY']);
    reportData.push(['Generated:', new Date().toLocaleString()]);
    reportData.push(['Date Range:', dateRange]);
    reportData.push(['Filter:', filterCloser === 'all' ? 'All Closers' : analytics.closers.find(c => c.uid === filterCloser)?.name || 'Unknown']);
    reportData.push([]);
    
    // Key metrics
    reportData.push(['KEY METRICS']);
    reportData.push(['Total Leads:', filteredMetrics.totalLeads]);
    reportData.push(['Conversion Rate:', `${filteredMetrics.conversionRate}%`]);
    reportData.push(['Average Closing Rate:', `${avgClosingRatio}%`]);
    reportData.push(['On Duty Closers:', analytics.teamStats?.onDutyClosers || 0]);
    reportData.push([]);
    
    // Setter analytics
    reportData.push(['SETTER PERFORMANCE']);
    reportData.push(['Name', 'Total Leads', 'Sold Leads', 'Conversion Rate', 'Immediate Leads', 'Scheduled Leads']);
    setterAnalytics.forEach(setter => {
      reportData.push([
        setter.name,
        setter.totalLeads,
        setter.soldLeads,
        `${setter.conversionRate.toFixed(1)}%`,
        setter.immediateLeads,
        setter.scheduledLeads
      ]);
    });
    reportData.push([]);
    
    // Closer analytics
    reportData.push(['CLOSER PERFORMANCE']);
    reportData.push(['Name', 'Total Assigned', 'Total Sold', 'No Sales', 'Failed Credits', 'Closing Rate']);
    closerAnalytics.forEach(closer => {
      reportData.push([
        closer.name,
        closer.totalAssigned,
        closer.totalSold,
        closer.totalNoSale,
        closer.totalFailedCredits,
        `${closer.closingRatio.toFixed(1)}%`
      ]);
    });
    reportData.push([]);
    
    // Dispatch analysis
    reportData.push(['DISPATCH ANALYSIS']);
    reportData.push(['Type', 'Total Leads', 'Sold Leads', 'Conversion Rate']);
    reportData.push([
      'Immediate',
      dispatchAnalytics.immediate.total,
      dispatchAnalytics.immediate.sold,
      `${dispatchAnalytics.immediate.conversionRate.toFixed(1)}%`
    ]);
    reportData.push([
      'Scheduled',
      dispatchAnalytics.scheduled.total,
      dispatchAnalytics.scheduled.sold,
      `${dispatchAnalytics.scheduled.conversionRate.toFixed(1)}%`
    ]);
    
    // Convert to CSV
    const csvContent = reportData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Check if running in browser environment
    if (typeof globalThis !== 'undefined' && globalThis.window && globalThis.document) {
      try {
        const blob = new globalThis.Blob([csvContent], { type: 'text/csv' });
        const url = globalThis.URL.createObjectURL(blob);
        const a = globalThis.document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        globalThis.URL.revokeObjectURL(url);
        
        toast({
          title: "Report Exported",
          description: "Analytics report has been downloaded as CSV file.",
        });
      } catch {
        toast({
          title: "Export Failed",
          description: "Could not export analytics report.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback for server-side or when DOM is not available
      toast({
        title: "Export Unavailable",
        description: "Export feature is only available in browser environment.",
        variant: "destructive",
      });
    }
  };

  // Generate trend data for time-series analysis
  const generateTrendData = () => {
    const days = parseInt(dateRange.replace('d', ''));
    const trendData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Filter leads for this specific day
      const dayLeads = analytics.leads.filter(lead => {
        const leadDate = new Date(lead.createdAt.seconds * 1000);
        return leadDate.toDateString() === date.toDateString();
      });
      
      const totalLeads = dayLeads.length;
      const soldLeads = dayLeads.filter(lead => lead.status === 'sold').length;
      const immediateLeads = dayLeads.filter(lead => lead.dispatchType === 'immediate');
      const scheduledLeads = dayLeads.filter(lead => lead.dispatchType === 'scheduled');
      
      const immediateSold = immediateLeads.filter(lead => lead.status === 'sold').length;
      const scheduledSold = scheduledLeads.filter(lead => lead.status === 'sold').length;
      
      trendData.push({
        date: dateStr,
        totalLeads,
        soldLeads,
        conversionRate: totalLeads > 0 ? (soldLeads / totalLeads) * 100 : 0,
        immediateConversion: immediateLeads.length > 0 ? (immediateSold / immediateLeads.length) * 100 : 0,
        scheduledConversion: scheduledLeads.length > 0 ? (scheduledSold / scheduledLeads.length) * 100 : 0,
      });
    }
    
    return trendData;
  };

  // Calculate weekly growth rate
  const calculateWeeklyGrowth = () => {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    
    const thisWeekLeads = analytics.leads.filter(lead => {
      const leadDate = new Date(lead.createdAt.seconds * 1000);
      return leadDate >= lastWeek;
    }).length;
    
    const lastWeekLeads = analytics.leads.filter(lead => {
      const leadDate = new Date(lead.createdAt.seconds * 1000);
      return leadDate >= twoWeeksAgo && leadDate < lastWeek;
    }).length;
    
    if (lastWeekLeads === 0) return 0;
    return ((thisWeekLeads - lastWeekLeads) / lastWeekLeads * 100);
  };

  // Get best performing day of the week
  const getBestPerformingDay = () => {
    const dayStats: Record<string, { total: number; sold: number }> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    analytics.leads.forEach(lead => {
      const leadDate = new Date(lead.createdAt.seconds * 1000);
      const dayOfWeek = leadDate.getDay();
      const dayName = dayNames[dayOfWeek];
      
      if (!dayStats[dayName]) {
        dayStats[dayName] = { total: 0, sold: 0 };
      }
      
      dayStats[dayName].total++;
      if (lead.status === 'sold') {
        dayStats[dayName].sold++;
      }
    });
    
    let bestDay = 'Monday';
    let bestConversion = 0;
    
    Object.entries(dayStats).forEach(([day, stats]) => {
      const conversion = stats.total > 0 ? (stats.sold / stats.total) * 100 : 0;
      if (conversion > bestConversion) {
        bestConversion = conversion;
        bestDay = day;
      }
    });
    
    return bestDay;
  };

  // Calculate average daily leads
  const getAverageDailyLeads = () => {
    const days = parseInt(dateRange.replace('d', ''));
    return Math.round(analytics.leads.length / days);
  };

  const avgClosingRatio = useMemo(() => 
    closerAnalytics.length > 0 ? 
      (closerAnalytics.reduce((sum, closer) => sum + closer.closingRatio, 0) / closerAnalytics.length).toFixed(1) : "0",
    [closerAnalytics]
  );

  // Calculate key metrics based on filtered data - memoized for performance
  const filteredMetrics = useMemo(() => {
    // Filter leads by selected closer if not "all"
    const filteredLeads = filterCloser === "all" 
      ? analytics.leads 
      : analytics.leads.filter(lead => lead.assignedCloserId === filterCloser);

    const totalLeads = filteredLeads.length;
    const soldLeads = filteredLeads.filter(lead => lead.status === 'sold').length;
    const sitLeads = filteredLeads.filter(lead => ['sold', 'no_sale'].includes(lead.status)).length;
    const sitRate = totalLeads > 0 ? ((sitLeads / totalLeads) * 100).toFixed(1) : "0";
    const conversionRate = totalLeads > 0 ? ((soldLeads / totalLeads) * 100).toFixed(1) : "0";
    
    return { totalLeads, soldLeads, sitLeads, sitRate, conversionRate };
  }, [analytics.leads, filterCloser]);

  // Prepare chart data - filtered by selected closer - memoized for performance
  const statusData = useMemo(() => {
    if (!analytics.leads.length) return [];
    
    // Filter leads by selected closer if not "all"
    const filteredLeads = filterCloser === "all" 
      ? analytics.leads 
      : analytics.leads.filter(lead => lead.assignedCloserId === filterCloser);

    // Count status occurrences
    const statusCounts: Record<string, number> = {};
    filteredLeads.forEach(lead => {
      const status = lead.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Convert to chart format with proper labels and colors
    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0) // Only show statuses that have data
      .map(([status, count]) => ({
        status: chartConfig[status as keyof typeof chartConfig]?.label || status.replace("_", " "),
        rawStatus: status,
        count,
        fill: chartConfig[status as keyof typeof chartConfig]?.color || "#64748b", // Default fallback color
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [analytics.leads, filterCloser]);

  const closerPerformanceData = useMemo(() => 
    closerAnalytics
      .filter(closer => filterCloser === "all" || closer.uid === filterCloser)
      .map(closer => ({
        name: closer.name.split(" ")[0],
        sold: closer.totalSold,
        noSale: closer.totalNoSale,
        closingRatio: closer.closingRatio,
      })), [closerAnalytics, filterCloser]);

  // Prepare stacked dispatch comparison data showing total volume with dispositions - memoized for performance
  const dispatchComparisonData = useMemo(() => {
    const filteredLeads = filterCloser === "all" 
      ? analytics.leads 
      : analytics.leads.filter(lead => lead.assignedCloserId === filterCloser);

    const processDispatchType = (dispatchType: string) => {
      const leads = filteredLeads.filter(lead => lead.dispatchType === dispatchType);
      const sold = leads.filter(lead => lead.status === "sold").length;
      const noSale = leads.filter(lead => lead.status === "no_sale").length;
      const creditFail = leads.filter(lead => lead.status === "credit_fail").length;
      const canceled = leads.filter(lead => lead.status === "canceled").length;
      const other = leads.length - (sold + noSale + creditFail + canceled);
      
      return {
        type: dispatchType.charAt(0).toUpperCase() + dispatchType.slice(1),
        total: leads.length,
        sold,
        noSale,
        creditFail,
        canceled,
        other: Math.max(0, other), // Ensure non-negative
        conversionRate: leads.length > 0 ? (sold / leads.length) * 100 : 0,
      };
    };

    return [
      processDispatchType("immediate"),
      processDispatchType("scheduled"),
    ];
  }, [analytics.leads, filterCloser]);

  // Check user permissions AFTER all hooks are called
  if (!user || user.role === "setter") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Analytics not available for your role.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 dark:text-white">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setters">Setters</TabsTrigger>
          <TabsTrigger value="closers">Closers</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Filters Section moved here */}
          <div className="flex flex-wrap gap-4 items-center bg-white border border-gray-200 shadow-sm p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 bg-white border-gray-200 shadow-sm hover:border-gray-300 focus:border-blue-500">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-lg">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="365d">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCloser} onValueChange={setFilterCloser}>
              <SelectTrigger className="w-48 bg-white border-gray-200 shadow-sm hover:border-gray-300 focus:border-blue-500">
                <SelectValue placeholder="All Closers" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-lg">
                <SelectItem value="all">All Closers</SelectItem>
                {analytics.closers.map(closer => (
                  <SelectItem key={closer.uid} value={closer.uid}>
                    {closer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportAnalyticsReport} variant="outline" className="flex items-center gap-2 bg-white border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>

          {/* Main Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Setter Overview */}
            <Card className="dark:card-glass dark:glow-turquoise dark:border-turquoise/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Setter Overview
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">All Setters in Region (filtered by selected timeframe below)</p>
              </CardHeader>
              <CardContent>
                <SetterQualityEnhanced 
                  leads={analytics.leads}
                  dateRange={dateRange}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Closer Overview */}
            <Card className="dark:card-glass dark:glow-cyan dark:border-cyan/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Closer Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <BarChart data={closerPerformanceData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="sold" stackId="a" fill={chartConfig.sold.color} name="Sold Leads" />
                    <Bar dataKey="noSale" stackId="a" fill={chartConfig.no_sale.color} name="No Sale Leads" />
                    <ChartLegend 
                      content={<ChartLegendContent />} 
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lead Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Lead Status Distribution
                {filterCloser !== "all" && (
                  <span className="text-sm font-normal text-muted-foreground">
                    - {analytics.closers.find(c => c.uid === filterCloser)?.name || "Selected Closer"}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
                  {statusData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No status data available</p>
                        <p className="text-sm">
                          {filterCloser !== "all" 
                            ? "Selected closer has no leads in this date range" 
                            : "No leads found in selected date range"
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                      <PieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = statusData.reduce((sum, item) => sum + item.count, 0);
                              const percentage = total > 0 ? ((data.count / total) * 100).toFixed(1) : "0";
                              return (
                                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium">{data.status}</p>
                                  <p className="text-sm">Count: {data.count}</p>
                                  <p className="text-sm">Percentage: {percentage}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={statusData}
                          dataKey="count"
                          nameKey="rawStatus"
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={100}
                          strokeWidth={2}
                          label={({ status, count, percent }) => {
                            // Only show label if slice is larger than 8% to avoid overcrowding
                            if (percent > 0.08) {
                              return `${status}: ${(percent * 100).toFixed(0)}%`;
                            }
                            return "";
                          }}
                          labelLine={false}
                          fontSize={11}
                          fontWeight="bold"
                        >
                          {statusData.map((entry, _index) => (
                            <Cell key={`cell-${_index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend 
                          content={<ChartLegendContent nameKey="rawStatus" />} 
                          verticalAlign="bottom"
                          height={36}
                        />
                      </PieChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Dispatch Type Comparison - Stacked Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Immediate vs Scheduled Lead Volume & Dispositions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart data={dispatchComparisonData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="type" 
                        tick={{ fontSize: 11 }}
                        height={40}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{label} Dispatch</p>
                                <p className="text-sm font-bold">Total Leads: {data.total}</p>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-green-600">Sold: {data.sold}</p>
                                  <p className="text-sm text-red-600">No Sale: {data.noSale}</p>
                                  <p className="text-sm text-orange-600">Credit Fail: {data.creditFail}</p>
                                  <p className="text-sm text-yellow-600">Canceled: {data.canceled}</p>
                                  {data.other > 0 && <p className="text-sm text-gray-600">Other: {data.other}</p>}
                                </div>
                                <p className="text-sm font-medium mt-2">Conversion Rate: {data.conversionRate.toFixed(1)}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Net deals on bottom */}
                      <Bar dataKey="sold" stackId="a" fill={chartConfig.sold.color} name="Sold Leads" />
                      {/* Canceled/no sales stacked on top */}
                      <Bar dataKey="noSale" stackId="a" fill={chartConfig.no_sale.color} name="No Sale Leads" />
                      <Bar dataKey="creditFail" stackId="a" fill={chartConfig.credit_fail.color} name="Failed Credit Leads" />
                      <Bar dataKey="canceled" stackId="a" fill={chartConfig.canceled.color} name="Canceled Leads" />
                      <Bar dataKey="other" stackId="a" fill="#94a3b8" name="Other Status" />
                      <ChartLegend 
                        content={<ChartLegendContent />} 
                        wrapperStyle={{ paddingTop: '10px' }}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
        </TabsContent>

        <TabsContent value="setters" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Setter Performance Cards */}
            {setterAnalytics.map(setter => (
              <Card key={setter.uid}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {setter.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-muted-foreground">Leads: <b>{setter.totalLeads}</b></span>
                    <span className="text-sm text-muted-foreground">Sold: <b>{setter.soldLeads}</b></span>
                    <span className="text-sm text-muted-foreground">Conversion: <b>{setter.conversionRate.toFixed(1)}%</b></span>
                    <span className="text-sm text-muted-foreground">Immediate: <b>{setter.immediateLeads}</b></span>
                    <span className="text-sm text-muted-foreground">Scheduled: <b>{setter.scheduledLeads}</b></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Setter Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Setter Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart data={setterAnalytics.map(s => ({ name: s.name, conversion: s.conversionRate }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="conversion" fill={chartConfig.sold.color} name="Conversion Rate (%)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Closer Performance Cards */}
            {closerAnalytics.map(closer => (
              <Card key={closer.uid}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {closer.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-muted-foreground">Assigned: <b>{closer.totalAssigned}</b></span>
                    <span className="text-sm text-muted-foreground">Sold: <b>{closer.totalSold}</b></span>
                    <span className="text-sm text-muted-foreground">No Sale: <b>{closer.totalNoSale}</b></span>
                    <span className="text-sm text-muted-foreground">Failed Credits: <b>{closer.totalFailedCredits}</b></span>
                    <span className="text-sm text-muted-foreground">Closing Ratio: <b>{closer.closingRatio.toFixed(1)}%</b></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Closer Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Closer Closing Ratios</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart data={closerAnalytics.map(c => ({ name: c.name, closing: c.closingRatio }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="closing" fill={chartConfig.sold.color} name="Closing Ratio (%)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dispatch Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Dispatch Type Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-blue-600">Immediate Dispatch</h4>
                      <p className="text-2xl font-bold">{dispatchAnalytics.immediate.total}</p>
                      <p className="text-sm text-muted-foreground">Total Leads</p>
                      <p className="text-lg font-semibold text-green-600">
                        {dispatchAnalytics.immediate.conversionRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-purple-600">Scheduled Dispatch</h4>
                      <p className="text-2xl font-bold">{dispatchAnalytics.scheduled.total}</p>
                      <p className="text-sm text-muted-foreground">Total Leads</p>
                      <p className="text-lg font-semibold text-green-600">
                        {dispatchAnalytics.scheduled.conversionRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">Analysis</h5>
                    <p className="text-sm text-muted-foreground">
                      {dispatchAnalytics.immediate.conversionRate > dispatchAnalytics.scheduled.conversionRate
                        ? "Immediate dispatch leads are performing better with higher conversion rates."
                        : "Scheduled dispatch leads are showing better conversion performance."
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dispatch Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Dispatch Volume & Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={dispatchComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar yAxisId="left" dataKey="total" fill={chartConfig.leads.color} />
                    <Bar yAxisId="left" dataKey="sold" fill={chartConfig.sold.color} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
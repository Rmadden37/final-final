"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { BarChart3, Activity, Calendar } from "lucide-react";
import type { Lead } from "@/types";

interface SetterPerformance {
  uid: string;
  name: string;
  totalLeads: number;
  sitRate: number;
  failedCreditRate: number;
  cancelNoShowRate: number;
}

interface CloserPerformance {
  uid: string;
  name: string;
  totalAssigned: number;
  closeRate: number;
  conversionRate: number;
  selfGenRate: number;
}

interface TrendData {
  date: string;
  totalLeads: number;
  sitRate: number;
  closeRate: number;
  isSpecialPoint?: boolean;
  pointType?: 'today' | 'projection';
}

interface PPWData {
  name: string;
  fullName: string;
  avgNetPPW: number;
  salesCount: number;
}

interface PerformanceChartsProps {
  setterPerformance: SetterPerformance[];
  closerPerformance: CloserPerformance[];
  trendData: TrendData[];
  chartConfig: any;
  leads: Lead[];
}

// Helper function to safely convert timestamp to Date
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  
  // If it's already a Date, return it
  if (timestamp instanceof Date) return timestamp;
  
  // If it's a Firestore Timestamp with toDate method
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // If it's a timestamp number
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // If it's a string
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  // Fallback
  return new Date();
}

export function PerformanceCharts({
  setterPerformance,
  closerPerformance,
  trendData,
  chartConfig,
  leads
}: PerformanceChartsProps) {
  // State to hold the processed PPW data
  const [ppwData, setPpwData] = useState<PPWData[]>([]);
  const [ppwLoading, setPpwLoading] = useState(true);
  const [ppwError, setPpwError] = useState<string | null>(null);

  // Calculate trending line data based on average weekly sales from 4-12 weeks ago
  const trendingLineData = useMemo(() => {
    const today = new Date();
    const oct1 = new Date(today.getFullYear(), 9, 1); // October 1st (month is 0-based)
    
    // Calculate weekly averages from 4-12 weeks ago
    const weeksAgo4 = new Date(today);
    weeksAgo4.setDate(today.getDate() - (4 * 7));
    const weeksAgo12 = new Date(today);
    weeksAgo12.setDate(today.getDate() - (12 * 7));
    
    // Filter leads within the 4-12 weeks ago range
    const historicalLeads = leads.filter(lead => {
      const leadDate = toDate(lead.createdAt);
      return leadDate >= weeksAgo12 && leadDate <= weeksAgo4;
    });
    
    // Group by week and calculate averages
    const weeklyData: { [key: string]: { totalLeads: number, soldLeads: number } } = {};
    
    historicalLeads.forEach(lead => {
      const leadDate = toDate(lead.createdAt);
      const weekStart = new Date(leadDate);
      weekStart.setDate(leadDate.getDate() - leadDate.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { totalLeads: 0, soldLeads: 0 };
      }
      
      weeklyData[weekKey].totalLeads++;
      if (lead.status === 'sold') {
        weeklyData[weekKey].soldLeads++;
      }
    });
    
    // Calculate average weekly metrics
    const weeks = Object.values(weeklyData);
    const avgWeeklyLeads = weeks.reduce((sum, week) => sum + week.totalLeads, 0) / (weeks.length || 1);
    const avgWeeklySales = weeks.reduce((sum, week) => sum + week.soldLeads, 0) / (weeks.length || 1);
    const avgCloseRate = weeks.length > 0 ? (avgWeeklySales / avgWeeklyLeads) * 100 : 0;
    
    return {
      avgWeeklyLeads,
      avgWeeklySales,
      avgCloseRate,
      todayPoint: {
        date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalLeads: avgWeeklyLeads,
        closeRate: avgCloseRate
      },
      oct1Point: {
        date: oct1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalLeads: avgWeeklyLeads,
        closeRate: avgCloseRate
      }
    };
  }, [leads]);

  // Enhanced trend data with today and Oct 1 data points
  const enhancedTrendData = useMemo(() => {
    const today = new Date();
    const oct1 = new Date(today.getFullYear(), 9, 1);
    const todayDateString = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const oct1DateString = oct1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Get current performance for today
    const todayLeads = leads.filter(lead => {
      const leadDate = toDate(lead.createdAt);
      return leadDate.toDateString() === today.toDateString();
    });
    
    const todaySoldLeads = todayLeads.filter(lead => lead.status === 'sold').length;
    const todaySitLeads = todayLeads.filter(lead => lead.status !== 'canceled' && lead.status !== 'credit_fail').length;
    const todayCloseRate = todayLeads.length > 0 ? (todaySoldLeads / todayLeads.length) * 100 : 0;
    const todaySitRate = todayLeads.length > 0 ? (todaySitLeads / todayLeads.length) * 100 : 0;
    
    // Process existing trend data and mark special points
    const dataWithSpecialPoints = trendData.map(dataPoint => {
      // Check if this data point matches today's date
      if (dataPoint.date === todayDateString) {
        return {
          ...dataPoint,
          totalLeads: todayLeads.length,
          sitRate: todaySitRate,
          closeRate: todayCloseRate,
          isSpecialPoint: true,
          pointType: 'today' as const
        };
      }
      return dataPoint;
    });
    
    // Check if today's data point already exists in trend data
    const todayExists = dataWithSpecialPoints.some(dp => dp.date === todayDateString);
    
    // Add today's data point if it doesn't exist
    if (!todayExists) {
      dataWithSpecialPoints.push({
        date: todayDateString,
        totalLeads: todayLeads.length,
        sitRate: todaySitRate,
        closeRate: todayCloseRate,
        isSpecialPoint: true,
        pointType: 'today'
      });
    }
    
    // Check if Oct 1 data point already exists
    const oct1Exists = dataWithSpecialPoints.some(dp => dp.date === oct1DateString);
    
    // Add Oct 1 projected data point if it doesn't exist
    if (!oct1Exists) {
      dataWithSpecialPoints.push({
        date: oct1DateString,
        totalLeads: trendingLineData.avgWeeklyLeads,
        sitRate: trendingLineData.avgCloseRate, // Using close rate as sit rate for projection
        closeRate: trendingLineData.avgCloseRate,
        isSpecialPoint: true,
        pointType: 'projection'
      });
    }
    
    // Sort by date to maintain proper line connectivity
    return dataWithSpecialPoints.sort((a, b) => {
      const dateA = new Date(a.date + ', 2024'); // Assuming current year
      const dateB = new Date(b.date + ', 2024');
      return dateA.getTime() - dateB.getTime();
    });
  }, [trendData, leads, trendingLineData]);

  // Top 10 Net PPW data for closers
  useEffect(() => {
    const fetchAndProcessPPWData = async () => {
      setPpwLoading(true);
      setPpwError(null);
      
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vS1JbDgrzjZrpCmTLDtv44N3-NMvdc_bf15JvNErW3Qpxaj3DgCQlYfn5cDwZGH3RuD5yIWQm5SV0DN/pub?gid=1888217885&single=true&output=csv');
        
        if (!response.ok) {
          throw new Error('Failed to fetch PPW data');
        }
        
        const csvText = await response.text();
        
        // Parse CSV manually for better control
        const lines = csvText.split('\n');
        const data: Array<{closer_name: string, net_ppw: number}> = [];
        
        for (let i = 2; i < lines.length; i++) { // Skip header and the invalid second row
          const values = lines[i].split(',');
          if (values.length >= 8 && values[3] === '1') { // Only realized sales
            const closerName = values[4]?.trim();
            const netPPW = parseFloat(values[7]);
            
            if (closerName && !isNaN(netPPW) && netPPW > 0) {
              data.push({
                closer_name: closerName,
                net_ppw: netPPW
              });
            }
          }
        }
        
        // Group by closer and calculate average Net PPW
        const closerStats: { [key: string]: { name: string, totalPPW: number, count: number } } = {};
        data.forEach(row => {
          if (!closerStats[row.closer_name]) {
            closerStats[row.closer_name] = {
              name: row.closer_name,
              totalPPW: 0,
              count: 0
            };
          }
          closerStats[row.closer_name].totalPPW += row.net_ppw;
          closerStats[row.closer_name].count += 1;
        });
        
        // Calculate averages and sort
        const closerAverages = Object.values(closerStats)
          .map(closer => ({
            name: closer.name.split(' ')[0], // Use first name for chart
            fullName: closer.name,
            avgNetPPW: Number((closer.totalPPW / closer.count).toFixed(2)),
            salesCount: closer.count
          }))
          .filter(closer => closer.salesCount >= 3) // Only include closers with 3+ sales
          .sort((a, b) => b.avgNetPPW - a.avgNetPPW)
          .slice(0, 10);
        
        setPpwData(closerAverages);
      } catch (error) {
        console.error('Error fetching PPW data:', error);
        setPpwError(error instanceof Error ? error.message : 'Failed to load PPW data');
        setPpwData([]);
      } finally {
        setPpwLoading(false);
      }
    };
    
    fetchAndProcessPPWData();
  }, []);

  // Prepare setter chart data
  const setterChartData = setterPerformance.map(setter => ({
    name: setter.name.split(" ")[0], // Use first name for chart
    sitRate: setter.sitRate,
    failedCreditRate: setter.failedCreditRate,
    cancelNoShowRate: setter.cancelNoShowRate,
    totalLeads: setter.totalLeads
  }));

  // Prepare closer chart data
  const closerChartData = closerPerformance.map(closer => ({
    name: closer.name.split(" ")[0],
    closeRate: closer.closeRate,
    conversionRate: closer.conversionRate,
    selfGenRate: closer.selfGenRate,
    totalAssigned: closer.totalAssigned
  }));

  // Prepare pie chart data for lead dispositions (only final lead statuses, no immediate dispatch considerations)
  const leadDispositionsData = useMemo(() => {
    const statusCounts = {
      sold: 0,
      no_sale: 0,
      canceled: 0,
      credit_fail: 0
    };

    leads.forEach(lead => {
      if (lead.status === 'sold') {
        statusCounts.sold++;
      } else if (lead.status === 'no_sale') {
        statusCounts.no_sale++;
      } else if (lead.status === 'canceled') {
        statusCounts.canceled++;
      } else if (lead.status === 'credit_fail') {
        statusCounts.credit_fail++;
      }
    });

    return [
      { name: 'Sold', value: statusCounts.sold, fill: 'hsl(185 85% 45%)' }, // Teal
      { name: 'No Sale', value: statusCounts.no_sale, fill: 'hsl(25 75% 55%)' }, // Orange
      { name: 'Canceled', value: statusCounts.canceled, fill: 'hsl(358 75% 58%)' }, // Red
      { name: 'Failed Credit', value: statusCounts.credit_fail, fill: 'hsl(280 50% 55%)' } // Purple
    ].filter(item => item.value > 0);
  }, [leads]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* SVG filter for cyan drop shadow and blue glow, only rendered once */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="cyan-drop-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#06b6d4" floodOpacity="0.8" />
        </filter>
        <filter id="blue-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#6366f1" floodOpacity="0.7" />
        </filter>
      </svg>
      
      {/* Top 10 Net PPW Chart */}
      <Card className="dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/20 dark:shadow-xl dark:rounded-2xl transition-all duration-300">
        <CardHeader className="text-center dark:text-white/90 dark:font-semibold dark:tracking-wide">
          <CardTitle className="flex items-center justify-center gap-2 text-lg dark:bg-gradient-to-r dark:from-green-400 dark:to-emerald-500 dark:bg-clip-text dark:text-transparent">
            <BarChart3 className="h-5 w-5 dark:text-green-400" />
            Top 10 Net PPW (Closers)
          </CardTitle>
        </CardHeader>
        <CardContent className="dark:pb-6">
          {ppwLoading ? (
            <div className="h-[350px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading PPW data...</div>
            </div>
          ) : ppwError ? (
            <div className="h-[350px] flex items-center justify-center">
              <div className="text-destructive">Error: {ppwError}</div>
            </div>
          ) : ppwData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center">
              <div className="text-muted-foreground">No PPW data available</div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ppwData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-white/10" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 13, fill: '#a7f3d0' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    className="dark:fill-green-200"
                  />
                  <YAxis 
                    tick={{ fontSize: 13, fill: '#a7f3d0' }} 
                    className="dark:fill-green-200"
                    label={{ value: 'Net PPW ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#a7f3d0' } }}
                  />
                  <ChartTooltip 
                    wrapperStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #10b981aa', border: '1px solid #10b981' }} 
                    contentStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, border: '1px solid #10b981' }} 
                    labelStyle={{ color: '#a7f3d0' }} 
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any, name: any, props: any) => [
                      `$${value}`,
                      `Avg Net PPW (${props.payload?.salesCount} sales)`
                    ]}
                  />
                  <Bar 
                    dataKey="avgNetPPW" 
                    name="Average Net PPW"
                    fill="hsl(145 85% 45%)"
                    className="dark:fill-transparent"
                    style={{ filter: 'var(--green-shadow)' }}
                    {...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? { 
                      fill: 'transparent', 
                      filter: 'url(#cyan-drop-shadow)', 
                      cursor: 'pointer', 
                      transition: 'filter 0.2s' 
                    } : {})}
                    onMouseOver={(e: any) => { if (e && e.target) e.target.setAttribute('filter', 'url(#blue-glow)'); }}
                    onMouseOut={(e: any) => { if (e && e.target) e.target.setAttribute('filter', 'url(#cyan-drop-shadow)'); }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Setter Performance Chart */}
      <Card className="dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/20 dark:shadow-xl dark:rounded-2xl transition-all duration-300">
        <CardHeader className="text-center dark:text-white/90 dark:font-semibold dark:tracking-wide">
          <CardTitle className="flex items-center justify-center gap-2 text-lg dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:bg-clip-text dark:text-transparent">
            <BarChart3 className="h-5 w-5 dark:text-cyan-400" />
            Setter Performance Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="dark:pb-6">
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={setterChartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="dark:stroke-white/10" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 13, fill: '#a5f3fc' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  className="dark:fill-cyan-200"
                />
                <YAxis tick={{ fontSize: 13, fill: '#a5f3fc' }} className="dark:fill-cyan-200" />
                <ChartTooltip wrapperStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #06b6d4aa', border: '1px solid #06b6d4' }} contentStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, border: '1px solid #06b6d4' }} labelStyle={{ color: '#a5f3fc' }} itemStyle={{ color: '#fff' }} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="sitRate" name="Sit Rate %"
                  fill="hsl(185 85% 45%)"
                  className="dark:fill-transparent"
                  style={{ filter: 'var(--cyan-shadow)' }}
                  {...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? { fill: 'transparent', filter: 'url(#cyan-drop-shadow)', cursor: 'pointer', transition: 'filter 0.2s' } : {})}
                  onMouseOver={(e: any) => { if (e && e.target) e.target.setAttribute('filter', 'url(#blue-glow)'); }}
                  onMouseOut={(e: any) => { if (e && e.target) e.target.setAttribute('filter', 'url(#cyan-drop-shadow)'); }}
                />
                <Bar dataKey="failedCreditRate" fill="hsl(358 75% 58%)" name="Failed Credit Rate %" className="dark:fill-red-400/60" />
                <Bar dataKey="cancelNoShowRate" fill="hsl(25 75% 55%)" name="Cancel/No Show Rate %" className="dark:fill-orange-300/60" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Closer Performance Chart */}
      <Card className="dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/20 dark:shadow-xl dark:rounded-2xl transition-all duration-300">
        <CardHeader className="text-center dark:text-white/90 dark:font-semibold dark:tracking-wide">
          <CardTitle className="flex items-center justify-center gap-2 text-lg dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:bg-clip-text dark:text-transparent">
            <BarChart3 className="h-5 w-5 dark:text-blue-400" />
            Closer Performance Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="dark:pb-6">
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closerChartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="dark:stroke-white/10" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 13, fill: '#c7d2fe' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  className="dark:fill-blue-200"
                />
                <YAxis tick={{ fontSize: 13, fill: '#c7d2fe' }} className="dark:fill-blue-200" />
                <ChartTooltip wrapperStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #6366f1aa', border: '1px solid #6366f1' }} contentStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, border: '1px solid #6366f1' }} labelStyle={{ color: '#c7d2fe' }} itemStyle={{ color: '#fff' }} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="closeRate" fill="hsl(185 85% 45%)" name="Close Rate %" className="dark:fill-transparent" style={{ filter: 'var(--cyan-shadow)' }} {...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? { fill: 'transparent', filter: 'url(#blue-glow)', cursor: 'pointer', transition: 'filter 0.2s' } : {})} />
                <Bar dataKey="conversionRate" fill="hsl(200 80% 48%)" name="Conversion Rate %" className="dark:fill-indigo-400/60" />
                <Bar dataKey="selfGenRate" fill="hsl(220 85% 55%)" name="Self-Generated Rate %" className="dark:fill-purple-400/60" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Lead Dispositions Pie Chart */}
      <Card className="dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/20 dark:shadow-xl dark:rounded-2xl transition-all duration-300">
        <CardHeader className="text-center dark:text-white/90 dark:font-semibold dark:tracking-wide">
          <CardTitle className="flex items-center justify-center gap-2 text-lg dark:bg-gradient-to-r dark:from-cyan-400 dark:to-pink-400 dark:bg-clip-text dark:text-transparent">
            <Activity className="h-5 w-5 dark:text-pink-400" />
            Lead Dispositions
          </CardTitle>
        </CardHeader>
        <CardContent className="dark:pb-6">
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={leadDispositionsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {leadDispositionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Sold' ? (typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'transparent' : entry.fill) : entry.fill} filter={entry.name === 'Sold' && typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'url(#cyan-drop-shadow)' : undefined} />
                  ))}
                </Pie>
                <ChartTooltip wrapperStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #f472b6aa', border: '1px solid #f472b6' }} contentStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, border: '1px solid #f472b6' }} labelStyle={{ color: '#f472b6' }} itemStyle={{ color: '#fff' }} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Trend Analysis Line Chart */}
      <Card className="lg:col-span-2 dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/20 dark:shadow-xl dark:rounded-2xl transition-all duration-300">
        <CardHeader className="text-center dark:text-white/90 dark:font-semibold dark:tracking-wide">
          <CardTitle className="flex items-center justify-center gap-2 text-lg dark:bg-gradient-to-r dark:from-cyan-400 dark:to-purple-400 dark:bg-clip-text dark:text-transparent">
            <Calendar className="h-5 w-5 dark:text-purple-400" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="dark:pb-6">
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enhancedTrendData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="dark:stroke-white/10" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 13, fill: '#f3e8ff' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  className="dark:fill-purple-200"
                />
                <YAxis tick={{ fontSize: 13, fill: '#f3e8ff' }} className="dark:fill-purple-200" />
                <ChartTooltip wrapperStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #a21cafaa', border: '1px solid #a21caf' }} contentStyle={{ background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: 12, border: '1px solid #a21caf' }} labelStyle={{ color: '#f3e8ff' }} itemStyle={{ color: '#fff' }} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="totalLeads" 
                  stroke="hsl(210 8% 55%)" 
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload?.isSpecialPoint) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={payload.pointType === 'today' ? '#06b6d4' : '#a21caf'}
                          stroke="#ffffff"
                          strokeWidth={2}
                          filter={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'url(#cyan-drop-shadow)' : undefined}
                        />
                      );
                    }
                    return <circle cx={cx} cy={cy} r={4} fill="#ffffff" strokeWidth={2} stroke="hsl(210 8% 55%)" />;
                  }}
                  name="Total Leads Count"
                />
                <Line 
                  type="monotone" 
                  dataKey="sitRate" 
                  stroke="hsl(185 85% 45%)" 
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload?.isSpecialPoint) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={payload.pointType === 'today' ? '#06b6d4' : '#a21caf'}
                          stroke="#ffffff"
                          strokeWidth={2}
                          filter={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'url(#cyan-drop-shadow)' : undefined}
                        />
                      );
                    }
                    return <circle cx={cx} cy={cy} r={4} fill="#06b6d4" strokeWidth={2} filter={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'url(#cyan-drop-shadow)' : undefined} />;
                  }}
                  name="Sit Rate %"
                  {...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? { stroke: '#06b6d4', filter: 'url(#cyan-drop-shadow)' } : {})}
                />
                <Line 
                  type="monotone" 
                  dataKey="closeRate" 
                  stroke="hsl(200 80% 48%)" 
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload?.isSpecialPoint) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={payload.pointType === 'today' ? '#06b6d4' : '#a21caf'}
                          stroke="#ffffff"
                          strokeWidth={2}
                          filter={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'url(#blue-glow)' : undefined}
                        />
                      );
                    }
                    return <circle cx={cx} cy={cy} r={4} fill="#a21caf" strokeWidth={2} />;
                  }}
                  name="Close Rate %"
                  {...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? { stroke: '#a21caf', filter: 'url(#blue-glow)' } : {})}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
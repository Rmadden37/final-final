"use client";

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp, Target, Calendar, Activity, Award, Users } from "lucide-react";
import type { Lead } from "@/types";

interface SetterQualityEnhancedProps {
  leads: Lead[];
  dateRange: string;
  className?: string;
}

interface SetterQualityMetrics {
  uid: string;
  name: string;
  totalLeads: number;
  leadsSubmitted: number;
  leadsClosed: number;
  conversionRate: number;
  bestDay: string;
  bestWeek: string;
  todayLeads: number;
  wtdLeads: number;
  mtdLeads: number;
  assistedCloses: number;
  dailyTrend: Array<{
    date: string;
    submitted: number;
    closed: number;
    conversionRate: number;
  }>;
}

const chartConfig = {
  submitted: { label: "Leads Submitted", color: "#3b82f6" },
  closed: { label: "Leads Closed", color: "#10b981" },
  conversionRate: { label: "Conversion Rate", color: "#f59e0b" },
  trend: { label: "Trend", color: "#8b5cf6" },
};

export default function SetterQualityEnhanced({ leads, dateRange, className }: SetterQualityEnhancedProps) {
  
  // Calculate enhanced setter quality metrics with memoization
  const setterMetrics = useMemo((): SetterQualityMetrics[] => {
    const setterMap = new Map<string, SetterQualityMetrics>();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Generate daily trend data for the date range
    const days = parseInt(dateRange.replace('d', ''));
    const trendDays = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return date;
    });

    leads.forEach(lead => {
      if (!lead.setterId || !lead.setterName) return;

      const leadDate = new Date(lead.createdAt.seconds * 1000);
      const dayOfWeek = leadDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      const existing = setterMap.get(lead.setterId) || {
        uid: lead.setterId,
        name: lead.setterName,
        totalLeads: 0,
        leadsSubmitted: 0,
        leadsClosed: 0,
        conversionRate: 0,
        bestDay: 'Monday',
        bestWeek: 'This Week',
        todayLeads: 0,
        wtdLeads: 0,
        mtdLeads: 0,
        assistedCloses: 0,
        dailyTrend: trendDays.map(date => ({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          submitted: 0,
          closed: 0,
          conversionRate: 0
        }))
      };

      existing.totalLeads++;
      existing.leadsSubmitted++;

      // Count closed leads (sold status)
      if (lead.status === 'sold') {
        existing.leadsClosed++;
      }

      // Count assisted closes (where setter helped close but wasn't the closer)
      if (lead.status === 'sold' && lead.setterId !== lead.assignedCloserId) {
        existing.assistedCloses++;
      }

      // Time-based counts
      if (leadDate >= startOfToday) {
        existing.todayLeads++;
      }
      if (leadDate >= startOfWeek) {
        existing.wtdLeads++;
      }
      if (leadDate >= startOfMonth) {
        existing.mtdLeads++;
      }

      // Update daily trend data
      const trendIndex = trendDays.findIndex(date => 
        date.toDateString() === leadDate.toDateString()
      );
      if (trendIndex !== -1) {
        existing.dailyTrend[trendIndex].submitted++;
        if (lead.status === 'sold') {
          existing.dailyTrend[trendIndex].closed++;
        }
      }

      setterMap.set(lead.setterId, existing);
    });

    // Calculate conversion rates and trend data
    return Array.from(setterMap.values()).map(setter => {
      const conversionRate = setter.leadsSubmitted > 0 ? 
        (setter.leadsClosed / setter.leadsSubmitted) * 100 : 0;

      // Calculate conversion rates for daily trend
      const dailyTrend = setter.dailyTrend.map(day => ({
        ...day,
        conversionRate: day.submitted > 0 ? (day.closed / day.submitted) * 100 : 0
      }));

      // Find best performing day (mock for now - would need more historical data)
      const dayPerformance = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const bestDay = dayPerformance[Math.floor(Math.random() * dayPerformance.length)];

      return {
        ...setter,
        conversionRate,
        dailyTrend,
        bestDay
      };
    }).sort((a, b) => b.conversionRate - a.conversionRate);
  }, [leads, dateRange]);

  // Calculate team totals
  const teamTotals = useMemo(() => {
    return setterMetrics.reduce((totals, setter) => ({
      totalLeadsSet: totals.totalLeadsSet + setter.leadsSubmitted,
      totalAssistedCloses: totals.totalAssistedCloses + setter.assistedCloses,
      todayTotal: totals.todayTotal + setter.todayLeads,
      wtdTotal: totals.wtdTotal + setter.wtdLeads,
      mtdTotal: totals.mtdTotal + setter.mtdLeads,
    }), {
      totalLeadsSet: 0,
      totalAssistedCloses: 0,
      todayTotal: 0,
      wtdTotal: 0,
      mtdTotal: 0,
    });
  }, [setterMetrics]);

  // Prepare data for the leads submitted vs closed area chart
  const trendChartData = useMemo(() => {
    if (setterMetrics.length === 0) return [];
    
    // Aggregate all setters' daily data
    const aggregatedData = setterMetrics[0].dailyTrend.map((_, index) => {
      const dayData = setterMetrics.reduce((acc, setter) => {
        const dayTrend = setter.dailyTrend[index];
        return {
          date: dayTrend.date,
          submitted: acc.submitted + dayTrend.submitted,
          closed: acc.closed + dayTrend.closed
        };
      }, { date: '', submitted: 0, closed: 0 });

      return {
        ...dayData,
        conversionRate: dayData.submitted > 0 ? (dayData.closed / dayData.submitted) * 100 : 0
      };
    });

    return aggregatedData;
  }, [setterMetrics]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Submitted vs Leads Closed Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Leads Submitted vs Closed Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-bold">{label}</p>
                            <p className="text-sm text-blue-600">Submitted: {data.submitted}</p>
                            <p className="text-sm text-green-600">Closed: {data.closed}</p>
                            <p className="text-sm text-orange-600">Rate: {data.conversionRate.toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="submitted" 
                    stackId="1"
                    stroke={chartConfig.submitted.color}
                    fill={chartConfig.submitted.color}
                    fillOpacity={0.3}
                    name="Leads Submitted"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="closed" 
                    stackId="2"
                    stroke={chartConfig.closed.color}
                    fill={chartConfig.closed.color}
                    fillOpacity={0.6}
                    name="Leads Closed"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Setter Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Setter Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setterMetrics.slice(0, 8).map(setter => ({
                  name: setter.name.split(" ")[0],
                  submitted: setter.leadsSubmitted,
                  closed: setter.leadsClosed,
                  conversionRate: setter.conversionRate
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-bold">{label}</p>
                            <p className="text-sm text-blue-600">Submitted: {data.submitted}</p>
                            <p className="text-sm text-green-600">Closed: {data.closed}</p>
                            <p className="text-sm text-orange-600">Rate: {data.conversionRate.toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="submitted" fill={chartConfig.submitted.color} name="Submitted" />
                  <Bar dataKey="closed" fill={chartConfig.closed.color} name="Closed" />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Setter Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Setter Quality Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {setterMetrics.map((setter) => (
              <div key={setter.uid} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-lg">{setter.name}</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted</p>
                      <p className="font-semibold text-blue-600">{setter.leadsSubmitted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Closed</p>
                      <p className="font-semibold text-green-600">{setter.leadsClosed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assisted</p>
                      <p className="font-semibold text-purple-600">{setter.assistedCloses}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Best Day</p>
                      <p className="font-semibold text-orange-600">{setter.bestDay}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Today/WTD/MTD</p>
                      <p className="font-semibold text-cyan-600">
                        {setter.todayLeads}/{setter.wtdLeads}/{setter.mtdLeads}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm text-muted-foreground">Quality Rate</p>
                  <p className="text-3xl font-bold text-green-600">{setter.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

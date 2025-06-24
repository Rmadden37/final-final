"use client";

import React, { useMemo } from "react";
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
}

interface PerformanceChartsProps {
  setterPerformance: SetterPerformance[];
  closerPerformance: CloserPerformance[];
  trendData: TrendData[];
  chartConfig: any;
  leads: Lead[];
}

export function PerformanceCharts({
  setterPerformance,
  closerPerformance,
  trendData,
  chartConfig,
  leads
}: PerformanceChartsProps) {
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
                  onMouseOver={e => { if (e && e.target) e.target.setAttribute('filter', 'url(#blue-glow)'); }}
                  onMouseOut={e => { if (e && e.target) e.target.setAttribute('filter', 'url(#cyan-drop-shadow)'); }}
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
              <LineChart data={trendData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
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
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                  name="Total Leads Count"
                />
                <Line 
                  type="monotone" 
                  dataKey="sitRate" 
                  stroke="hsl(185 85% 45%)" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#06b6d4', filter: (typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'url(#cyan-drop-shadow)' : undefined }}
                  name="Sit Rate %"
                  {...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? { stroke: '#06b6d4', filter: 'url(#cyan-drop-shadow)' } : {})}
                />
                <Line 
                  type="monotone" 
                  dataKey="closeRate" 
                  stroke="hsl(200 80% 48%)" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#a21caf' }}
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

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
      {/* Setter Performance Chart */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Setter Performance Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={setterChartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="sitRate" fill="hsl(185 85% 45%)" name="Sit Rate %" />
                <Bar dataKey="failedCreditRate" fill="hsl(358 75% 58%)" name="Failed Credit Rate %" />
                <Bar dataKey="cancelNoShowRate" fill="hsl(25 75% 55%)" name="Cancel/No Show Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Closer Performance Chart */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Closer Performance Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closerChartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="closeRate" fill="hsl(185 85% 45%)" name="Close Rate %" />
                <Bar dataKey="conversionRate" fill="hsl(200 80% 48%)" name="Conversion Rate %" />
                <Bar dataKey="selfGenRate" fill="hsl(220 85% 55%)" name="Self-Generated Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Lead Dispositions Pie Chart */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Activity className="h-5 w-5" />
            Lead Dispositions
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Trend Analysis Line Chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip />
                <ChartLegend content={<ChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="totalLeads" 
                  stroke="hsl(210 8% 55%)" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeinline-size: 2, fill: '#ffffff' }}
                  name="Total Leads Count"
                />
                <Line 
                  type="monotone" 
                  dataKey="sitRate" 
                  stroke="hsl(185 85% 45%)" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeinline-size: 2, fill: '#ffffff' }}
                  name="Sit Rate %"
                />
                <Line 
                  type="monotone" 
                  dataKey="closeRate" 
                  stroke="hsl(200 80% 48%)" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeinline-size: 2, fill: '#ffffff' }}
                  name="Close Rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

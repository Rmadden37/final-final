"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { BarChart3, Activity, Calendar } from "lucide-react";
import { SetterPerformance, CloserPerformance, TrendData } from "./types";

interface PerformanceChartsProps {
  setterPerformance: SetterPerformance[];
  closerPerformance: CloserPerformance[];
  trendData: TrendData[];
  chartConfig: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function PerformanceCharts({
  setterPerformance,
  closerPerformance,
  trendData,
  chartConfig
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

  // Prepare pie chart data for lead distribution
  const leadDistributionData = [
    { name: 'Immediate Dispatch', value: setterPerformance.reduce((sum, s) => sum + s.immediateDispatchCount, 0) },
    { name: 'Scheduled Dispatch', value: setterPerformance.reduce((sum, s) => sum + s.scheduledDispatchCount, 0) },
    { name: 'Self-Generated', value: closerPerformance.reduce((sum, c) => sum + c.selfGenCount, 0) },
    { name: 'Completed Appointments', value: setterPerformance.reduce((sum, s) => sum + s.sitCount, 0) },
    { name: 'Sold Leads', value: closerPerformance.reduce((sum, c) => sum + c.soldCount, 0) },
    { name: 'No Sale Leads', value: closerPerformance.reduce((sum, c) => sum + c.noSaleCount, 0) },
    { name: 'Credit Failed Leads', value: closerPerformance.reduce((sum, c) => sum + c.failedCreditCount, 0) }
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Setter Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                <Bar dataKey="sitRate" fill={chartConfig.sitRate.color} name="Sit Rate %" />
                <Bar dataKey="failedCreditRate" fill={chartConfig.failedCredit.color} name="Failed Credit Rate %" />
                <Bar dataKey="cancelNoShowRate" fill={chartConfig.cancelNoShow.color} name="Cancel/No Show Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Closer Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                <Bar dataKey="closeRate" fill={chartConfig.closeRate.color} name="Close Rate %" />
                <Bar dataKey="conversionRate" fill={chartConfig.selfGen.color} name="Conversion Rate %" />
                <Bar dataKey="selfGenRate" fill={chartConfig.immediate.color} name="Self-Generated Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Lead Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Lead Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={leadDistributionData}
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
                  {leadDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                  stroke={chartConfig.total.color} 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                  name="Total Leads Count"
                />
                <Line 
                  type="monotone" 
                  dataKey="sitRate" 
                  stroke={chartConfig.sitRate.color} 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                  name="Sit Rate %"
                />
                <Line 
                  type="monotone" 
                  dataKey="closeRate" 
                  stroke={chartConfig.closeRate.color} 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
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

"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useMemo } from "react";
import { getChartConfig } from "./helpers";
import { AnalyticsData } from "./types";

interface OverviewTabProps {
  analytics: AnalyticsData;
  filterCloser: string;
}

export default function OverviewTab({ analytics, filterCloser }: OverviewTabProps) {
  const { leads, closers } = analytics;

  const filteredLeads = useMemo(() => {
    if (filterCloser === "all") return leads;
    return leads.filter(lead => lead.assignedCloserId === filterCloser);
  }, [leads, filterCloser]);

  const statusData = useMemo(() => {
    if (!filteredLeads.length) return [];
    const statusCounts: Record<string, number> = {};
    filteredLeads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });
    return Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => {
        const config = getChartConfig(status);
        return { name: config.label, value: count, fill: config.color };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  const dispatchComparisonData = useMemo(() => {
    const processDispatchType = (dispatchType: 'immediate' | 'scheduled') => {
      const dispatchLeads = filteredLeads.filter(lead => lead.dispatchType === dispatchType);
      return {
        type: dispatchType.charAt(0).toUpperCase() + dispatchType.slice(1),
        total: dispatchLeads.length,
        sold: dispatchLeads.filter(l => l.status === "sold").length,
        noSale: dispatchLeads.filter(l => l.status === "no_sale").length,
        creditFail: dispatchLeads.filter(l => l.status === "credit_fail").length,
        canceled: dispatchLeads.filter(l => l.status === "canceled").length,
      };
    };
    return [processDispatchType("immediate"), processDispatchType("scheduled")];
  }, [filteredLeads]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Lead Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[350px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {statusData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Immediate vs Scheduled Lead Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[350px] w-full">
            <BarChart data={dispatchComparisonData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="type" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend />
              <Bar dataKey="sold" stackId="a" fill={getChartConfig('sold').color} name="Sold" />
              <Bar dataKey="noSale" stackId="a" fill={getChartConfig('no_sale').color} name="No Sale" />
              <Bar dataKey="creditFail" stackId="a" fill={getChartConfig('credit_fail').color} name="Credit Fail" />
              <Bar dataKey="canceled" stackId="a" fill={getChartConfig('canceled').color} name="Canceled" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

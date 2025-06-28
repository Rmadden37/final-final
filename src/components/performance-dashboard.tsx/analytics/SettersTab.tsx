"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar } from "recharts";
import { CartesianGrid, XAxis, YAxis } from "recharts";
import { Target } from "lucide-react";
import { useMemo } from "react";
import { getChartConfig } from "./helpers";
import { AnalyticsData, SetterAnalytics } from "./types";

interface SettersTabProps {
  analytics: AnalyticsData;
}

export default function SettersTab({ analytics }: SettersTabProps) {
  const { leads } = analytics;

  const setterAnalytics = useMemo((): SetterAnalytics[] => {
    const setterMap = new Map<string, Omit<SetterAnalytics, 'conversionRate'>>();
    leads.forEach(lead => {
      if (lead.setterId && lead.setterName) {
        const existing = setterMap.get(lead.setterId) || { uid: lead.setterId, name: lead.setterName, totalLeads: 0, soldLeads: 0, immediateLeads: 0, scheduledLeads: 0 };
        existing.totalLeads++;
        if (lead.status === "sold") existing.soldLeads++;
        if (lead.dispatchType === "immediate") existing.immediateLeads++;
        if (lead.dispatchType === "scheduled") existing.scheduledLeads++;
        setterMap.set(lead.setterId, existing);
      }
    });
    return Array.from(setterMap.values()).map(setter => ({ ...setter, conversionRate: setter.totalLeads > 0 ? (setter.soldLeads / setter.totalLeads) * 100 : 0 }));
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {setterAnalytics.map(setter => (
          <Card key={setter.uid}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {setter.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Total Leads:</span> <span className="font-semibold">{setter.totalLeads}</span>
                <span>Sold Leads:</span> <span className="font-semibold">{setter.soldLeads}</span>
                <span>Conversion:</span> <span className="font-semibold">{setter.conversionRate.toFixed(1)}%</span>
                <span>Immediate:</span> <span className="font-semibold">{setter.immediateLeads}</span>
                <span>Scheduled:</span> <span className="font-semibold">{setter.scheduledLeads}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Setter Conversion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[350px] w-full">
            <BarChart data={setterAnalytics}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="conversionRate" fill={getChartConfig('sold').color} radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

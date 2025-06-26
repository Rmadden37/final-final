"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar } from "recharts";
import { CartesianGrid, XAxis, YAxis } from "recharts";
import { Users } from "lucide-react";
import { useMemo } from "react";
import { getChartConfig } from "./helpers";
import { AnalyticsData, CloserAnalytics } from "./types";

interface ClosersTabProps {
  analytics: AnalyticsData;
}

export default function ClosersTab({ analytics }: ClosersTabProps) {
  const { leads } = analytics;

  const closerAnalytics = useMemo((): CloserAnalytics[] => {
    const closerMap = new Map<string, Omit<CloserAnalytics, 'closingRatio' | 'closingPercentage'>>();
    leads.forEach(lead => {
      if (lead.assignedCloserId && lead.assignedCloserName) {
        const existing = closerMap.get(lead.assignedCloserId) || { uid: lead.assignedCloserId, name: lead.assignedCloserName, totalAssigned: 0, totalSold: 0, totalNoSale: 0, totalFailedCredits: 0 };
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
        closingPercentage: 0, // Placeholder, as original logic was complex
    }));
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {closerAnalytics.map(closer => (
          <Card key={closer.uid}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {closer.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Assigned:</span> <span className="font-semibold">{closer.totalAssigned}</span>
                <span>Sold:</span> <span className="font-semibold">{closer.totalSold}</span>
                <span>No Sale:</span> <span className="font-semibold">{closer.totalNoSale}</span>
                <span>Failed Credits:</span> <span className="font-semibold">{closer.totalFailedCredits}</span>
                <span>Closing Ratio:</span> <span className="font-semibold">{closer.closingRatio.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Closer Closing Ratios</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[350px] w-full">
            <BarChart data={closerAnalytics}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="closingRatio" fill={getChartConfig('sold').color} radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

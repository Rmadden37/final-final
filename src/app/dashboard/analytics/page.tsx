"use client";

import AnalyticsDashboard from "@/components/dashboard/analytics-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "setter") {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analytics Not Available</h2>
              <p className="text-muted-foreground">Analytics are available for closers and managers only.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <TrendingUp className="mr-3 h-8 w-8 text-primary" />
          Team Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive insights into your team's performance and lead history.
        </p>
      </div>
      
      <AnalyticsDashboard />
    </div>
  );
}

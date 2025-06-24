"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Target, Activity, Calendar } from "lucide-react";
import { TeamMetrics } from "./types";

interface TeamMetricsSummaryProps {
  teamMetrics: TeamMetrics;
  loading: boolean;
}

interface MetricCard {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  totalSetters?: number;
  totalClosers?: number;
  samedayRate?: number;
  scheduledRate?: number;
  isCombined?: boolean;
}

export function TeamMetricsSummary({ teamMetrics, loading }: TeamMetricsSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="md:col-span-2 border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-9 w-9 bg-gray-200 rounded-lg"></div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards: MetricCard[] = [
    {
      title: "Setter Overview",
      value: "",
      icon: TrendingUp,
      totalSetters: teamMetrics.totalSetters,
      samedayRate: teamMetrics.samedaySitRate,
      scheduledRate: teamMetrics.scheduledSitRate,
      isCombined: true
    },
    {
      title: "Closer Overview",
      value: "",
      icon: Target,
      totalClosers: teamMetrics.totalClosers,
      samedayRate: teamMetrics.samedaySitCloseRate,
      scheduledRate: teamMetrics.scheduledAppointmentCloseRate,
      isCombined: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        
        // Helper function to get icon color based on icon type
        const getIconColor = (IconComponent: any) => {
          if (IconComponent === Activity) return "text-blue-500";
          if (IconComponent === Target) return "text-teal-500"; // Changed to teal for masculine theme
          if (IconComponent === TrendingUp) return "text-teal-600"; // Changed to teal for masculine theme
          if (IconComponent === Calendar) return "text-orange-500";
          return "text-muted-foreground";
        };
        
        // Handle combined card (Active Setters & Sit Rates OR Active Closers & Close Rates)
        if (metric.isCombined) {
          const isSettersCard = metric.title === "Setter Overview";
          const isClosersCard = metric.title === "Closer Overview";
          
          return (
            <Card key={index} className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-4 text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Icon className={`h-5 w-5 ${getIconColor(Icon)}`} />
                  {metric.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Section - Active Count */}
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {isSettersCard ? "Active Setters" : "Active Closers"}
                    </h4>
                    <div className="text-5xl font-bold text-teal-600">
                      {isSettersCard ? metric.totalSetters : metric.totalClosers}
                    </div>
                  </div>
                  
                  {/* Right Section - Rates */}
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {isSettersCard ? "Sit Rates by Type" : "Close Rates by Type"}
                    </h4>
                    <div className="space-y-2">
                      <div className="text-xl font-bold text-teal-600">
                        Sameday: {metric.samedayRate?.toFixed(1)}%
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        Scheduled: {metric.scheduledRate?.toFixed(1)}%
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isSettersCard ? "Appointment Completion" : "Sales Conversion"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        
        // Handle regular cards
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 text-center">
              <div className="flex flex-col items-center space-y-1">
                <Icon className={`h-6 w-6 ${getIconColor(Icon)}`} />
                <CardTitle className="text-sm font-medium text-center">
                  {metric.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold">
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.title.includes('%') ? 'Performance Rate' : 'Total Count'}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

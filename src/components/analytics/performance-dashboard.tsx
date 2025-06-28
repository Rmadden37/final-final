"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Lead, Closer } from "@/types";
import { 
  SetterPerformance, 
  CloserPerformance, 
  TeamMetrics, 
  TrendData 
} from "./types";
import {
  calculateSetterPerformance,
  calculateCloserPerformance,
  calculateTeamMetrics,
  generateTrendData,
  exportToCSV
} from "./utils";
import { TeamMetricsSummary } from "./team-metrics-summary";
import { PerformanceFilters } from "./performance-filters";
import { SetterPerformanceTable } from "./setter-performance-table";
import { CloserPerformanceTable } from "./closer-performance-table";
import { PerformanceCharts } from "./performance-charts";

interface PerformanceDashboardProps {
  className?: string;
}

const chartConfig = {
  sitRate: { label: "Sit Rate (%)", color: "hsl(185 85% 45%)" }, // Deep teal
  closeRate: { label: "Close Rate (%)", color: "hsl(200 80% 48%)" }, // Blue-green
  failedCredit: { label: "Failed Credit Rate (%)", color: "hsl(25 75% 55%)" }, // Warm orange
  cancelNoShow: { label: "Cancel/No Show Rate (%)", color: "hsl(358 75% 58%)" }, // Warm red
  immediate: { label: "Immediate Dispatch", color: "hsl(220 85% 55%)" }, // Deep blue
  scheduled: { label: "Scheduled Dispatch", color: "hsl(185 85% 45%)" }, // Primary teal
  selfGen: { label: "Self-Generated Leads", color: "hsl(145 60% 45%)" }, // Muted green
  total: { label: "Total Leads Count", color: "hsl(210 8% 55%)" }, // Neutral grey
  appointments: { label: "Completed Appointments", color: "hsl(185 85% 50%)" }, // Light teal
  sold: { label: "Sold Leads", color: "hsl(145 65% 50%)" }, // Success green
  no_sale: { label: "No Sale Leads", color: "hsl(25 75% 55%)" }, // Orange
  credit_fail: { label: "Credit Failed Leads", color: "hsl(280 50% 55%)" }, // Muted purple
  avgNetPPW: { label: "Average Net PPW", color: "hsl(145 85% 45%)" }, // Green for PPW chart
};

export default function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // State management
  const [leads, setLeads] = useState<Lead[]>([]);
  const [_closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [selectedSetter, setSelectedSetter] = useState<string>("all");
  const [selectedCloser, setSelectedCloser] = useState<string>("all");

  // Load data
  useEffect(() => {
    if (!user?.teamId) return;

    const days = parseInt(dateRange.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const unsubscribeLeads = onSnapshot(
      query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        orderBy("createdAt", "desc")
      ),
      (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lead[];
        setLeads(leadsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching leads:", error);
        toast({
          title: "Error loading leads",
          description: "Failed to load performance data.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    const unsubscribeClosers = onSnapshot(
      query(
        collection(db, "closers"),
        where("teamId", "==", user.teamId)
      ),
      (snapshot) => {
        const closersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as unknown as Closer[];
        setClosers(closersData);
      },
      (error) => {
        console.error("Error fetching closers:", error);
        toast({
          title: "Error loading closers",
          description: "Failed to load closer data.",
          variant: "destructive",
        });
      }
    );

    return () => {
      unsubscribeLeads();
      unsubscribeClosers();
    };
  }, [user?.teamId, dateRange, toast]);

  // Calculate performance metrics using extracted utility functions with memoization
  const setterPerformance = useMemo(() => calculateSetterPerformance(leads), [leads]);
  const closerPerformance = useMemo(() => calculateCloserPerformance(leads), [leads]);
  const teamMetrics = useMemo(() => calculateTeamMetrics(leads, setterPerformance, closerPerformance), [leads, setterPerformance, closerPerformance]);
  const trendData = useMemo(() => generateTrendData(leads), [leads]);

  // Filter data based on selected filters
  const filteredSetterPerformance = useMemo(() => {
    return selectedSetter === "all" 
      ? setterPerformance 
      : setterPerformance.filter(setter => setter.uid === selectedSetter);
  }, [setterPerformance, selectedSetter]);

  const filteredCloserPerformance = useMemo(() => {
    return selectedCloser === "all" 
      ? closerPerformance 
      : closerPerformance.filter(closer => closer.uid === selectedCloser);
  }, [closerPerformance, selectedCloser]);

  // Handle exports with memoization
  const handleExport = useCallback(() => {
    exportToCSV({ setterPerformance, closerPerformance, teamMetrics }, dateRange);
    toast({
      title: "Export successful",
      description: "Performance data has been exported to CSV.",
    });
  }, [setterPerformance, closerPerformance, teamMetrics, dateRange, toast]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <PerformanceFilters
        dateRange={dateRange}
        selectedSetter={selectedSetter}
        selectedCloser={selectedCloser}
        setterPerformance={setterPerformance}
        closerPerformance={closerPerformance}
        onDateRangeChange={setDateRange}
        onSetterChange={setSelectedSetter}
        onCloserChange={setSelectedCloser}
        onExport={handleExport}
      />

      {/* Team Metrics Summary */}
      <TeamMetricsSummary teamMetrics={teamMetrics} loading={loading} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setters">Setters</TabsTrigger>
          <TabsTrigger value="closers">Closers</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Removed SetterPerformanceTable and CloserPerformanceTable from Overview */}
          {/* Only show them in their respective tabs below */}
        </TabsContent>

        <TabsContent value="setters" className="space-y-6">
          <SetterPerformanceTable
            setterPerformance={filteredSetterPerformance}
            selectedSetter={selectedSetter}
            onSetterSelect={setSelectedSetter}
          />
        </TabsContent>

        <TabsContent value="closers" className="space-y-6">
          <CloserPerformanceTable
            closerPerformance={filteredCloserPerformance}
            selectedCloser={selectedCloser}
            onCloserSelect={setSelectedCloser}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <PerformanceCharts
            setterPerformance={filteredSetterPerformance}
            closerPerformance={filteredCloserPerformance}
            trendData={trendData}
            chartConfig={chartConfig}
            leads={leads}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
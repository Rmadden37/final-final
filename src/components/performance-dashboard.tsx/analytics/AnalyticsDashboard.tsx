"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getTeamStatsFunction, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

// Import your new components and types
import { AnalyticsData, Lead, Closer } from "./types";
import AIAssistantTab from "./AIAssistantTab";
// You would also import other tab components here, e.g.:
// import OverviewTab from "./OverviewTab";
// import SettersTab from "./SettersTab";

export default function AnalyticsDashboard() {
  // Define a type for user that includes teamId and role
  type AuthUser = { teamId?: string; role: string };
  const { user } = useAuth() as { user: AuthUser };
  const { toast } = useToast();
  
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    leads: [],
    closers: [],
    teamStats: null
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [filterCloser, setFilterCloser] = useState<string>("all");

  useEffect(() => {
    // This data fetching logic remains here as it's the source for most tabs
    const fetchAnalytics = async () => {
      if (!user?.teamId) return;
      setLoading(true);
      try {
        const now = new Date();
        const daysAgo = parseInt(dateRange.replace('d', ''));
        const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

        const teamStatsResult = await getTeamStatsFunction({ teamId: user.teamId });
        const leadsQuery = query(collection(db, "leads"), where("teamId", "==", user.teamId), where("createdAt", ">=", Timestamp.fromDate(startDate)), orderBy("createdAt", "desc"));
        const closersQuery = query(collection(db, "closers"), where("teamId", "==", user.teamId), orderBy("name", "asc"));
        const [leadsSnapshot, closersSnapshot] = await Promise.all([getDocs(leadsQuery), getDocs(closersQuery)]);
        const leadsData = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
        const closersData = closersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as Closer[];

        setAnalytics({ leads: leadsData, closers: closersData, teamStats: teamStatsResult.data as any });
      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast({ title: "Error", description: "Failed to load analytics data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user?.teamId, dateRange, toast]);

  if (!user || user.role === "setter") {
    return <div className="p-4">Analytics not available for your role.</div>;
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-4 bg-muted rounded w-1/2 mb-2"></div><div className="h-8 bg-muted rounded w-3/4"></div></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <Tabs defaultValue="ai_assistant" className="space-y-6">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setters">Setters</TabsTrigger>
          <TabsTrigger value="closers">Closers</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="ai_assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* <OverviewTab data={analytics} /> Placeholder */}
          <p>Overview Tab Content</p>
        </TabsContent>
        <TabsContent value="setters">
          {/* <SettersTab data={analytics} /> Placeholder */}
           <p>Setters Tab Content</p>
        </TabsContent>
        <TabsContent value="closers">
           {/* <ClosersTab data={analytics} /> Placeholder */}
           <p>Closers Tab Content</p>
        </TabsContent>
        <TabsContent value="dispatch">
          {/* <DispatchTab data={analytics} /> Placeholder */}
           <p>Dispatch Tab Content</p>
        </TabsContent>
        <TabsContent value="ai_assistant">
          <AIAssistantTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

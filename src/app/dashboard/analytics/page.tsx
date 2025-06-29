"use client";

import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import AnalyticsDashboard from "@/components/dashboard/analytics-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Lead } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.teamId) return;

    const fetchLeads = async () => {
      try {
        const q = query(
          collection(db, "leads"),
          where("teamId", "==", user.teamId)
        );
        
        const snapshot = await getDocs(q);
        const leadsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lead[];
        
        setLeads(leadsData);
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [user?.teamId]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-sm mx-auto">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
              <p className="text-sm text-muted-foreground">Please log in to view analytics.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === "setter") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-sm mx-auto">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2">Analytics Not Available</h2>
              <p className="text-sm text-muted-foreground">Analytics are available for closers and managers only.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <AnalyticsDashboard leads={leads} loading={loading} />
    </div>
  );
}
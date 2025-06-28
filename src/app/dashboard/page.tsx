"use client";

import {useAuth} from "@/hooks/use-auth";
import {useRouter} from "next/navigation";
import {useEffect} from "react";
import LeadQueue from "@/components/dashboard/lead-queue";
import CloserLineup from "@/components/dashboard/closer-lineup";
import InProcessLeads from "@/components/dashboard/in-process-leads";

export default function DashboardPage() {
  const {user, loading} = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 space-y-6">
        {/* Mobile Order: Active Leads first, then others */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* Mobile: Show Active Leads first (order-1) */}
          <div className="order-2 lg:order-1 lg:col-span-5 h-full">
            <LeadQueue />
          </div>
          
          {/* Mobile: Show Active Leads first (order-1) */}
          <div className="order-1 lg:order-2 lg:col-span-4 h-full">
            <InProcessLeads closer={undefined} />
          </div>
          
          {/* Mobile: Show Closer Lineup last (order-3) */}
          <div className="order-3 lg:order-3 lg:col-span-3 h-full">
            <CloserLineup />
          </div>
        </div>
      </div>
    </div>
  );
}
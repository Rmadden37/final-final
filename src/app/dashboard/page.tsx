// src/app/dashboard/page.tsx
"use client";

import { useAuth } from "@/hooks/use-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import InProcessLeads from "@/components/dashboard/in-process-leads";
import LeadQueue from "@/components/dashboard/lead-queue";
import CloserLineup from "@/components/dashboard/closer-lineup";

// Loading component for Suspense fallback
function DashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

// Component to wrap content in Suspense
function DashboardContent() {
  const { user, loading } = useAuth();

  // Show loading state while auth is loading
  if (loading) {
    return <DashboardLoading />;
  }

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth");
  }

  console.log('🏠 Dashboard - User role:', user.role);

  return (
    <div className="dashboard-container h-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main content grid with proper height constraints */}
      <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-6" style={{ height: 'calc(100vh - 3.5rem)' }}>
        
        {/* Left Column: Lead Management */}
        <div className="flex flex-col space-y-6 min-h-0">
          
          {/* In-Process Leads - Full height available */}
          <div className="flex-1 min-h-0">
            <Suspense fallback={<DashboardLoading />}>
              <InProcessLeads />
            </Suspense>
          </div>
          
          {/* Lead Queue - Only show for managers/admins, take remaining space */}
          {(user.role === "manager" || user.role === "admin") && (
            <div className="flex-1 min-h-0">
              <Suspense fallback={<DashboardLoading />}>
                <LeadQueue />
              </Suspense>
            </div>
          )}
        </div>

        {/* Right Column: Team Management */}
        <div className="flex flex-col space-y-6 min-h-0">
          
          {/* Closer Lineup - Full height */}
          <div className="flex-1 min-h-0">
            <Suspense fallback={<DashboardLoading />}>
              <CloserLineup />
            </Suspense>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
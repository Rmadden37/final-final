
"use client";

import InProcessLeads from "@/components/dashboard/in-process-leads";
import CloserLineup from "@/components/dashboard/closer-lineup";
import LeadQueue from "@/components/dashboard/lead-queue";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const {user} = useAuth();

  if (!user) return null; // Layout handles redirect

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      {/* Main Dashboard Grid - Mobile-first responsive layout */}
      <div className="dashboard-page-grid grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5 lg:h-[calc(100vh-12rem)]">
        {/* Mobile: Each card takes full width and 75vh height */}
        <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6 min-h-0">
          {/* In Process Leads Card */}
          <div className="mobile-75vh lg:flex-1 lg:min-h-0" data-dashboard-card>
            <InProcessLeads />
          </div>
          {/* Closer Lineup Card */}
          <div className="mobile-75vh lg:flex-1 lg:min-h-0" data-dashboard-card>
            <CloserLineup />
          </div>
        </div>
        {/* Lead Queue Card */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="mobile-75vh lg:h-full" data-dashboard-card>
            <LeadQueue />
          </div>
        </div>
      </div>
    </div>
  );
}

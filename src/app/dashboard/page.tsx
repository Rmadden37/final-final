
"use client";

import InProcessLeads from "@/components/dashboard/in-process-leads";
import CloserLineup from "@/components/dashboard/closer-lineup";
import LeadQueue from "@/components/dashboard/lead-queue";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const {user} = useAuth();

  if (!user) return null; // Layout handles redirect

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 space-y-6 sm:space-y-8">
      {/* Main Dashboard Grid - Better proportions */}
      <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-5 h-[calc(100vh-12rem)]">
        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
          <div className="flex-1 min-h-0">
            <InProcessLeads />
          </div>
          <div className="flex-1 min-h-0">
            <CloserLineup />
          </div>
        </div>
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="h-full">
            <LeadQueue />
          </div>
        </div>
      </div>
    </div>
  );
}

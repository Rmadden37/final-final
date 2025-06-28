// src/app/dashboard/layout.tsx - Enhanced mobile-first layout
"use client";

import React from "react";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-screen overflow-hidden">
      <DashboardSidebar>
        <div className="h-full overflow-auto">
          {children}
        </div>
      </DashboardSidebar>
    </div>
  );
}
"use client";

import React from "react";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import { AuthProvider } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthProvider>
      <DashboardSidebar>{children}</DashboardSidebar>
    </AuthProvider>
  );
}
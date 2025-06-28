"use client";

import React from "react";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
// Remove AuthProvider import - it's already in root layout

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardSidebar>{children}</DashboardSidebar>
  );
}
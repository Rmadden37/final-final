"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Shield } from "lucide-react";
import QuickLeadCleanup from "@/components/dashboard/quick-lead-cleanup";
import { useRouter } from "next/navigation";

export default function QuickCleanupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || (user.role !== "manager" && user.role !== "admin"))) {
      router.replace(user ? "/dashboard" : "/login");
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "manager" && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-sm mx-auto">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2">Manager Access Required</h2>
              <p className="text-sm text-muted-foreground">
                This page is only accessible to managers and administrators.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trash2 className="h-8 w-8 text-primary" />
          Quick Lead Cleanup
        </h1>
        <p className="text-muted-foreground mt-1">
          Efficiently manage and clean up lead data
        </p>
      </div>

      {/* Quick Lead Cleanup Component */}
      <QuickLeadCleanup />
    </div>
  );
}
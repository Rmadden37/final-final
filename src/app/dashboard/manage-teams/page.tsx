"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TeamUserManagement from "@/components/dashboard/team-user-management";

export default function ManageTeamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect non-managers/admins away from this page
  useEffect(() => {
    if (!loading && user && user.role !== "manager" && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (user.role !== "manager" && user.role !== "admin")) {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You do not have permission to access team management. Manager or admin access required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Manage Teams
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage team members, roles, and assignments
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Management
          </CardTitle>
          <CardDescription>
            View and manage your team members, assign roles, and control access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamUserManagement />
        </CardContent>
      </Card>
    </div>
  );
}


"use client";

import {useAuth} from "@/hooks/use-auth";
import LoginForm from "@/components/auth/login-form";
import {Loader2, Sun} from "lucide-react";

export default function LoginPage() {
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already logged in, let useAuth handle the redirect
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center space-x-2 text-primary">
        <Sun className="h-12 w-12" />
        <h1 className="text-4xl font-bold font-headline">LeadFlow</h1>
      </div>
      <LoginForm />
    </div>
  );
}

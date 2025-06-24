"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LogOut, 
  UserCircle, 
  ClipboardList,
  PlusCircle, 
  User,
  Home,
  BarChart3,
  Settings,
  Users,
  Trophy,
  Brain,
  Monitor
} from "lucide-react";
import AvailabilityToggle from "./availability-toggle";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useState } from "react";
import React from "react";
import dynamic from "next/dynamic";
import FloatingChatButton from "./floating-ai-button";
import GearIcon from "@/components/ui/gear-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// Dynamic import with Next.js dynamic to avoid circular dependency issues
const CreateLeadForm = dynamic(() => import("./create-lead-form"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

function DashboardSidebarContent() {
  const { user, logout, loading } = useAuth();
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // Show loading state if auth is still loading
  if (loading) {
    return (
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="premium:hidden">
          <div className="flex items-center justify-center p-4">
            <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {[...Array(6)].map((_, i) => (
              <SidebarMenuItem key={i}>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md mx-2 my-1" />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Don't render if no user (will be redirected)
  if (!user) {
    return null;
  }

  // Debug logging for user role
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Sidebar Debug - User data:', user);
      console.log('🎭 Current role:', user?.role);
      console.log('👤 User UID:', user?.uid);
      console.log('📧 User email:', user?.email);
      console.log('🏢 Team ID:', user?.teamId);
      
      // Log role-based conditions
      const isManager = user?.role === "manager";
      const isAdmin = user?.role === "admin";
      const isManagerOrAdmin = isManager || isAdmin;
      
      console.log('🔐 Role checks:', {
        isManager,
        isAdmin,
        isManagerOrAdmin,
        shouldShowManagerTools: isManagerOrAdmin
      });
    }
  }, [user]);

  const getAvatarFallbackText = () => {
    if (user?.displayName) return user.displayName.substring(0, 2).toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return <UserCircle size={24} />;
  };

  // Explicitly check user roles
  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const isManagerOrAdmin = isManager || isAdmin;
  const isAdminOnly = user?.role === "admin";

  // Debug log role state
  React.useEffect(() => {
    console.log('🔐 Sidebar role state:', {
      userRole: user?.role,
      isManager,
      isAdmin,
      isManagerOrAdmin,
      isAdminOnly
    });
  }, [user?.role, isManager, isAdmin, isManagerOrAdmin, isAdminOnly]);

  // Helper to close sidebar on mobile after navigation
  const handleNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="px-4 pt-1 pb-1 flex items-center gap-2 min-h-0 h-2" />
        
        <SidebarContent className="mb-10">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={`nav-item shadow-sm text-lg text-sidebar-primary group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto${pathname === "/dashboard" ? " active" : ""}`} onClick={handleNav}>
                <Link href="/dashboard">
                  <Home className="h-6 w-6 mx-auto group-data-[collapsible=icon]:block" />
                  <span className="font-semibold group-data-[collapsible=icon]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Create Lead Button */}
            {(user?.role === "setter" || isManagerOrAdmin) && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsCreateLeadModalOpen(true)}
                  className="nav-item shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto"
                >
                  <PlusCircle className="h-6 w-6 text-green-500 dark:text-green-400 mx-auto group-data-[collapsible=icon]:block" />
                  <span className="font-semibold group-data-[collapsible=icon]:hidden">Create New Lead</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Leaderboard */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={`nav-item shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto${pathname === "/dashboard/leaderboard" ? " active" : ""}`} onClick={handleNav}>
                <Link href="/dashboard/leaderboard">
                  <Trophy className="h-6 w-6 text-yellow-500 mx-auto group-data-[collapsible=icon]:block" />
                  <span className="font-semibold group-data-[collapsible=icon]:hidden">Leaderboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <Separator className="my-3" />

            {/* Manager/Admin Tools */}
            {isManagerOrAdmin && (
              <>
                {/* For Managers: Show manager tools directly */}
                {isManager && !isAdmin && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={`nav-item shadow-sm${pathname === "/dashboard/lead-history" ? " active" : ""}`} onClick={handleNav}>
                        <Link href="/dashboard/lead-history">
                          <ClipboardList className="h-5 w-5" />
                          <span className="font-semibold">Lead History</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={`nav-item shadow-sm${pathname === "/dashboard/performance-analytics" ? " active" : ""}`} onClick={handleNav}>
                        <Link href="/dashboard/performance-analytics">
                          <Brain className="h-5 w-5" />
                          <span className="font-semibold">Analytics</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {/* For Admins: Show both Manager Tools and Admin Tools sections */}
                {isAdminOnly && (
                  <>
                    <SidebarMenuItem>
                      <div className="flex items-center space-x-3 px-2 py-1 text-sm font-medium text-muted-foreground group-data-[collapsible=icon]:hidden shadow-sm rounded-md">
                        <Users className="h-4 w-4" />
                        <span>Manager Tools</span>
                      </div>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={`nav-item ml-4 shadow-sm${pathname === "/dashboard/lead-history" ? " active" : ""}`} onClick={handleNav}>
                        <Link href="/dashboard/lead-history">
                          <ClipboardList className="h-4 w-4" />
                          <span className="font-semibold">Lead History</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={`nav-item ml-4 shadow-sm${pathname === "/dashboard/manage-teams" ? " active" : ""}`} onClick={handleNav}>
                        <Link href="/dashboard/manage-teams">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">Manage Teams</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={`nav-item ml-4 shadow-sm${pathname === "/dashboard/performance-analytics" ? " active" : ""}`} onClick={handleNav}>
                        <Link href="/dashboard/performance-analytics">
                          <Brain className="h-4 w-4" />
                          <span className="font-semibold">Analytics</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <div className="my-2" />

                    {/* Admin Tools */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={`nav-item shadow-sm${pathname === "/dashboard/admin-tools" ? " active" : ""}`} onClick={handleNav}>
                        <Link href="/dashboard/admin-tools">
                          <Settings className="h-5 w-5" />
                          <span className="font-semibold">Admin Tools</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                <Separator className="my-2" />
              </>
            )}

            {/* Availability Toggle for closers */}
            {user?.role === "closer" && (
              <SidebarMenuItem>
                <div className="px-2 py-1">
                  <AvailabilityToggle />
                </div>
              </SidebarMenuItem>
            )}

            {/* User Profile */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" className={`nav-item shadow-sm${pathname === "/dashboard/profile" ? " active" : ""}`}>
                <Link href="/dashboard/profile">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={user?.avatarUrl || undefined} 
                      alt={user?.displayName || user?.email || 'User'} 
                    />
                    <AvatarFallback>
                      {getAvatarFallbackText()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.displayName || user?.email}
                    </span>
                    <span className="truncate text-xs capitalize">{user?.role}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {/* Theme Toggle */}
            <SidebarMenuItem>
              <div className="flex items-center justify-between px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
                <div className="flex items-center space-x-2 group-data-[collapsible=icon]:space-x-0">
                  <Monitor className="h-4 w-4" />
                  <span className="text-xs group-data-[collapsible=icon]:hidden">Theme</span>
                </div>
                <ThemeToggleButton />
              </div>
            </SidebarMenuItem>

            {/* Logout Button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={logout}
                size="sm"
                className="hover:bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Create Lead Modal */}
      {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
        <CreateLeadForm
          isOpen={isCreateLeadModalOpen}
          onClose={() => setIsCreateLeadModalOpen(false)}
        />
      )}
    </>
  );
}

export default function DashboardSidebar({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Show loading screen while auth is loading
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if no user (auth hook will handle redirect)
  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <DashboardSidebarContent />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with sidebar trigger */}
          <header className="sticky top-0 z-40 w-full border-b border-border/20 bg-white/95 dark:bg-slate-950/95 dark:card-glass dark:glow-turquoise premium:card-glass premium:glow-premium backdrop-blur-md supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-slate-950/95 premium:supports-[backdrop-filter]:bg-transparent shadow-sm">
            <div className="flex h-16 items-center px-4">
              <SidebarTrigger className="mr-3 dark:text-turquoise dark:hover:bg-slate-800/50 dark:hover:glow-cyan premium:text-premium-purple premium:hover:bg-premium-glass/50 premium:hover:glow-premium" />
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {pathname === "/dashboard" ? "Dashboard" :
                   pathname === "/dashboard/lead-history" ? "Lead History" :
                   pathname === "/dashboard/analytics" ? "Analytics" :
                   pathname === "/dashboard/performance-analytics" ? "Analytics" :
                   pathname === "/dashboard/profile" ? "Profile" :
                   pathname === "/dashboard/admin-tools" ? "Admin Tools" :
                   pathname === "/dashboard/leaderboard" ? "Leaderboard" :
                   pathname === "/dashboard/quick-cleanup" ? "Quick Cleanup" :
                   "Dashboard"}
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4">
            {children || "Dashboard content goes here"}
          </main>
        </div>
      </div>
      
      {/* Floating Chat Button */}
      <FloatingChatButton />
    </SidebarProvider>
  );
}

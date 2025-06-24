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
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// Dynamic import with Next.js dynamic to avoid circular dependency issues
const CreateLeadForm = dynamic(() => import("./create-lead-form"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

function DashboardSidebarContent() {
  const { user, logout } = useAuth();
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);

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

  return (
    <>
      <Sidebar>
        <SidebarHeader className="premium:hidden">
          <div className="flex items-center justify-center p-4 group-data-[collapsible=icon]:p-2">
            {/* Light mode logo */}
            <img 
              src="https://imgur.com/BQs5krw.png" 
              alt="LeadFlow Logo" 
              className="h-16 w-auto max-w-full object-contain dark:hidden premium:hidden group-data-[collapsible=icon]:h-8"
            />
            {/* Dark mode - Bold text logo */}
            <div className="hidden dark:block group-data-[collapsible=icon]:hidden">
              <h1 className="text-xl font-bold text-center">
                LeadFlow
              </h1>
            </div>
            {/* Collapsed logo for dark mode */}
            <div className="hidden dark:group-data-[collapsible=icon]:block">
              <h1 className="text-lg font-bold text-center">
                LF
              </h1>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="shadow-sm">
                <Link href="/dashboard">
                  <Home className="h-5 w-5" />
                  <span className="font-semibold">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Create Lead Button */}
            {(user?.role === "setter" || isManagerOrAdmin) && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsCreateLeadModalOpen(true)}
                  className="shadow-sm"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span className="font-semibold">Create New Lead</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Leaderboard */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="shadow-sm">
                <Link href="/dashboard/leaderboard">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">Leaderboard</span>
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
                      <SidebarMenuButton asChild className="shadow-sm">
                        <Link href="/dashboard/lead-history">
                          <ClipboardList className="h-5 w-5" />
                          <span className="font-semibold">Lead History</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="shadow-sm">
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
                    {/* Manager Tools Section for Admins */}
                    <SidebarMenuItem>
                      <div className="flex items-center space-x-3 px-2 py-1 text-sm font-medium text-muted-foreground group-data-[collapsible=icon]:hidden shadow-sm rounded-md">
                        <Users className="h-4 w-4" />
                        <span>Manager Tools</span>
                      </div>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="ml-4 shadow-sm">
                        <Link href="/dashboard/lead-history">
                          <ClipboardList className="h-4 w-4" />
                          <span className="font-semibold">Lead History</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="ml-4 shadow-sm">
                        <Link href="/dashboard/manage-teams">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">Manage Teams</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="ml-4 shadow-sm">
                        <Link href="/dashboard/performance-analytics">
                          <Brain className="h-4 w-4" />
                          <span className="font-semibold">Analytics</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <div className="my-2" />

                    {/* Admin Tools */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="shadow-sm">
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
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {/* User Profile */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" className="shadow-sm">
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
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <DashboardSidebarContent />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with sidebar trigger */}
          <header className="sticky top-0 z-40 w-full border-b border-border/20 bg-white/95 dark:bg-slate-950/95 dark:card-glass dark:glow-turquoise premium:card-glass premium:glow-premium backdrop-blur-md supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-slate-950/95 premium:supports-[backdrop-filter]:bg-transparent shadow-sm">
            <div className="flex h-16 items-center px-4">
              <SidebarTrigger className="mr-3 dark:text-turquoise dark:hover:bg-slate-800/50 dark:hover:glow-cyan premium:text-premium-purple premium:hover:bg-premium-glass/50 premium:hover:glow-premium" />
              {/* Team Logo */}
              {user?.teamId === "takeover-pros" && (
                <div className="flex items-center mr-4">
                  <img 
                    src="https://imgur.com/l5eskR4.png" 
                    alt="Takeoverpros Logo" 
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
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

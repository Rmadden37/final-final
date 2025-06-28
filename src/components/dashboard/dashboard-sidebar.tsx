"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LogOut, 
  ClipboardList,
  PlusCircle, 
  Home,
  Settings,
  Users,
  Trophy,
  Brain,
  Menu
} from "lucide-react";
import AvailabilityToggle from "./availability-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import React from "react";
import dynamic from "next/dynamic";
import FloatingChatButton from "./floating-ai-button";
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
  useSidebar,
  SidebarSeparator
} from "@/components/ui/sidebar";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import Image from "next/image";

// Dynamic import for Create Lead Form
const CreateLeadForm = dynamic(() => import("./create-lead-form"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function DashboardSidebar({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
      <FloatingChatButton />
    </SidebarProvider>
  );
}

function AppSidebar() {
  usePushNotifications();
  const { user, logout, loading } = useAuth();
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  if (loading || !user) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="p-4">Loading...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const isManagerOrAdmin = isManager || isAdmin;
  const isSetter = user?.role === "setter";
  const isCloser = user?.role === "closer";

  const handleNav = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b">
          <div className="flex h-16 items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="LeadFlow" 
              width={40} 
              height={40}
              onError={(e) => { 
                e.currentTarget.style.display = 'none';
                // Don't manipulate innerHTML directly - let React handle fallbacks
              }}
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {/* Main Navigation */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                <Link href="/dashboard" onClick={handleNav}>
                  <Home className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Create Lead - For Setters and Managers/Admins */}
            {(isSetter || isManagerOrAdmin) && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => {
                    setIsCreateLeadModalOpen(true);
                    handleNav(); // This will close the sidebar on mobile
                  }}
                  className="text-green-600 hover:text-green-700 dark:text-green-400"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>Create New Lead</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Leaderboard */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/leaderboard"}>
                <Link href="/dashboard/leaderboard" onClick={handleNav}>
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>Leaderboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Manager/Admin Tools Section */}
            {isManagerOrAdmin && (
              <>
                <SidebarSeparator className="my-4" />
                
                <div className="px-3 py-2">
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Manager Tools</span>
                  </h3>
                </div>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/lead-history"}>
                    <Link href="/dashboard/lead-history" onClick={handleNav}>
                      <ClipboardList className="h-5 w-5" />
                      <span>Lead History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/performance-analytics"}>
                    <Link href="/dashboard/performance-analytics" onClick={handleNav}>
                      <Brain className="h-5 w-5 text-blue-500" />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {isAdmin && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/manage-teams"}>
                        <Link href="/dashboard/manage-teams" onClick={handleNav}>
                          <Users className="h-5 w-5" />
                          <span>Manage Teams</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarSeparator className="my-4" />

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/admin-tools"}>
                        <Link href="/dashboard/admin-tools" onClick={handleNav}>
                          <Settings className="h-5 w-5" />
                          <span>Admin Tools</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </>
            )}

            {/* Availability Toggle for Closers */}
            {isCloser && (
              <>
                <SidebarSeparator className="my-4" />
                <SidebarMenuItem>
                  <div className="px-3 py-2">
                    <AvailabilityToggle />
                  </div>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t">
          <SidebarMenu>
            {/* User Profile */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" isActive={pathname === "/dashboard/profile"}>
                <Link href="/dashboard/profile" onClick={handleNav}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl || ""} />
                    <AvatarFallback>
                      {user?.displayName?.substring(0, 2).toUpperCase() || 
                       user?.email?.substring(0, 2).toUpperCase() || 
                       "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium truncate">
                      {user?.displayName || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {user?.role || 'User'}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Theme Toggle */}
            <SidebarMenuItem>
              <div className="px-3 py-2">
                <ThemeToggle />
              </div>
            </SidebarMenuItem>

            {/* Logout */}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout}>
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Create Lead Modal */}
      {isCreateLeadModalOpen && (
        <CreateLeadForm 
          isOpen={isCreateLeadModalOpen} 
          onClose={() => setIsCreateLeadModalOpen(false)} 
        />
      )}
    </>
  );
}

function Header() {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/dashboard/lead-history": "Lead History",
      "/dashboard/performance-analytics": "Performance Analytics",
      "/dashboard/profile": "Profile",
      "/dashboard/admin-tools": "Admin Tools",
      "/dashboard/leaderboard": "Leaderboard",
      "/dashboard/manage-teams": "Manage Teams",
    };
    return titles[pathname] || "Dashboard";
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-6">
      <SidebarTrigger className="md:hidden">
        <Menu className="h-5 w-5" />
      </SidebarTrigger>
      <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
    </header>
  );
}
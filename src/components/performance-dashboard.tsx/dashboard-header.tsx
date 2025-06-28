"use client";

import Link from "next/link";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {LogOut, UserCircle, PlusCircle} from "lucide-react";
import AvailabilityToggle from "./availability-toggle";
import {useState} from "react";
import dynamic from "next/dynamic";
import TeamChatButton from "./floating-team-chat-button";

// Dynamic import with Next.js dynamic to avoid circular dependency issues
const CreateLeadForm = dynamic(() => import("./create-lead-form"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function DashboardHeader() {
  const {user, logout} = useAuth();
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);

  const getAvatarFallbackText = () => {
    if (user?.displayName) return user.displayName.substring(0, 2).toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return <UserCircle size={24}/>;
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-6">
        {/* Professional Sidebar toggle */}
        <button
          className="flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm"
          onClick={() => {
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('sidebar-toggle');
              window.dispatchEvent(event);
            }
          }}
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" className="text-slate-600 dark:text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Spacer to push content to the right */}
        <div className="flex-1"></div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center justify-end space-x-2 sm:space-x-3 md:space-x-4 ml-auto z-10">
          {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
            <Button 
              onClick={() => setIsCreateLeadModalOpen(true)} 
              variant="primary-solid" 
              size="sm" 
              className="hidden sm:flex bg-gradient-to-r from-[#3574F2] to-[#5096F2] hover:from-[#3574F2]/90 hover:to-[#5096F2]/90 dark:from-turquoise dark:to-cyan dark:hover:from-turquoise/90 dark:hover:to-cyan/90 premium:from-premium-purple premium:to-premium-teal premium:hover:from-premium-purple/90 premium:hover:to-premium-teal/90 shadow-lg shadow-[#3574F2]/25 dark:shadow-turquoise/25 premium:shadow-premium-purple/25 hover:shadow-xl hover:shadow-[#3574F2]/30 dark:hover:shadow-turquoise/30 premium:hover:shadow-premium-purple/30 transition-all duration-300 border-0 dark:glow-turquoise premium:glow-premium group"
            >
              <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden md:inline">Create New Lead</span>
              <span className="md:hidden">Create</span>
            </Button>
          )}
          {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
            <Button 
              onClick={() => setIsCreateLeadModalOpen(true)} 
              variant="primary-solid" 
              size="sm" 
              className="sm:hidden bg-gradient-to-r from-[#3574F2] to-[#5096F2] hover:from-[#3574F2]/90 hover:to-[#5096F2]/90 dark:from-turquoise dark:to-cyan dark:hover:from-turquoise/90 dark:hover:to-cyan/90 premium:from-premium-purple premium:to-premium-teal premium:hover:from-premium-purple/90 premium:hover:to-premium-teal/90 shadow-lg shadow-[#3574F2]/25 dark:shadow-turquoise/25 premium:shadow-premium-purple/25 border-0 dark:glow-turquoise premium:glow-premium group"
            >
              <PlusCircle className="h-4 w-4 premium:nav-icon premium:icon-glow-white transition-all duration-300" />
            </Button>
          )}
          
          <TeamChatButton />
          
          {user?.role === "closer" && <AvailabilityToggle />}
          
          <Link 
            href="/dashboard/profile" 
            className="flex items-center space-x-2 p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 premium:hover:bg-premium-glass/50 dark:card-glass dark:glow-cyan premium:card-glass premium:glow-premium transition-all duration-300 group"
          >
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-border dark:border-turquoise/30 premium:border-premium-glow shadow-sm dark:glow-turquoise premium:glow-premium">
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || user?.email || "User"} />
              <AvatarFallback className="bg-gradient-to-br from-[#3574F2]/20 to-[#5096F2]/10 dark:from-turquoise/20 dark:to-cyan/10 premium:from-premium-purple/20 premium:to-premium-teal/10 text-[#3574F2] dark:text-turquoise premium:text-premium-purple font-semibold">
                {getAvatarFallbackText()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col text-xs">
              <span className="font-semibold text-foreground">{user?.displayName || user?.email}</span>
              <span className="text-muted-foreground capitalize">{user?.role}</span>
            </div>
          </Link>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout} 
            aria-label="Logout" 
            className="h-8 w-8 sm:h-10 sm:w-10 hover:bg-red-50 dark:hover:bg-red-950/20 premium:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 premium:hover:text-red-300 transition-colors duration-300 group"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5 premium:nav-icon premium:icon-glow-white transition-all duration-300" />
          </Button>
        </div>
      </header>
      {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
        <CreateLeadForm
          isOpen={isCreateLeadModalOpen}
          onClose={() => setIsCreateLeadModalOpen(false)}
        />
      )}
    </>
  );
}
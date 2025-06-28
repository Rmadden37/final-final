// src/components/dashboard/closer-card.tsx
"use client";

import type {Closer, LeadStatus} from "@/types";
import {Card, CardContent} from "@/components/ui/card";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {UserCheck, UserX, Loader2, ArrowUp, ArrowDown, Briefcase, Crown as _Crown} from "lucide-react";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import ProfileCard from "./profile-card";

import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {doc, updateDoc, serverTimestamp as _serverTimestamp, Timestamp as _Timestamp} from "firebase/firestore";
import {useToast} from "@/hooks/use-toast";
import {useState, useEffect} from "react";
import { getPhotoUrlByName } from "@/utils/photo-vlookup";

interface CloserCardProps {
  closer: Closer;
  allowInteractiveToggle?: boolean;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showMoveControls?: boolean;
  isUpdatingOrder?: boolean;
  assignedLeadName?: string;
  onLeadClick?: () => void;
  onDispositionChange?: (status: LeadStatus, scheduledTime?: Date) => void;
  showDispositionSelector?: boolean;
  currentLeadStatus?: LeadStatus;
  leadId?: string;
  position?: number;
}

export default function CloserCard({
  closer,
  allowInteractiveToggle = true,
  onMove,
  canMoveUp,
  canMoveDown,
  showMoveControls,
  isUpdatingOrder,
  assignedLeadName,
  onLeadClick,
  onDispositionChange,
  showDispositionSelector = false,
  currentLeadStatus,
  leadId,
  position,
}: CloserCardProps) {
  const {user} = useAuth();
  const {toast} = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [photoVlookupUrl, setPhotoVlookupUrl] = useState<string | undefined>(undefined);
  
  const isAcceptedLead = currentLeadStatus === "accepted";
  const isScheduledLead = currentLeadStatus === "scheduled";
  const isWaitingAssignmentLead = currentLeadStatus === "waiting_assignment";

  const canUserManagerOrSelfToggle = user && (user.role === "manager" || user.role === "admin" || (user.role === "closer" && user.uid === closer.uid));
  const showInteractiveSwitch = canUserManagerOrSelfToggle && allowInteractiveToggle && !assignedLeadName;

  // Try to fetch vlookup photo if no avatarUrl
  useEffect(() => {
    let ignore = false;
    if (!closer.avatarUrl && closer.name) {
      getPhotoUrlByName(closer.name).then(url => {
        if (!ignore) setPhotoVlookupUrl(url);
      });
    }
    return () => { ignore = true; };
  }, [closer.avatarUrl, closer.name]);

  const handleToggleCloserAvailability = async (checked: boolean) => {
    if (!user || !canUserManagerOrSelfToggle || assignedLeadName) return;

    setIsUpdatingStatus(true);
    const newStatus = checked ? "On Duty" : "Off Duty";

    try {
      const closerDocRef = doc(db, "closers", closer.uid);
      await updateDoc(closerDocRef, {
        status: newStatus,
      });
      toast({
        title: "Status Updated",
        description: `${closer.name || "Closer"}'s status set to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Could not update ${closer.name || "Closer"}'s status.`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const currentStatusIsOnDuty = closer.status === "On Duty";
  const avatarSrc = closer.avatarUrl || photoVlookupUrl || `https://ui-avatars.com/api/?name=${(closer.name || "User").replace(/\s+/g, "+")}&background=random&color=fff`;
  const avatarDataAiHint = closer.avatarUrl ? undefined : (closer.name?.split(" ")[0]?.toLowerCase() || "person");

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700">
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="flex items-start space-x-3 sm:space-x-4">
          {/* Position indicator */}
          {position && (
            <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-slate-600 text-sm sm:text-base font-bold rounded-full border border-slate-300">
              {position}
            </div>
          )}
          
          {/* Avatar - Made larger */}
          <Avatar 
            className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 border-2 shadow-lg flex-shrink-0 cursor-pointer transition-all duration-300 border-slate-200 hover:border-primary hover:shadow-xl"
            onClick={() => {
              setIsProfileModalOpen(true);
            }}
          >
            <AvatarImage src={avatarSrc} alt={closer.name || "User"} data-ai-hint={avatarDataAiHint} />
            <AvatarFallback className="font-bold text-sm sm:text-base lg:text-lg bg-blue-100 text-blue-900">
              {closer.name ? closer.name.substring(0, 2).toUpperCase() : "N/A"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              {/* Name - Made larger */}
              <p className="text-sm sm:text-base lg:text-lg font-bold font-headline text-gray-900 dark:text-gray-100 truncate">
                {closer.name || "Unnamed Closer"}
              </p>
            </div>
            
            {assignedLeadName ? (
              <div 
                className={`flex items-center text-sm sm:text-base mt-2 ${onLeadClick ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''} text-blue-700 dark:text-blue-300`}
                onClick={() => {
                  if (onLeadClick) {
                    onLeadClick();
                  }
                }}
                role={onLeadClick ? "button" : undefined}
                tabIndex={onLeadClick ? 0 : undefined}
                onKeyDown={onLeadClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLeadClick(); } } : undefined}
              >
                <Briefcase className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="font-medium truncate">Working on: {assignedLeadName}</span>
              </div>
            ) : showInteractiveSwitch ? (
              <div className="flex items-center space-x-3 mt-2">
                <Switch
                  id={`status-toggle-${closer.uid}`}
                  checked={currentStatusIsOnDuty}
                  onCheckedChange={handleToggleCloserAvailability}
                  disabled={isUpdatingStatus || isUpdatingOrder}
                  aria-label={currentStatusIsOnDuty ? `Set ${closer.name || "Closer"} to Off Duty` : `Set ${closer.name || "Closer"} to On Duty`}
                  className="scale-90 sm:scale-100"
                />
                <Label
                  htmlFor={`status-toggle-${closer.uid}`}
                  className={`text-sm sm:text-base font-medium ${currentStatusIsOnDuty ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    currentStatusIsOnDuty ? "Available" : "Off Duty"
                  )}
                </Label>
              </div>
            ) : (
              <div className={`flex items-center text-sm sm:text-base mt-2 ${currentStatusIsOnDuty ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {currentStatusIsOnDuty ? (
                  <UserCheck className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <UserX className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                )}
                <span className="font-medium">{currentStatusIsOnDuty ? "Available" : "Off Duty"}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons row */}
        {((isWaitingAssignmentLead || isScheduledLead || isAcceptedLead) && onDispositionChange) || 
         (showMoveControls && onMove && !assignedLeadName) ? (
          <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            {/* Accept buttons for managers/admins */}
            {(isWaitingAssignmentLead || isScheduledLead) && (user?.role === "manager" || user?.role === "admin") && onDispositionChange && (
              <Button 
                size="sm" 
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm bg-green-500/80 backdrop-blur-sm hover:bg-green-600/90 text-white border border-green-400/30 hover:border-green-300/50 transition-all duration-300"
                onClick={() => {
                  onDispositionChange("in_process");
                  toast({
                    title: "Lead Accepted",
                    description: "Lead has been accepted and is now in process."
                  });
                }}
              >
                Accept & Start
              </Button>
            )}
            
            {/* Accept Job button for scheduled leads (closers only) */}
            {isScheduledLead && user?.role === "closer" && onDispositionChange && (
              <Button 
                size="sm" 
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm bg-green-500/80 backdrop-blur-sm hover:bg-green-600/90 text-white border border-green-400/30 hover:border-green-300/50 transition-all duration-300"
                onClick={() => {
                  onDispositionChange("accepted");
                  toast({
                    title: "Job Accepted",
                    description: "Job has been accepted."
                  });
                }}
              >
                Accept Job
              </Button>
            )}
            
            {/* Start Working button for accepted leads (closers only) */}
            {isAcceptedLead && user?.role === "closer" && onDispositionChange && (
              <Button 
                size="sm" 
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm bg-blue-500/80 backdrop-blur-sm hover:bg-blue-600/90 text-white border border-blue-400/30 hover:border-blue-300/50 transition-all duration-300"
                onClick={() => {
                  onDispositionChange("in_process");
                  toast({
                    title: "Lead Status Updated",
                    description: "You are now actively working on this lead."
                  });
                }}
              >
                Start Working
              </Button>
            )}

            {/* Move Controls */}
            {showMoveControls && onMove && !assignedLeadName && (
              <div className="flex items-center space-x-1 ml-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => onMove("up")} disabled={!canMoveUp || isUpdatingStatus || isUpdatingOrder}>
                  <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => onMove("down")} disabled={!canMoveDown || isUpdatingStatus || isUpdatingOrder}>
                  <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
      
      {/* Profile Modal */}
      <ProfileCard
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={{
          uid: closer.uid,
          name: closer.name || "Unnamed Closer",
          email: null,
          phone: closer.phone || null,
          avatarUrl: closer.avatarUrl || `https://ui-avatars.com/api/?name=${(closer.name || "User").replace(/\s+/g, "+")}&background=random&color=fff`,
          role: "closer"
        }}
      />
    </Card>
  );
}
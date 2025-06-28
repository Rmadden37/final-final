"use client";

import { useState } from "react";
import type { Closer } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Phone, 
  Power, 
  PowerOff,
  Crown,
  Shield,
  CheckCircle,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

interface CloserCardProps {
  closer: Closer | null | undefined;
  assignedLeadName?: string;
  allowInteractiveToggle?: boolean;
  position?: number;
  onLeadClick?: () => void;
  showStatusToggle?: boolean;
  compact?: boolean;
}

export default function CloserCard({
  closer,
  assignedLeadName,
  allowInteractiveToggle = true,
  position,
  onLeadClick,
  showStatusToggle = true,
  compact = false
}: CloserCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Debug logging
  console.log('CloserCard render:', { closer, hasCloser: !!closer, closerUid: closer?.uid, closerName: closer?.name });

  // Early return if closer is null or undefined - but make it more visible
  if (!closer) {
    return (
      <Card className="shadow-md border border-gray-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0 border">
              <AvatarFallback className="bg-gray-100 text-gray-600 font-semibold">
                ?
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-gray-700 font-medium">Loading closer data...</div>
              <div className="text-gray-500 text-sm">Please wait</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Validate that we have a valid closer object
  if (!closer.uid) {
    console.error('Invalid closer object - missing uid:', closer);
    return (
      <Card className="shadow-md border border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="text-red-600">Error: Invalid closer data</div>
        </CardContent>
      </Card>
    );
  }

  const canToggleStatus = allowInteractiveToggle && 
    (user?.role === "manager" || user?.role === "admin" || user?.uid === closer.uid);

  const handleStatusToggle = async () => {
    if (!canToggleStatus || isUpdating || !closer?.uid) return;

    setIsUpdating(true);
    try {
      const newStatus = closer.status === "On Duty" ? "Off Duty" : "On Duty";
      const closerRef = doc(db, "closers", closer.uid);
      
      await updateDoc(closerRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Status Updated",
        description: `${closer.name || 'User'} is now ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating closer status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = () => {
    if (closer?.status === "On Duty") {
      return <Power className="h-3 w-3 text-green-600" />;
    }
    return <PowerOff className="h-3 w-3 text-gray-400" />;
  };

  const getStatusColor = () => {
    if (closer?.status === "On Duty") {
      return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400";
    }
    return "bg-gray-100 text-gray-600 dark:bg-gray-900/50 dark:text-gray-400";
  };

  const getRoleIcon = () => {
    switch (closer?.role) {
      case "admin":
        return <Crown className="h-3 w-3 text-purple-600" />;
      case "manager":
        return <Shield className="h-3 w-3 text-blue-600" />;
      case "closer":
        return <User className="h-3 w-3 text-gray-600" />;
      default:
        return <User className="h-3 w-3 text-gray-600" />;
    }
  };

  // Safe getInitials function with comprehensive null checks
  const getInitials = (name?: string | null) => {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return "U"; // Default fallback
    }
    
    try {
      return name
        .trim()
        .split(" ")
        .filter(word => word && word.length > 0) // Filter out empty strings and null values
        .map(word => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"; // Fallback if no valid characters
    } catch (error) {
      console.error("Error generating initials:", error);
      return "U";
    }
  };

  // Safe display values with explicit defaults
  const displayName = closer?.name && closer.name.trim() ? closer.name : 'Unknown User';
  const displayStatus = closer?.status || 'Unknown';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Position Number */}
        {position && (
          <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{position}</span>
          </div>
        )}

        {/* Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0 border">
          {closer?.avatarUrl && (
            <AvatarImage 
              src={closer.avatarUrl} 
              alt={displayName}
              onError={(e) => {
                console.error("Avatar image failed to load:", e);
              }}
            />
          )}
          <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold">
            {getInitials(closer?.name)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {displayName}
            </h4>
            <Badge variant="secondary" className={`text-xs ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="ml-1">{displayStatus}</span>
            </Badge>
          </div>
          
          {assignedLeadName && (
            <div className="text-xs text-muted-foreground mt-1">
              Working on:{" "}
              {onLeadClick ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔥 CloserCard - Lead name clicked:', assignedLeadName);
                    onLeadClick();
                  }}
                  className="text-primary hover:underline font-medium cursor-pointer transition-colors"
                >
                  {assignedLeadName}
                </button>
              ) : (
                <span className="font-medium">{assignedLeadName}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 bg-white border border-gray-200 dark:card-glass dark:glow-cyan dark:border-white/[.08]">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Position Number (if provided) */}
          {position && (
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">{position}</span>
            </div>
          )}

          {/* Avatar with comprehensive error handling */}
          <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-blue-200 dark:ring-blue-900 border">
            {closer?.avatarUrl && (
              <AvatarImage 
                src={closer.avatarUrl} 
                alt={displayName}
                onError={(e) => {
                  console.error("Avatar image failed to load:", e);
                }}
              />
            )}
            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold">
              {getInitials(closer?.name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </h3>
              {getRoleIcon()}
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={`text-xs ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="ml-1">{displayStatus}</span>
              </Badge>
              {closer?.lineupOrder && (
                <Badge variant="outline" className="text-xs">
                  Order: {closer.lineupOrder}
                </Badge>
              )}
            </div>

            {/* Phone Number */}
            {closer?.phone && (
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>{closer.phone}</span>
              </div>
            )}

            {/* Assigned Lead */}
            {assignedLeadName && (
              <div className="flex items-center text-sm mb-2">
                {closer?.status === "On Duty" ? (
                  <CheckCircle className="h-3 w-3 mr-2 text-green-500 flex-shrink-0" />
                ) : (
                  <Clock className="h-3 w-3 mr-2 text-yellow-500 flex-shrink-0" />
                )}
                <span className="text-muted-foreground">
                  Working on:{" "}
                  {onLeadClick ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🔥 CloserCard - Lead name clicked:', assignedLeadName);
                        onLeadClick();
                      }}
                      className="text-primary hover:underline font-medium cursor-pointer transition-colors"
                    >
                      {assignedLeadName}
                    </button>
                  ) : (
                    <span className="font-medium">{assignedLeadName}</span>
                  )}
                </span>
              </div>
            )}

            {/* Status Toggle Button */}
            {showStatusToggle && canToggleStatus && (
              <div className="mt-3">
                <Button
                  variant={closer?.status === "On Duty" ? "destructive" : "default"}
                  size="sm"
                  onClick={handleStatusToggle}
                  disabled={isUpdating}
                  className="w-full text-xs dark:card-glass dark:glow-cyan dark:hover:glow-turquoise transition-all duration-300"
                >
                  {isUpdating ? (
                    <>
                      <Clock className="h-3 w-3 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : closer?.status === "On Duty" ? (
                    <>
                      <PowerOff className="h-3 w-3 mr-2" />
                      Set Off Duty
                    </>
                  ) : (
                    <>
                      <Power className="h-3 w-3 mr-2" />
                      Set On Duty
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
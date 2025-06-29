"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Calendar, 
  User, 
  MessageSquare,
  MoreHorizontal,
  Camera
} from "lucide-react";
import { format } from "date-fns";
import type { Lead } from "@/types";
import VerifiedCheckbox from "./verified-checkbox";

interface LeadCardProps {
  lead: Lead;
  context?: "dashboard" | "calendar" | "all-leads" | "history";
  onStatusUpdate?: (leadId: string, newStatus: string) => void;
  onAssignCloser?: (leadId: string, closerId: string) => void;
}

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case "sold":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "no_sale":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    case "canceled":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    case "credit_fail":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
    case "scheduled":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "waiting_assignment":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

export default function LeadCard({ 
  lead, 
  context = "dashboard",
  onStatusUpdate,
  onAssignCloser 
}: LeadCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "h:mm a");
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with customer info and status */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{lead.customerName}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.customerPhone}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor(lead.status)}>
                {lead.status.replace("_", " ").toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {lead.dispatchType}
              </Badge>
            </div>
          </div>

          {/* Address */}
          {lead.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{lead.address}</span>
            </div>
          )}

          {/* Team info */}
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="font-medium">Setter:</span>
              <span className="truncate">{lead.setterName}</span>
            </div>
            {lead.assignedCloserName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="font-medium">Closer:</span>
                <span className="truncate">{lead.assignedCloserName}</span>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Created: {formatTime(lead.createdAt)}</span>
            </div>
            {lead.scheduledAppointmentTime && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-600" />
                <span className="text-blue-600">
                  {formatTime(lead.scheduledAppointmentTime)}
                </span>
              </div>
            )}
          </div>

          {/* Photos indicator */}
          {lead.photoUrls && lead.photoUrls.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Camera className="h-3 w-3" />
              <span>{lead.photoUrls.length} photo{lead.photoUrls.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Disposition notes */}
          {lead.dispositionNotes && (
            <div className="text-xs bg-muted/50 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <MessageSquare className="h-3 w-3" />
                <span className="font-medium">Notes:</span>
              </div>
              <p className="line-clamp-2">{lead.dispositionNotes}</p>
            </div>
          )}

          {/* Actions and verification */}
          <div className="flex items-center justify-between pt-2 border-t">
            <VerifiedCheckbox lead={lead} size="sm" />
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                ID: {lead.id.slice(-8)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-6 w-6 p-0"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Expanded details */}
          {showDetails && (
            <div className="pt-2 border-t space-y-2 text-xs">
              <div>
                <span className="font-medium">Created:</span> {formatDate(lead.createdAt)}
              </div>
              {lead.updatedAt && (
                <div>
                  <span className="font-medium">Updated:</span> {formatDate(lead.updatedAt)}
                </div>
              )}
              {lead.scheduledAppointmentTime && (
                <div>
                  <span className="font-medium">Appointment:</span> {formatDate(lead.scheduledAppointmentTime)}
                </div>
              )}
              <div>
                <span className="font-medium">Team ID:</span> {lead.teamId}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
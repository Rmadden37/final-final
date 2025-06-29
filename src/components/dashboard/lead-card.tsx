"use client";

import { useState } from "react";
import type { Lead } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Phone, 
  Clock, 
  User, 
  Calendar,
  Camera,
  MoreVertical,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import LeadPhotoGallery from "./lead-photo-gallery";
import LeadVerificationButton from "./lead-verification-button";
import SelfAssignButton from "./self-assign-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LeadCardProps {
  lead: Lead;
  context?: "queue-waiting" | "queue-scheduled" | "in-process" | "default";
  onLeadClick?: () => void;
}

export default function LeadCard({ lead, context = "default", onLeadClick }: LeadCardProps) {
  const { user } = useAuth();
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);

  const handleCardClick = () => {
    if (onLeadClick) {
      onLeadClick();
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sold":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "no_sale":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "scheduled":
      case "rescheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "waiting_assignment":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "in_process":
      case "accepted":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const showSelfAssign = context === "queue-waiting" && 
    (user?.role === "closer" || user?.role === "manager") && 
    !lead.assignedCloserId;

  return (
    <>
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{lead.customerName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status.replace("_", " ").toUpperCase()}
                  </Badge>
                  {lead.dispatchType && (
                    <Badge variant="outline" className="text-xs">
                      {lead.dispatchType}
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    // Handle view details
                  }}>
                    View Details
                  </DropdownMenuItem>
                  {lead.photoUrls && lead.photoUrls.length > 0 && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setIsPhotoGalleryOpen(true);
                    }}>
                      <Camera className="mr-2 h-4 w-4" />
                      View Photos ({lead.photoUrls.length})
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{lead.customerPhone}</span>
              </div>
              {lead.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span className="line-clamp-2">{lead.address}</span>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {lead.setterName && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="font-medium">Setter:</span> {lead.setterName}
                </div>
              )}
              {lead.assignedCloserName && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="font-medium">Closer:</span> {lead.assignedCloserName}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Created:</span> {formatDate(lead.createdAt)}
              </div>
              {lead.scheduledAppointmentTime && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className="font-medium">Scheduled:</span> {formatDate(lead.scheduledAppointmentTime)}
                </div>
              )}
            </div>

            {/* Verification Status */}
            {(lead.status === "scheduled" || lead.status === "rescheduled") && (
              <div className="flex items-center justify-between pt-2 border-t">
                <LeadVerificationButton lead={lead} />
                {lead.setterVerified ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unverified
                  </Badge>
                )}
              </div>
            )}

            {/* Self Assign Button */}
            {showSelfAssign && (
              <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                <SelfAssignButton leadId={lead.id} />
              </div>
            )}

            {/* Photo Count Badge */}
            {lead.photoUrls && lead.photoUrls.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPhotoGalleryOpen(true);
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                View {lead.photoUrls.length} Photo{lead.photoUrls.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery Modal */}
      {lead.photoUrls && lead.photoUrls.length > 0 && (
        <LeadPhotoGallery
          photoUrls={lead.photoUrls}
          customerName={lead.customerName}
          isOpen={isPhotoGalleryOpen}
          onClose={() => setIsPhotoGalleryOpen(false)}
        />
      )}
    </>
  );
}
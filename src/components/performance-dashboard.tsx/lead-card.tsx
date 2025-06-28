"use client";

import type {Lead} from "@/types";
import {Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Ban,
  CalendarClock,
  CreditCard,
  User,
  Phone,
  Clock,
  ClipboardList,
  MapPin,
  Mail,
  ImageIcon,
  Zap,
  ArrowDown,
  Ghost,
} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";
import {useState, useEffect, useMemo} from "react";
import LeadDispositionModal from "./lead-disposition-modal";
import LeadPhotoGallery from "./lead-photo-gallery";
import VerifiedCheckbox from "./verified-checkbox";
import {Badge} from "@/components/ui/badge";
import {formatDistanceToNow, format as formatDate} from "date-fns";

interface LeadCardProps {
  lead: Lead;
  context?: "in-process" | "queue-waiting" | "queue-scheduled" | "all-leads";
  onLeadClick?: (lead: Lead) => void;
}

const getStatusIcon = (status: Lead["status"]) => {
  switch (status) {
    case "in_process":
      return <Ghost className="h-4 w-4 text-white stroke-2 premium:icon-glow-white" fill="none" stroke="currentColor" strokeWidth={2} />;
    case "accepted":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "sold":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "no_sale":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "canceled":
      return <Ban className="h-4 w-4 text-yellow-500" />;
    case "rescheduled":
      return <CalendarClock className="h-4 w-4 text-purple-500" />;
    case "scheduled":
      return <CalendarClock className="h-4 w-4 text-blue-500" />;
    case "credit_fail":
      return <CreditCard className="h-4 w-4 text-blue-500" />;
    case "waiting_assignment":
      return <ClipboardList className="h-4 w-4 text-gray-500" />;
    case "expired":
      return <Clock className="h-4 w-4 text-gray-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusVariant = (status: Lead["status"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "sold": 
      return "default";
    case "accepted": 
    case "in_process": 
      return "secondary";
    case "no_sale":
    case "credit_fail":
    case "canceled":
      return "destructive";
    case "waiting_assignment":
    case "rescheduled":
    case "scheduled":
    case "expired":
    default:
      return "outline";
  }
};

export default function LeadCard({lead, context = "in-process", onLeadClick}: LeadCardProps) {
  const {user} = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);

  // Enhanced permission logic with detailed checks
  const canUpdateDisposition = useMemo(() => {
    // For closers: can update if lead is accepted or in_process AND assigned to them
    if (user?.role === "closer") {
      const isAssignedToUser = lead.assignedCloserId === user.uid;
      const isCorrectStatus = (lead.status === "in_process" || lead.status === "accepted");
      const result = isAssignedToUser && isCorrectStatus;
      
      if (context === "in-process") {
        console.log('🔍 Closer Permission Check:', {
          leadId: lead.id,
          isAssignedToUser,
          isCorrectStatus,
          leadStatus: lead.status,
          assignedCloserId: lead.assignedCloserId,
          userId: user.uid,
          result
        });
      }
      
      return result;
    }
    
    // For managers/admins: can update leads in specific contexts
    if (user?.role === "manager" || user?.role === "admin") {
      const allowedContexts = ["all-leads", "in-process", "queue-scheduled"];
      const result = allowedContexts.includes(context);
      
      if (context === "in-process") {
        console.log('🔍 Manager/Admin Permission Check:', {
          leadId: lead.id,
          userRole: user.role,
          context,
          allowedContexts,
          result
        });
      }
      
      return result;
    }
    
    return false;
  }, [user?.role, user?.uid, lead.assignedCloserId, lead.status, context, lead.id]);

  // Debug logging for in-process context
  useEffect(() => {
    if (context === "in-process") {
      console.log('🔍 LeadCard Debug Info:', {
        leadId: lead.id,
        customerName: lead.customerName,
        userRole: user?.role,
        userId: user?.uid,
        leadStatus: lead.status,
        assignedCloserId: lead.assignedCloserId,
        context: context,
        canUpdateDisposition: canUpdateDisposition,
        hasOnLeadClick: !!onLeadClick
      });
    }
  }, [lead.id, lead.customerName, user?.role, user?.uid, lead.status, lead.assignedCloserId, context, canUpdateDisposition, onLeadClick]);

  const timeCreatedAgo = lead.createdAt ? formatDistanceToNow(lead.createdAt.toDate(), {addSuffix: true}) : "N/A";

  const scheduledTimeDisplay = (lead.status === "rescheduled" || lead.status === "scheduled") && lead.scheduledAppointmentTime ?
    formatDate(lead.scheduledAppointmentTime.toDate(), "MMM d, p") :
    null;

  // Fixed card click handler
  const handleCardClick = () => {
    console.log('🔥 LeadCard - Card clicked:', { 
      leadId: lead.id, 
      customerName: lead.customerName,
      context: context,
      userRole: user?.role,
      hasOnLeadClick: !!onLeadClick,
      canUpdateDisposition
    });
    
    // Only trigger onLeadClick if it's provided and user has permission
    if (onLeadClick && canUpdateDisposition) {
      onLeadClick(lead);
    } else if (!onLeadClick) {
      console.log('❌ No onLeadClick handler provided');
    } else if (!canUpdateDisposition) {
      console.log('❌ User does not have disposition permission');
    }
  };

  // Fixed disposition button handler
  const handleDispositionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    console.log('🔥 LeadCard - Disposition button clicked:', { 
      leadId: lead.id, 
      customerName: lead.customerName,
      context: context,
      userRole: user?.role 
    });
    setIsModalOpen(true);
  };

  // Compact display for scheduled leads in the queue
  if (context === "queue-scheduled") {
    return (
      <>
        <Card 
          className={`shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col dark:card-glass dark:glow-turquoise dark:border-turquoise/20 ${
            canUpdateDisposition && onLeadClick ? 'cursor-pointer hover:dark:glow-cyan' : ''
          }`}
          onClick={canUpdateDisposition && onLeadClick ? handleCardClick : undefined}
        >
          <CardHeader className="pb-2 pt-3 px-3 sm:pb-3 sm:pt-4 sm:px-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center flex-1 min-w-0">
                <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base font-semibold font-headline text-left truncate">
                    {lead.customerName}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground text-left">
                    {lead.setterName && (
                      <span className="truncate">Set by: {lead.setterName}</span>
                    )}
                    {lead.status === "rescheduled" && lead.assignedCloserName && (
                      <span className="ml-2 text-blue-600 font-bold truncate">
                        • Assigned: {lead.assignedCloserName}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 ml-2 flex-shrink-0">
                <VerifiedCheckbox 
                  leadId={lead.id}
                  className="text-xs"
                />
                {lead.status !== "rescheduled" && (
                  <Badge variant={getStatusVariant(lead.status)} className="capitalize text-xs flex items-center gap-1 whitespace-nowrap">
                    {getStatusIcon(lead.status)}
                    <span className="hidden sm:inline">{lead.status.replace("_", " ")}</span>
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          {canUpdateDisposition && (
            <CardFooter className="pt-0 pb-2 px-3 sm:pb-3 sm:px-4">
              <Button 
                onClick={handleDispositionClick}
                size="sm" 
                variant="secondary"
                className="w-full text-xs sm:text-sm dark:card-glass dark:glow-cyan dark:hover:glow-turquoise transition-all duration-300"
              >
                <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Update Status
              </Button>
            </CardFooter>
          )}
        </Card>
        
        {canUpdateDisposition && (
          <LeadDispositionModal
            lead={lead}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </>
    );
  }

  // Minimal display for waiting leads in the queue
  if (context === "queue-waiting") {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col dark:card-glass dark:glow-cyan dark:border-white/[.08]">
        <CardHeader className="pb-2 pt-3 px-3 sm:pb-3 sm:pt-4 sm:px-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center flex-1 min-w-0">
              <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base font-semibold font-headline text-left truncate">
                  {lead.customerName}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground text-left">
                  {lead.setterName && (
                    <span className="truncate">Set by: {lead.setterName}</span>
                  )}
                </CardDescription>
              </div>
            </div>
            {lead.status !== "rescheduled" && (
              <Badge variant={getStatusVariant(lead.status)} className="capitalize text-xs flex items-center gap-1 whitespace-nowrap ml-2 flex-shrink-0">
                {getStatusIcon(lead.status)}
                <span className="hidden sm:inline">{lead.status.replace("_", " ")}</span>
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Full lead card display for in-process and all-leads contexts
  return (
    <>
      <Card 
        className={`shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col dark:card-glass dark:glow-cyan dark:border-white/[.08] ${
          canUpdateDisposition && onLeadClick ? 'cursor-pointer hover:dark:glow-turquoise' : ''
        }`}
        onClick={canUpdateDisposition && onLeadClick ? handleCardClick : undefined}
      >
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <User className="mr-2 h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <CardTitle className="text-base font-semibold font-headline text-left">
                  {lead.customerName}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground text-left">
                  Created {timeCreatedAgo}
                </CardDescription>
              </div>
            </div>
            {lead.status !== "rescheduled" && (
              <Badge variant={getStatusVariant(lead.status)} className="capitalize text-xs flex items-center gap-1 whitespace-nowrap ml-2">
                {getStatusIcon(lead.status)}
                {lead.status.replace("_", " ")}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="text-sm space-y-1.5 pb-3 px-4 flex-grow">
          <div className="flex items-center text-muted-foreground">
            <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>{lead.customerPhone}</span>
          </div>
          {lead.address && (
            <div className="flex items-start text-muted-foreground">
              <Mail className="mr-2 h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="truncate" title={lead.address}>{lead.address}</span>
            </div>
          )}
          <div className="flex items-center text-muted-foreground">
            <Zap className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="capitalize">{lead.dispatchType} Dispatch</span>
          </div>

          {/* Display assignment info for full details view */}
          {lead.assignedCloserName && lead.status === "in_process" && (
            <div className="flex items-center text-muted-foreground">
              <User className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Assigned: {lead.assignedCloserName}</span>
            </div>
          )}

          {/* Display assigned closer for rescheduled leads */}
          {lead.assignedCloserName && lead.status === "rescheduled" && (
            <div className="flex items-center text-blue-600">
              <User className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="font-bold">Assigned: {lead.assignedCloserName}</span>
            </div>
          )}

          {scheduledTimeDisplay && (
            <div className="flex items-center text-blue-600">
              <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="font-bold">Scheduled: {scheduledTimeDisplay}</span>
            </div>
          )}

          {(user?.role === "manager" || user?.role === "admin") && lead.setterName && (
            <div className="flex items-center text-muted-foreground text-xs mt-1">
              <User className="mr-2 h-3 w-3 text-gray-400 flex-shrink-0" />
              <span>Set by: {lead.setterName}</span>
            </div>
          )}
          
          {/* FIXED: Completely null-safe setterLocation handling */}
          {(user?.role === "manager" || user?.role === "admin") && 
           lead.setterLocation && 
           lead.setterLocation !== null &&
           typeof lead.setterLocation === 'object' && 
           'latitude' in lead.setterLocation && 
           'longitude' in lead.setterLocation &&
           typeof lead.setterLocation.latitude === 'number' && 
           typeof lead.setterLocation.longitude === 'number' && (
            <div className="flex items-center text-muted-foreground text-xs mt-1">
              <MapPin className="mr-2 h-3 w-3 text-gray-400 flex-shrink-0" />
              <span>
                Loc: {lead.setterLocation.latitude.toFixed(2)}, {lead.setterLocation.longitude.toFixed(2)}
                {" "}
                <a
                  href={`https://www.google.com/maps?q=${lead.setterLocation.latitude},${lead.setterLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  aria-label="View location on map"
                  onClick={(e) => e.stopPropagation()} // Prevent card click
                >
                  (Map)
                </a>
              </span>
            </div>
          )}
          
          {lead.photoUrls && lead.photoUrls.length > 0 && (
            <div className="flex items-center text-muted-foreground text-xs mt-1">
              <ImageIcon className="mr-2 h-3 w-3 text-gray-400 flex-shrink-0" />
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  console.log('🔥 LeadCard - Photo gallery clicked:', { 
                    leadId: lead.id, 
                    customerName: lead.customerName,
                    photoCount: lead.photoUrls?.length || 0,
                    userRole: user?.role 
                  });
                  setIsPhotoGalleryOpen(true);
                }}
                className="text-primary hover:underline cursor-pointer"
              >
                {lead.photoUrls.length} photo(s) attached - Click to view
              </button>
            </div>
          )}
        </CardContent>
        
        {canUpdateDisposition && (
          <CardFooter className="pt-0 pb-3 px-4">
            <Button 
              onClick={handleDispositionClick}
              size="sm" 
              variant="secondary"
              className="w-full dark:card-glass dark:glow-cyan dark:hover:glow-turquoise transition-all duration-300"
            >
              <ArrowDown className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {canUpdateDisposition && (
        <LeadDispositionModal
          lead={lead}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      
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
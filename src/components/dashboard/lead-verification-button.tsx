"use client";

import {useState} from "react";
import {Checkbox} from "@/components/ui/checkbox";
import {CheckCircle2, Clock, AlertTriangle} from "lucide-react";
import {doc, updateDoc, serverTimestamp} from "firebase/firestore";
import {db} from "@/lib/firebase";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import type {Lead} from "@/types";
import {format} from "date-fns";

interface LeadVerificationButtonProps {
  lead: Lead;
  onVerificationChange?: () => void;
}

export default function LeadVerificationButton({lead, onVerificationChange}: LeadVerificationButtonProps) {
  const {user} = useAuth();
  const {toast} = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Only show for setters and managers on scheduled/rescheduled leads
  if (!["setter", "manager"].includes(user?.role || "") || !["scheduled", "rescheduled"].includes(lead.status)) {
    return null;
  }

  const isVerified = lead.setterVerified === true;
  const isOwnLead = lead.setterId === user?.uid;
  const isManager = user?.role === "manager";

  // Check if lead is past due (10+ minutes past scheduled time)
  const now = new Date();
  const isPastDue = lead.scheduledAppointmentTime && 
    (now.getTime() - lead.scheduledAppointmentTime.toDate().getTime()) > (10 * 60 * 1000);

  const handleVerification = async () => {
    if (!user || isUpdating) return;

    setIsUpdating(true);
    try {
      const leadRef = doc(db, "leads", lead.id);
      
      if (isVerified) {
        // Remove verification
        await updateDoc(leadRef, {
          setterVerified: false,
          verifiedAt: null,
          verifiedBy: null,
          updatedAt: serverTimestamp(),
        });
        
        toast({
          title: "Verification Removed",
          description: `Removed verification for ${lead.customerName}'s appointment.`,
        });
      } else {
        // Add verification
        await updateDoc(leadRef, {
          setterVerified: true,
          verifiedAt: serverTimestamp(),
          verifiedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
        
        toast({
          title: "Appointment Verified",
          description: `Verified ${lead.customerName}'s appointment for ${lead.scheduledAppointmentTime ? format(lead.scheduledAppointmentTime.toDate(), "MMM d, p") : "scheduled time"}.`,
        });
      }
      
      onVerificationChange?.();
    } catch {
      toast({
        title: "Update Failed",
        description: "Could not update verification status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Show warning if past due
  if (isPastDue) {
    return (
      <div className="flex items-center gap-2 text-destructive text-xs">
        <AlertTriangle className="h-4 w-4" />
        <span>Past due - will be removed</span>
      </div>
    );
  }

  // Show verification status if not own lead and not a manager
  if (!isOwnLead && !isManager && isVerified) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-xs">
        <CheckCircle2 className="h-4 w-4" />
        <span>Verified by setter</span>
      </div>
    );
  }

  // Show verification button for own leads or managers
  if (isOwnLead || isManager) {
    return (
      <div className="flex items-center space-x-2">
        {isVerified ? (
          // Show Facebook verified checkmark when verified
          <div 
            className={`cursor-pointer transition-opacity ${isUpdating ? "opacity-50" : "hover:opacity-80"}`}
            onClick={() => !isUpdating && handleVerification()}
            title="Click to remove verification"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Facebook_verified_account_checkmark.jpg/250px-Facebook_verified_account_checkmark.jpg"
              alt="Verified"
              className="h-4 w-4 object-contain"
            />
          </div>
        ) : (
          // Show checkbox when not verified
          <Checkbox
            id={`verify-${lead.id}`}
            checked={false}
            onCheckedChange={(_checked) => {
              if (!isUpdating) {
                handleVerification();
              }
            }}
            disabled={isUpdating}
            className={`h-4 w-4 border-gray-300 hover:border-gray-400 ${isUpdating ? "opacity-50" : ""}`}
          />
        )}
        <label 
          htmlFor={`verify-${lead.id}`}
          className={`text-xs font-medium cursor-pointer select-none transition-colors ${
            isVerified ? "text-green-600" : "text-gray-700 dark:text-gray-300"
          } ${isUpdating ? "opacity-50" : "hover:text-green-500"}`}
          onClick={() => !isUpdating && handleVerification()}
        >
          {isUpdating ? (
            <div className="flex items-center">
              <Clock className="h-3 w-3 animate-spin mr-1" />
              Updating...
            </div>
          ) : (
            "Verified"
          )}
        </label>
      </div>
    );
  }

  return null;
}

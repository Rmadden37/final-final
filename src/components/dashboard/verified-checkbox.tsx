"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { Lead } from "@/types";

export interface VerifiedCheckboxProps {
  leadId?: string;
  isVerified?: boolean;
  lead?: Lead;
  size?: "sm" | "default" | "lg";
  onVerificationChange?: (verified: boolean) => void;
}

export default function VerifiedCheckbox({ 
  leadId, 
  isVerified = false, 
  lead, 
  size = "default",
  onVerificationChange 
}: VerifiedCheckboxProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Use lead prop if provided, otherwise use individual props
  const actualLeadId = leadId || lead?.id;
  const actualIsVerified = isVerified || lead?.setterVerified || false;

  // Only managers and admins can verify
  const canVerify = user?.role === "manager" || user?.role === "admin";

  const handleVerificationToggle = async (checked: boolean) => {
    if (!canVerify || !actualLeadId) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "leads", actualLeadId), {
        setterVerified: checked,
        verifiedAt: checked ? new Date() : null,
        verifiedBy: checked ? user?.uid : null,
      });

      toast({
        title: checked ? "Lead Verified" : "Verification Removed",
        description: checked 
          ? "Lead has been marked as verified." 
          : "Lead verification has been removed.",
      });

      onVerificationChange?.(checked);
    } catch (error) {
      console.error("Error updating verification:", error);
      toast({
        title: "Error",
        description: "Failed to update verification status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canVerify) {
    // Show read-only status for non-managers
    return (
      <Badge 
        variant={actualIsVerified ? "default" : "secondary"} 
        className={`
          ${size === "sm" ? "text-xs px-2 py-1" : ""}
          ${actualIsVerified 
            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
            : "bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400"
          }
        `}
      >
        {actualIsVerified ? (
          <>
            <CheckCircle2 className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} mr-1`} />
            Verified
          </>
        ) : (
          <>
            <AlertCircle className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} mr-1`} />
            Unverified
          </>
        )}
      </Badge>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`verify-${actualLeadId}`}
        checked={actualIsVerified}
        onCheckedChange={handleVerificationToggle}
        disabled={loading}
        className={size === "sm" ? "h-4 w-4" : ""}
      />
      <label 
        htmlFor={`verify-${actualLeadId}`} 
        className={`
          cursor-pointer font-medium transition-colors
          ${size === "sm" ? "text-xs" : "text-sm"}
          ${actualIsVerified 
            ? "text-green-600 dark:text-green-400" 
            : "text-gray-600 dark:text-gray-400"
          }
        `}
      >
        {actualIsVerified ? "Verified" : "Verify"}
      </label>
      {loading && (
        <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${size === "sm" ? "h-3 w-3" : "h-4 w-4"}`} />
      )}
    </div>
  );
}
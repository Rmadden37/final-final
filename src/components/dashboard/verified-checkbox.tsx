"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VerifiedCheckboxProps {
  leadId: string;
  disabled?: boolean;
  className?: string;
}

export default function VerifiedCheckbox({ leadId, disabled = false, className = "" }: VerifiedCheckboxProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        const docRef = doc(db, "leads", leadId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Check both isVerified and setterVerified for compatibility
          setIsVerified(data.isVerified || data.setterVerified || false);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching verification status:", error);
        toast({
          title: "Error",
          description: "Failed to load verification status",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchVerificationStatus();
  }, [leadId, toast]);

  const handleChange = async (checked: boolean) => {
    if (disabled) return;
    
    try {
      setUpdating(true);
      setIsVerified(checked);
      
      await updateDoc(doc(db, "leads", leadId), {
        isVerified: checked,
        setterVerified: checked, // Keep both fields in sync
        verifiedAt: checked ? new Date() : null,
        updatedAt: new Date()
      });

      toast({
        title: checked ? "Lead Verified" : "Lead Unverified",
        description: checked 
          ? "Lead is now verified and can be assigned to closers" 
          : "Lead verification removed",
        variant: checked ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error updating verification status:", error);
      setIsVerified(!checked); // Revert on error
      toast({
        title: "Update Failed",
        description: "Failed to update verification status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Checkbox
        id={`verified-${leadId}`}
        checked={isVerified}
        onCheckedChange={handleChange}
        disabled={disabled || updating}
        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
      />
      <Label 
        htmlFor={`verified-${leadId}`}
        className={`cursor-pointer text-sm flex items-center gap-1 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {updating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isVerified ? (
          <CheckCircle className="h-3 w-3 text-green-600" />
        ) : (
          <XCircle className="h-3 w-3 text-red-500" />
        )}
        <span className={isVerified ? "text-green-600 font-medium" : "text-red-500"}>
          {isVerified ? "Verified" : "Not Verified"}
        </span>
      </Label>
    </div>
  );
}
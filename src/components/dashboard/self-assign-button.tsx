"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserPlus, Loader2 } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";

interface SelfAssignButtonProps {
  leadId: string;
}

export default function SelfAssignButton({ leadId }: SelfAssignButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSelfAssign = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to assign leads.",
        variant: "destructive",
      });
      return;
    }

    if (!["closer", "manager"].includes(user.role || "")) {
      toast({
        title: "Access Denied",
        description: "Only closers and managers can self-assign leads.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const functions = getFunctions();
      const selfAssignLead = httpsCallable(functions, "selfAssignLead");
      
      const result = await selfAssignLead({ leadId });
      const data = result.data as { success: boolean; assignedCloser: { uid: string; name: string } };

      if (data.success) {
        toast({
          title: "Lead Assigned",
          description: `Lead successfully assigned to you!`,
        });
      } else {
        throw new Error("Assignment failed");
      }
    } catch (error) {
      console.error("Error self-assigning lead:", error);
      
      let errorMessage = "Failed to assign lead. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("permission-denied")) {
          errorMessage = "You don't have permission to assign this lead.";
        } else if (error.message.includes("invalid-argument")) {
          errorMessage = "This lead is not available for assignment.";
        } else if (error.message.includes("unauthenticated")) {
          errorMessage = "You must be logged in to assign leads.";
        } else if (error.message.includes("not-found")) {
          errorMessage = "Lead not found.";
        }
      }

      toast({
        title: "Assignment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSelfAssign}
      disabled={isLoading}
      size="sm"
      className="w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Assigning...
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          Assign to Me
        </>
      )}
    </Button>
  );
}

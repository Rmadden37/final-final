"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, arrayUnion, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";

export default function LeadReassignment() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    closer: { id: string; name: string } | null;
    lead: { id: string; customerName: string; status: string } | null;
    teamId: string | null;
    success: boolean;
  }>({
    closer: null,
    lead: null,
    teamId: null,
    success: false
  });
  
  // Check if user has manager or admin access
  const isManager = user?.role === "manager" || user?.role === "admin";

  const handleUnassignLead = async () => {
    setLoading(true);
    try {
      // 1. Find Ryan Madden's closer record
      const closersQuery = query(collection(db, "closers"), where("name", "==", "Ryan Madden"));
      const closerSnapshot = await getDocs(closersQuery);
      
      if (closerSnapshot.empty) {
        toast({
          title: "Error",
          description: "Could not find Ryan Madden in the closers collection",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const ryanMadden = { id: closerSnapshot.docs[0].id, ...closerSnapshot.docs[0].data() as any };
      console.log("Found Ryan Madden:", ryanMadden);
      
      // 2. Find the lead assigned to Ryan Madden (Ron Mcdonald)
      const leadsQuery = query(
        collection(db, "leads"), 
        where("assignedCloserId", "==", ryanMadden.id),
        where("customerName", "==", "Ron Mcdonald")
      );
      const leadSnapshot = await getDocs(leadsQuery);
      
      if (leadSnapshot.empty) {
        toast({
          title: "Error",
          description: "Could not find Ron Mcdonald lead assigned to Ryan Madden",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const ronMcdonaldLead = { id: leadSnapshot.docs[0].id, ...leadSnapshot.docs[0].data() as any };
      console.log("Found Ron Mcdonald lead:", ronMcdonaldLead);
      
      // 3. Get the team document to update the closer order
      const teamId = ryanMadden.teamId;
      if (!teamId) {
        toast({
          title: "Error",
          description: "Ryan Madden is not assigned to a team",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const teamDoc = await getDoc(doc(db, "teams", teamId));
      if (!teamDoc.exists()) {
        toast({
          title: "Error",
          description: "Team document not found",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const teamData = teamDoc.data();
      const closerOrder = teamData.closerOrder || [];
      
      // 4. Update the lead - remove the assignment
      await updateDoc(doc(db, "leads", ronMcdonaldLead.id), {
        status: "waiting_assignment",
        assignedCloserId: null,
        assignedCloserName: null,
        updatedAt: serverTimestamp(),
        history: arrayUnion({
          action: "unassigned",
          timestamp: new Date(),
          details: "Unassigned from Ryan Madden"
        })
      });
      
      // 5. Update the closer order to put Ryan at the top
      // First remove Ryan from the current order
      const filteredOrder = closerOrder.filter((id: string) => id !== ryanMadden.id);
      // Then add Ryan to the beginning
      const newOrder = [ryanMadden.id, ...filteredOrder];
      
      await updateDoc(doc(db, "teams", teamId), {
        closerOrder: newOrder,
        updatedAt: serverTimestamp()
      });
      
      // Success!
      setResult({
        closer: { id: ryanMadden.id, name: ryanMadden.name },
        lead: { id: ronMcdonaldLead.id, customerName: ronMcdonaldLead.customerName, status: ronMcdonaldLead.status },
        teamId,
        success: true
      });
      
      toast({
        title: "Success!",
        description: `Lead "${ronMcdonaldLead.customerName}" unassigned and Ryan Madden placed at the top of the lineup`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An error occurred while reassigning the lead",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Lead Reassignment Tool</CardTitle>
      </CardHeader>
      <CardContent>
        {!isManager ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mb-2" />
            <h3 className="font-bold text-lg">Manager Access Only</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You need manager permissions to use this tool.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              This tool will unassign the Ron Mcdonald lead from Ryan Madden and put Ryan back at the top of the closer lineup.
            </p>
            {result.success && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-900 mb-4">
                <h3 className="font-medium text-green-800 dark:text-green-300">Changes applied successfully:</h3>
                <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-400 mt-2 space-y-1">
                  <li>Unassigned lead "{result.lead?.customerName}" from {result.closer?.name}</li>
                  <li>Moved {result.closer?.name} to the top of the lineup</li>
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        {isManager && (
          <Button 
            onClick={handleUnassignLead} 
            disabled={loading || result.success}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : result.success ? (
              "Completed Successfully"
            ) : (
              "Unassign Lead & Reset Ryan's Position"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

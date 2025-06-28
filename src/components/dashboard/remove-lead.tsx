"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash, AlertCircle } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function RemoveLead() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    lead: { id: string; customerName: string; status: string; assignedCloserId: string | null } | null;
  }>({
    lead: null
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteComplete, setDeleteComplete] = useState(false);

  const handleSearchLead = async () => {
    setLoading(true);
    try {
      // Search for the Ron Mcdonald lead
      const leadsQuery = query(
        collection(db, "leads"),
        where("customerName", "==", "Ron Mcdonald")
      );
      const leadSnapshot = await getDocs(leadsQuery);
      
      if (leadSnapshot.empty) {
        toast({
          title: "Not Found",
          description: "No lead with the name 'Ron Mcdonald' was found",
          variant: "default"
        });
        setSearchResult({ lead: null });
        setLoading(false);
        return;
      }
      
      // Get the lead document
      const leadDoc = leadSnapshot.docs[0];
      const leadData = leadDoc.data();
      
      setSearchResult({
        lead: {
          id: leadDoc.id,
          customerName: leadData.customerName,
          status: leadData.status,
          assignedCloserId: leadData.assignedCloserId || null
        }
      });
      
      toast({
        title: "Lead Found",
        description: `Found lead: ${leadData.customerName} (${leadData.status})`,
      });
    } catch (error) {
      console.error("Error searching for lead:", error);
      toast({
        title: "Error",
        description: "Failed to search for the lead",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!searchResult.lead) return;
    
    setLoading(true);
    try {
      // Document reference
      const leadRef = doc(db, "leads", searchResult.lead.id);
      
      // If the lead is assigned to a closer, we should update that closer's logs
      if (searchResult.lead.assignedCloserId) {
        const closerRef = doc(db, "closers", searchResult.lead.assignedCloserId);
        await updateDoc(closerRef, {
          lastUpdated: serverTimestamp(),
          activityLog: arrayUnion({
            action: "lead_removed",
            leadName: searchResult.lead.customerName,
            timestamp: new Date().toISOString()
          })
        });
      }
      
      // Delete the lead document
      await deleteDoc(leadRef);
      
      toast({
        title: "Lead Deleted",
        description: `Successfully removed lead: ${searchResult.lead.customerName}`,
      });
      
      setDeleteComplete(true);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Error",
        description: "Failed to delete the lead",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Remove Ron Mcdonald Lead</CardTitle>
        </CardHeader>
        <CardContent>
          {deleteComplete ? (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-900 text-center">
              <p className="font-medium text-green-800 dark:text-green-300">Lead successfully removed!</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                The Ron Mcdonald lead has been completely removed from the database.
              </p>
            </div>
          ) : searchResult.lead ? (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md border border-amber-200 dark:border-amber-900">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">
                      Lead found: {searchResult.lead.customerName}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                      Status: <span className="font-medium">{searchResult.lead.status.replace("_", " ")}</span>
                    </p>
                    {searchResult.lead.assignedCloserId && (
                      <p className="text-sm text-amber-700 dark:text-amber-500">
                        Assigned to closer ID: <span className="font-mono text-xs">{searchResult.lead.assignedCloserId}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <Button 
                variant="destructive"
                className="w-full"
                onClick={() => setShowConfirmDialog(true)}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete This Lead
              </Button>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              Click the button below to search for and remove the Ron Mcdonald lead.
            </p>
          )}
        </CardContent>
        <CardFooter>
          {!deleteComplete && !searchResult.lead && (
            <Button 
              onClick={handleSearchLead} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Find Ron Mcdonald Lead"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead
              "{searchResult.lead?.customerName}" from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteLead}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete Lead"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, getDoc as _getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash, AlertCircle, UserMinus } from "lucide-react";
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

export default function ComprehensiveLeadCleanup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    lead: { id: string; customerName: string; status: string; assignedCloserId: string | null; assignedCloserName: string | null } | null;
    closer: { id: string; name: string; status: string } | null;
  }>({
    lead: null,
    closer: null
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [operationComplete, setOperationComplete] = useState(false);
  const [operation, setOperation] = useState<"unassign" | "delete">("unassign");

  const isManager = user?.role === "manager";

  const handleSearch = async () => {
    setLoading(true);
    try {
      // 1. Search for Ryan Madden
      const closersQuery = query(collection(db, "closers"), where("name", "==", "Ryan Madden"));
      const closerSnapshot = await getDocs(closersQuery);
      
      let ryanMadden = null;
      if (!closerSnapshot.empty) {
        const closerDoc = closerSnapshot.docs[0];
        ryanMadden = {
          id: closerDoc.id,
          name: closerDoc.data().name,
          status: closerDoc.data().status
        };
      }

      // 2. Search for the Ron Mcdonald lead
      const leadsQuery = query(
        collection(db, "leads"),
        where("customerName", "==", "Ron Mcdonald")
      );
      const leadSnapshot = await getDocs(leadsQuery);
      
      let ronMcdonaldLead = null;
      if (!leadSnapshot.empty) {
        const leadDoc = leadSnapshot.docs[0];
        const leadData = leadDoc.data();
        ronMcdonaldLead = {
          id: leadDoc.id,
          customerName: leadData.customerName,
          status: leadData.status,
          assignedCloserId: leadData.assignedCloserId || null,
          assignedCloserName: leadData.assignedCloserName || null
        };
      }
      
      setSearchResult({
        lead: ronMcdonaldLead,
        closer: ryanMadden
      });
      
      if (ronMcdonaldLead && ryanMadden) {
        toast({
          title: "Found Both",
          description: `Found Ryan Madden and Ron Mcdonald lead (Status: ${ronMcdonaldLead.status})`,
        });
      } else if (ronMcdonaldLead) {
        toast({
          title: "Lead Found",
          description: `Found Ron Mcdonald lead but not Ryan Madden`,
        });
      } else if (ryanMadden) {
        toast({
          title: "Closer Found", 
          description: `Found Ryan Madden but not Ron Mcdonald lead`,
        });
      } else {
        toast({
          title: "Nothing Found",
          description: "Neither Ryan Madden nor Ron Mcdonald lead were found",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast({
        title: "Error",
        description: "Failed to search for data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignOnly = async () => {
    if (!searchResult.lead || !searchResult.closer) return;
    
    setLoading(true);
    try {
      const leadRef = doc(db, "leads", searchResult.lead.id);
      
      // Update the lead to remove assignment
      await updateDoc(leadRef, {
        status: "waiting_assignment",
        assignedCloserId: null,
        assignedCloserName: null,
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: "Lead Unassigned",
        description: `Ron Mcdonald lead unassigned from Ryan Madden`,
      });
      
      setOperationComplete(true);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("Error unassigning lead:", error);
      toast({
        title: "Error",
        description: "Failed to unassign the lead",
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
      const leadRef = doc(db, "leads", searchResult.lead.id);
      
      // Delete the lead document completely
      await deleteDoc(leadRef);
      
      toast({
        title: "Lead Deleted",
        description: `Ron Mcdonald lead completely removed from database`,
      });
      
      setOperationComplete(true);
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

  const handleOperationConfirm = () => {
    if (operation === "unassign") {
      handleUnassignOnly();
    } else {
      handleDeleteLead();
    }
  };

  if (!isManager) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-2" />
          <h3 className="font-bold text-lg">Manager Access Only</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You need manager permissions to use this tool.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Ryan Madden / Ron Mcdonald Cleanup</CardTitle>
        </CardHeader>
        <CardContent>
          {operationComplete ? (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-900 text-center">
              <p className="font-medium text-green-800 dark:text-green-300">Operation completed successfully!</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                {operation === "unassign" 
                  ? "Ryan Madden has been unassigned from the Ron Mcdonald lead"
                  : "The Ron Mcdonald lead has been completely removed"
                }
              </p>
            </div>
          ) : searchResult.lead || searchResult.closer ? (
            <div className="space-y-4">
              {searchResult.closer && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-900">
                  <p className="font-medium text-blue-800 dark:text-blue-400">
                    ✓ Found Ryan Madden
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">
                    Status: <span className="font-medium">{searchResult.closer.status}</span>
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-500">
                    ID: <span className="font-mono text-xs">{searchResult.closer.id}</span>
                  </p>
                </div>
              )}
              
              {searchResult.lead && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md border border-amber-200 dark:border-amber-900">
                  <p className="font-medium text-amber-800 dark:text-amber-400">
                    ✓ Found Ron Mcdonald Lead
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                    Status: <span className="font-medium">{searchResult.lead.status.replace("_", " ")}</span>
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-500">
                    Assigned to: <span className="font-medium">{searchResult.lead.assignedCloserName || "None"}</span>
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-500">
                    Lead ID: <span className="font-mono text-xs">{searchResult.lead.id}</span>
                  </p>
                </div>
              )}
              
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setOperation("unassign");
                    setShowConfirmDialog(true);
                  }}
                  disabled={!searchResult.lead}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unassign Only (Keep Lead)
                </Button>
                
                <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setOperation("delete");
                    setShowConfirmDialog(true);
                  }}
                  disabled={!searchResult.lead}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Lead Completely
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              Click the button below to search for Ryan Madden and the Ron Mcdonald lead.
            </p>
          )}
        </CardContent>
        <CardFooter>
          {!operationComplete && !searchResult.lead && !searchResult.closer && (
            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search for Ryan & Ron Mcdonald"
              )}
            </Button>
          )}
          
          {(searchResult.lead || searchResult.closer) && !operationComplete && (
            <Button 
              onClick={handleSearch} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Refresh Search
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {operation === "unassign" ? "Unassign Lead?" : "Delete Lead Completely?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {operation === "unassign" 
                ? "This will unassign Ryan Madden from the Ron Mcdonald lead, setting the lead status to 'waiting_assignment'. The lead will remain in the system."
                : "This action cannot be undone. This will permanently delete the Ron Mcdonald lead from the database."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={operation === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={handleOperationConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {operation === "unassign" ? "Unassigning..." : "Deleting..."}
                </>
              ) : (
                operation === "unassign" ? "Yes, Unassign" : "Yes, Delete Lead"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash, Search, Loader2 } from "lucide-react";

export default function QuickLeadCleanup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    leadId?: string;
    leadData?: any;
  }>({ found: false });
  const [deleted, setDeleted] = useState(false);

  const isManager = user?.role === "manager" || user?.role === "admin";

  if (!isManager) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Access denied. Manager or Admin role required.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSearch = async () => {
    setLoading(true);
    try {
      console.log("🔍 Searching for Ron Mcdonald lead...");
      
      // Search for the Ron Mcdonald lead
      const leadsQuery = query(
        collection(db, "leads"),
        where("customerName", "==", "Ron Mcdonald")
      );
      const leadSnapshot = await getDocs(leadsQuery);
      
      if (!leadSnapshot.empty) {
        const leadDoc = leadSnapshot.docs[0];
        const leadData = leadDoc.data();
        
        setSearchResult({
          found: true,
          leadId: leadDoc.id,
          leadData: leadData
        });
        
        console.log("✅ Found Ron Mcdonald lead:", {
          id: leadDoc.id,
          status: leadData.status,
          assignedTo: leadData.assignedCloserName
        });
        
        toast({
          title: "Lead Found",
          description: `Found Ron Mcdonald lead (Status: ${leadData.status}, Assigned: ${leadData.assignedCloserName || 'None'})`,
        });
      } else {
        setSearchResult({ found: false });
        toast({
          title: "No Lead Found",
          description: "No Ron Mcdonald lead found in the database",
        });
      }
    } catch (error) {
      console.error("❌ Search error:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for the lead",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!searchResult.leadId) return;
    
    setLoading(true);
    try {
      console.log("🗑️ Deleting lead:", searchResult.leadId);
      
      // Delete the lead document
      const leadRef = doc(db, "leads", searchResult.leadId);
      await deleteDoc(leadRef);
      
      console.log("✅ Successfully deleted Ron Mcdonald lead!");
      
      setDeleted(true);
      toast({
        title: "Lead Deleted",
        description: "Ron Mcdonald lead has been completely removed from the database",
      });
    } catch (error) {
      console.error("❌ Delete error:", error);
      toast({
        title: "Delete Error",
        description: "Failed to delete the lead",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (deleted) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">✅ Lead Deleted Successfully</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-900">
            <p className="font-medium text-green-800 dark:text-green-300">
              The Ron Mcdonald lead has been completely removed!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              Ryan Madden should now only appear in the Closer Lineup section.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Quick Lead Cleanup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!searchResult.found ? (
          <>
            <p className="text-center text-muted-foreground mb-4">
              Search for and remove the Ron Mcdonald lead
            </p>
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
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search for Ron Mcdonald Lead
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-900">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Lead Found:</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Customer:</strong> {searchResult.leadData?.customerName}<br/>
                <strong>Status:</strong> {searchResult.leadData?.status}<br/>
                <strong>Assigned To:</strong> {searchResult.leadData?.assignedCloserName || 'None'}<br/>
                <strong>ID:</strong> {searchResult.leadId}
              </p>
            </div>
            
            <Button 
              onClick={handleDelete} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Lead Permanently
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              This action cannot be undone. The lead will be completely removed from the database.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

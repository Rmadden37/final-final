"use client";

import {useState, useEffect} from "react";
import type {Lead, Closer, LeadStatus} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db, acceptJobFunction} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, serverTimestamp, getDoc} from "firebase/firestore";
import LeadCard from "./lead-card";
import CloserCard from "./closer-card";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import { Activity, Loader2, Ghost } from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";

// Special visibility permissions configuration
// This allows certain closers to see other closers' leads
const SPECIAL_VISIBILITY_PERMISSIONS: Record<string, string[]> = {
  // Add specific user UIDs and the closer UIDs they can see leads for
  // This will be populated based on the actual UIDs from the database
};

// Helper function to check if a user has special lead visibility permissions
function checkSpecialLeadVisibilityPermissions(userUid: string): boolean {
  return userUid in SPECIAL_VISIBILITY_PERMISSIONS;
}

// Helper function to get the list of closer IDs that a user can see leads for
function getAllowedCloserIds(userUid: string): string[] {
  return SPECIAL_VISIBILITY_PERMISSIONS[userUid] || [];
}

// Helper function to add special permissions (can be called from debug tools)
function addSpecialVisibilityPermission(supervisorUid: string, targetCloserUid: string) {
  if (!SPECIAL_VISIBILITY_PERMISSIONS[supervisorUid]) {
    SPECIAL_VISIBILITY_PERMISSIONS[supervisorUid] = [];
  }
  if (!SPECIAL_VISIBILITY_PERMISSIONS[supervisorUid].includes(targetCloserUid)) {
    SPECIAL_VISIBILITY_PERMISSIONS[supervisorUid].push(targetCloserUid);
  }
  console.log(`Added special permission: ${supervisorUid} can now see leads for ${targetCloserUid}`);
}

// Make the function available globally for debugging
interface WindowWithDebugFunctions extends Window {
  addSpecialVisibilityPermission?: typeof addSpecialVisibilityPermission;
}

if (typeof window !== 'undefined') {
  (window as WindowWithDebugFunctions).addSpecialVisibilityPermission = addSpecialVisibilityPermission;
}

interface InProcessDisplayItem {
  lead: Lead;
  closer?: Closer;
}

export default function InProcessLeads() {
  const {user} = useAuth();
  const {toast} = useToast();
  const [displayItems, setDisplayItems] = useState<InProcessDisplayItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingClosers, setLoadingClosers] = useState(true);
  const [allTeamClosers, setAllTeamClosers] = useState<Closer[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [_isDispositionModalOpen, setIsDispositionModalOpen] = useState(false);

  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingClosers(false);
      setAllTeamClosers([]);
      return;
    }
    setLoadingClosers(true);
    const closersQuery = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId)
    );
    const unsubscribeClosers = onSnapshot(closersQuery, (snapshot) => {
      const closersData = snapshot.docs.map((doc) => ({uid: doc.id, ...doc.data()} as Closer));
      console.log("Team closers loaded:", closersData.length, "closers");
      closersData.forEach(closer => {
        console.log("Closer:", { uid: closer.uid, name: closer.name, teamId: closer.teamId });
      });
      setAllTeamClosers(closersData);
      setLoadingClosers(false);
    }, (error) => {
      console.error("Error loading team closers:", error);
      toast({
        title: "Error",
        description: `Failed to load team closers: ${error.message || 'Unknown error'}. Please refresh the page.`,
        variant: "destructive",
      });
      setLoadingClosers(false);
    });
    return () => unsubscribeClosers();
  }, [user, toast]);

  useEffect(() => {
    if (!user || !user.teamId || loadingClosers) {
      if (!user || !user.teamId) setLoadingLeads(false);
      if (loadingClosers) setDisplayItems([]);
      return;
    }
    setLoadingLeads(true);

    // Use the simplest possible query to avoid index issues
    const q = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      orderBy("createdAt", "desc"),
      limit(100) // Get more results to filter from
    );

    const unsubscribeLeads = onSnapshot(q, (querySnapshot) => {
      console.log("Raw leads query results:", querySnapshot.docs.length, "documents");
      console.log("Current user:", { uid: user.uid, role: user.role, teamId: user.teamId });
      
      // Log all leads for debugging
      querySnapshot.docs.forEach(doc => {
        const lead = doc.data() as Lead;
        console.log("Lead found:", {
          id: doc.id,
          customerName: lead.customerName,
          assignedCloserId: lead.assignedCloserId,
          status: lead.status,
          teamId: lead.teamId
        });
      });
      
      // Filter all results in memory based on user role and requirements
      let filteredDocs = querySnapshot.docs.filter(doc => {
        const lead = doc.data() as Lead;
        
        if (user.role === "closer") {
          // Check if this user has special permissions to see other users' leads
          const hasSpecialPermissions = checkSpecialLeadVisibilityPermissions(user.uid);
          
          if (hasSpecialPermissions) {
            // Users with special permissions can see leads assigned to specific other users
            const allowedCloserIds = getAllowedCloserIds(user.uid);
            const canSeeThisLead = (lead.assignedCloserId === user.uid || 
                                   allowedCloserIds.includes(lead.assignedCloserId || "")) &&
                                  ["waiting_assignment", "accepted", "in_process"].includes(lead.status);
            console.log(`Special permissions filter for lead ${doc.id}:`, { 
              assignedCloserId: lead.assignedCloserId, 
              userUid: user.uid, 
              status: lead.status, 
              allowedCloserIds,
              canSeeThisLead 
            });
            return canSeeThisLead;
          } else {
            // For regular closers, only show leads assigned to them with specific statuses
            const isMatch = lead.assignedCloserId === user.uid && 
                   ["waiting_assignment", "accepted", "in_process"].includes(lead.status);
            console.log(`Closer filter for lead ${doc.id}:`, { 
              assignedCloserId: lead.assignedCloserId, 
              userUid: user.uid, 
              status: lead.status, 
              isMatch 
            });
            return isMatch;
          }
        } else if (user.role === "setter") {
          // For setters, show ALL "in_process" leads for their team (regardless of assignment)
          // This ensures setters can see all leads that are actively being worked on by any closer in their team
          const isMatch = lead.status === "in_process";
          console.log(`Setter filter for lead ${doc.id}:`, { 
            assignedCloserId: lead.assignedCloserId, 
            status: lead.status, 
            setterId: lead.setterId,
            userUid: user.uid,
            isMatch 
          });
          return isMatch;
        } else if (user.role === "manager" || user.role === "admin") {
          // For managers/admins, only show leads that have an assigned closer and are in active statuses
          const isMatch = lead.assignedCloserId && 
                 ["waiting_assignment", "accepted", "in_process"].includes(lead.status);
          console.log(`Manager filter for lead ${doc.id}:`, { 
            assignedCloserId: lead.assignedCloserId, 
            status: lead.status, 
            isMatch 
          });
          return isMatch;
        }
        
        return false;
      });
      
      // Limit results after filtering
      const maxResults = (user.role === "manager" || user.role === "admin") ? 20 : 
                         (user.role === "setter") ? 15 : 10;
      filteredDocs = filteredDocs.slice(0, maxResults);
      
      console.log("Filtered leads:", filteredDocs.length, "matches");
      
      const newDisplayItems = filteredDocs.map((doc) => {
        const lead = {id: doc.id, ...doc.data()} as Lead;
        const assignedCloser = allTeamClosers.find((c) => c.uid === lead.assignedCloserId);
        console.log(`Lead ${doc.id} assigned closer:`, assignedCloser ? { uid: assignedCloser.uid, name: assignedCloser.name } : "not found");
        return {lead, closer: assignedCloser};
      });
      
      console.log("Final display items:", newDisplayItems.length);
      setDisplayItems(newDisplayItems);
      setLoadingLeads(false);
    }, (error) => {
      console.error("Error loading in-process leads:", error);
      toast({
        title: "Error",
        description: `Failed to load in-process leads: ${error.message || 'Unknown error'}. Please refresh the page.`,
        variant: "destructive",
      });
      setDisplayItems([]);
      setLoadingLeads(false);
    });

    return () => unsubscribeLeads();
  }, [user, allTeamClosers, loadingClosers, toast]);

  // Effect to set up special visibility permissions for specific users
  useEffect(() => {
    if (!user?.teamId || allTeamClosers.length === 0) return;
    
    // Look for Richard Niger and Marcelo Guerra in the team closers
    const richardNiger = allTeamClosers.find(closer => 
      closer.name.toLowerCase().includes('richard') && closer.name.toLowerCase().includes('niger')
    );
    const marceloGuerra = allTeamClosers.find(closer => 
      closer.name.toLowerCase().includes('marcelo') && closer.name.toLowerCase().includes('guerra')
    );
    
    // Set up permissions for Marcelo Guerra to see Richard Niger's leads
    if (richardNiger && marceloGuerra) {
      console.log("Setting up special visibility permissions:", {
        marceloUid: marceloGuerra.uid,
        richardUid: richardNiger.uid
      });
      
      // Clear any existing permissions for Marcelo and set up new ones
      SPECIAL_VISIBILITY_PERMISSIONS[marceloGuerra.uid] = [richardNiger.uid];
      
      console.log("Special permissions configured:", SPECIAL_VISIBILITY_PERMISSIONS);
    } else {
      console.log("Richard Niger or Marcelo Guerra not found in team closers:", {
        richardFound: !!richardNiger,
        marceloFound: !!marceloGuerra,
        allClosers: allTeamClosers.map(c => c.name)
      });
    }
  }, [user?.teamId, allTeamClosers]);

  if (user?.role === "setter") {
    // Allow setters to view ALL in-process leads for their team
    // This gives them visibility into which leads are actively being worked on
  }

  const isLoading = loadingLeads || loadingClosers;

  // Debug information for special permissions
  const hasSpecialPermissions = user?.role === "closer" && checkSpecialLeadVisibilityPermissions(user.uid);
  const _allowedCloserIds = hasSpecialPermissions ? getAllowedCloserIds(user.uid) : [];

  // Function to handle lead click with access control and job acceptance
  const handleLeadClick = async (lead: Lead) => {
    console.log('🔥 InProcessLeads - Lead clicked:', { 
      leadId: lead.id, 
      customerName: lead.customerName,
      leadStatus: lead.status,
      assignedCloserId: lead.assignedCloserId,
      userRole: user?.role,
      userUid: user?.uid 
    });

    // Access control: managers can see all leads, closers can see their own assigned leads or leads they have special permissions for
    const hasSpecialPermissions = user?.role === "closer" && checkSpecialLeadVisibilityPermissions(user.uid);
    const canAccessLead = user?.role === "manager" || user?.role === "admin" || 
                         (user?.role === "closer" && user.uid === lead.assignedCloserId) ||
                         (hasSpecialPermissions && getAllowedCloserIds(user.uid).includes(lead.assignedCloserId || ""));
    
    if (canAccessLead) {
      
      // If the closer is clicking on their own lead that hasn't been accepted yet, trigger acceptance
      if (user?.role === "closer" && 
          user.uid === lead.assignedCloserId && 
          (lead.status === "waiting_assignment" || lead.status === "scheduled") && 
          !lead.acceptedAt) {
        
        try {
          const result = await acceptJobFunction({ leadId: lead.id });
          const data = result.data as { success: boolean; alreadyAccepted?: boolean };
          
          if (data.success && !data.alreadyAccepted) {
            toast({
              title: "Job Accepted",
              description: `You have accepted the job for ${lead.customerName}. The setter has been notified.`,
            });
          }
        } catch (error) {
          console.error("Error accepting job:", error);
          toast({
            title: "Acceptance Failed",
            description: "Failed to accept the job. Please try again.",
            variant: "destructive",
          });
          return; // Don't open the modal if acceptance failed
        }
      }
      
      // Open the lead details modal
      setSelectedLead(lead);
      setIsModalOpen(true);
    } else {
      toast({
        title: "Access Denied",
        description: "You can only view details for leads assigned to you.",
        variant: "destructive",
      });
    }
  };

  const _handleDispositionClick = (lead: Lead) => {
    // Allow closers to disposition leads that are accepted or in process
    if (user?.role === "closer" && (lead.status === "in_process" || lead.status === "accepted")) {
      setSelectedLead(lead);
      setIsDispositionModalOpen(true);
    } else {
      toast({
        title: "Access Denied",
        description: "You can only disposition leads that are accepted or in process.",
        variant: "destructive",
      });
    }
  };

  const handleDispositionChange = async (leadId: string, newStatus: LeadStatus) => {
    console.log('🔥 InProcessLeads - Disposition change triggered:', { 
      leadId, 
      newStatus, 
      userRole: user?.role,
      userUid: user?.uid 
    });

    if (!user || (user.role !== "closer" && user.role !== "manager" && user.role !== "admin")) {
      toast({
        title: "Access Denied",
        description: "Only closers and managers can update lead disposition.",
        variant: "destructive",
      });
      return;
    }

    try {
      const leadRef = doc(db, "leads", leadId);
      
      // Get current lead data to check status
      const leadSnap = await getDoc(leadRef);
      if (!leadSnap.exists()) {
        throw new Error("Lead not found");
      }
      
      const currentLead = leadSnap.data();
      
      // For managers/admins dispositioning leads that skip workflow steps, handle transitions properly
      if ((user.role === "manager" || user.role === "admin") && 
          (currentLead.status === "waiting_assignment" || currentLead.status === "scheduled" || currentLead.status === "accepted") && 
          ["sold", "no_sale", "canceled", "rescheduled", "credit_fail"].includes(newStatus)) {
        
        // Managers/admins can disposition directly from any status - first transition to in_process if needed
        if (currentLead.status !== "in_process") {
          await updateDoc(leadRef, {
            status: "in_process",
            updatedAt: serverTimestamp(),
          });
          
          // Small delay to ensure the status update is processed
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Handle closers dispositioning from accepted status
      else if (user.role === "closer" && 
               currentLead.status === "accepted" && 
               ["sold", "no_sale", "canceled", "rescheduled", "credit_fail"].includes(newStatus)) {
        
        // First update to in_process
        await updateDoc(leadRef, {
          status: "in_process",
          updatedAt: serverTimestamp(),
        });
        
        // Small delay to ensure the status update is processed
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Update to the final status  
      const updateData: { [key: string]: string | null | ReturnType<typeof serverTimestamp> } = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        dispositionUpdatedBy: user.uid,
        dispositionUpdatedAt: serverTimestamp(),
      };

      // If manager/admin is setting status to waiting_assignment (reassigning), clear the assignment
      if ((user.role === "manager" || user.role === "admin") && newStatus === "waiting_assignment") {
        updateData.assignedCloserId = null;
        updateData.assignedCloserName = null;
      }

      await updateDoc(leadRef, updateData);

      toast({
        title: "Disposition Updated",
        description: `Lead status updated to ${newStatus.replace("_", " ")}.`,
      });
    } catch (error) {
      console.error("Error updating lead disposition:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update lead disposition. Please try again.",
        variant: "destructive",
      });
    }
  };

  const _handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition-all duration-200 border-0 ring-1 ring-slate-200 dark:ring-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
        <CardTitle className="text-xl sm:text-2xl font-bold font-headline flex items-center text-slate-900 dark:text-slate-100 premium:text-premium-purple premium:text-glow">
          <Activity className="h-6 w-6 mr-3 text-green-500 animate-pulse premium:icon-glow-teal" />
          <div className="flex flex-col">
            <span>In Process Leads</span>
            <span className="text-sm font-normal text-muted-foreground premium:text-premium-teal">Active customer interactions</span>
          </div>
        </CardTitle>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden px-6 pb-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading leads...</p>
            </div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-12">
            <div className="flex items-center justify-center mb-4" style={{blockSize: 64}}>
              <Ghost className="h-12 w-12 text-white stroke-2" fill="none" stroke="currentColor" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">All Quiet</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              No leads are currently being processed. New leads will appear here when closers start working on them.
            </p>
          </div>
        ) : (
          <div className="h-80">
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-2">
                {displayItems.map(({lead, closer}, index) => {
                  // Show disposition dropdown logic:
                  // - Managers/Admins: ALL leads (waiting_assignment, scheduled, accepted, in_process)
                  // - Closers: only accepted or in_process leads (must follow proper workflow)
                  const showDropdown = (user?.role === "manager" || user?.role === "admin") ? true :
                    (user?.role === "closer" && (lead.status === "in_process" || lead.status === "accepted"));
                  
                  return (
                    <div key={lead.id}>
                      {closer && (
                        <CloserCard
                          closer={closer}
                          assignedLeadName={lead.customerName}
                          allowInteractiveToggle={false}
                          onLeadClick={() => handleLeadClick(lead)}
                          onDispositionChange={(status) => handleDispositionChange(lead.id, status)}
                          showDispositionSelector={showDropdown}
                          currentLeadStatus={lead.status}
                          leadId={lead.id}
                          position={index + 1}
                        />
                      )}
                      {/* Lead details removed for privacy - only show to authorized users */}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      
      {/* Modal for lead details */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="mt-4">
              <LeadCard lead={selectedLead} context="in-process" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

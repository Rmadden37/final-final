// src/components/dashboard/in-process-leads.tsx
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

  // Load team closers
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

  // Load leads with filtering logic
  useEffect(() => {
    if (!user || !user.teamId || loadingClosers) {
      if (!user || !user.teamId) setLoadingLeads(false);
      if (loadingClosers) setDisplayItems([]);
      return;
    }
    setLoadingLeads(true);

    const q = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribeLeads = onSnapshot(q, (querySnapshot) => {
      let filteredDocs = querySnapshot.docs.filter(doc => {
        const lead = doc.data() as Lead;
        
        if (user.role === "closer") {
          const canSeeThisLead = (lead.assignedCloserId === user.uid) &&
                                ["waiting_assignment", "accepted", "in_process"].includes(lead.status);
          return canSeeThisLead;
        } else if (user.role === "setter") {
          const isMatch = lead.status === "in_process";
          return isMatch;
        } else if (user.role === "manager" || user.role === "admin") {
          const isMatch = lead.assignedCloserId && 
                 ["waiting_assignment", "accepted", "in_process"].includes(lead.status);
          return isMatch;
        }
        
        return false;
      });
      
      const maxResults = (user.role === "manager" || user.role === "admin") ? 20 : 
                         (user.role === "setter") ? 15 : 10;
      filteredDocs = filteredDocs.slice(0, maxResults);
      
      const newDisplayItems = filteredDocs.map((doc) => {
        const lead = {id: doc.id, ...doc.data()} as Lead;
        const assignedCloser = allTeamClosers.find((c) => c.uid === lead.assignedCloserId);
        return {lead, closer: assignedCloser};
      });
      
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

  const isLoading = loadingLeads || loadingClosers;

  const handleLeadClick = async (lead: Lead) => {
    const canAccessLead = user?.role === "manager" || user?.role === "admin" || 
                         (user?.role === "closer" && user.uid === lead.assignedCloserId);
    
    if (canAccessLead) {
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
          return;
        }
      }
      
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

  const handleDispositionChange = async (leadId: string, newStatus: LeadStatus) => {
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
      const leadSnap = await getDoc(leadRef);
      if (!leadSnap.exists()) {
        throw new Error("Lead not found");
      }
      
      const currentLead = leadSnap.data();
      
      if ((user.role === "manager" || user.role === "admin") && 
          (currentLead.status === "waiting_assignment" || currentLead.status === "scheduled" || currentLead.status === "accepted") && 
          ["sold", "no_sale", "canceled", "rescheduled", "credit_fail"].includes(newStatus)) {
        
        if (currentLead.status !== "in_process") {
          await updateDoc(leadRef, {
            status: "in_process",
            updatedAt: serverTimestamp(),
          });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      else if (user.role === "closer" && 
               currentLead.status === "accepted" && 
               ["sold", "no_sale", "canceled", "rescheduled", "credit_fail"].includes(newStatus)) {
        
        await updateDoc(leadRef, {
          status: "in_process",
          updatedAt: serverTimestamp(),
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const updateData: { [key: string]: string | null | ReturnType<typeof serverTimestamp> } = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        dispositionUpdatedBy: user.uid,
        dispositionUpdatedAt: serverTimestamp(),
      };

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

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition-all duration-200 border-0 ring-1 ring-slate-200 dark:ring-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4 shrink-0">
        <CardTitle className="text-lg sm:text-xl font-bold font-headline flex items-center text-slate-900 dark:text-slate-100 premium:text-premium-purple premium:text-glow">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500 animate-pulse premium:icon-glow-teal" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base leading-tight">In Process Leads</span>
            <span className="text-xs font-normal text-muted-foreground premium:text-premium-teal truncate">Active customer interactions</span>
          </div>
        </CardTitle>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden px-4 pb-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading leads...</p>
            </div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <div className="flex items-center justify-center mb-4" style={{blockSize: 48}}>
              <Ghost className="h-8 w-8 sm:h-12 sm:w-12 text-white stroke-2" fill="none" stroke="currentColor" strokeWidth={2} />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">All Quiet</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              No leads are currently being processed. New leads will appear here when closers start working on them.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-2">
                {displayItems.map(({lead, closer}, index) => {
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
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      
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
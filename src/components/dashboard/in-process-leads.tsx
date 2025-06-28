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
import { Activity, Loader2, Zap, UserCheck } from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Badge} from "@/components/ui/badge";

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
          (lead.status === "waiting_assignment" || lead.status === "scheduled")) {
        
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

  // Group display items by status
  const groupedItems = displayItems.reduce((acc, item) => {
    const status = item.lead.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(item);
    return acc;
  }, {} as Record<string, InProcessDisplayItem[]>);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "waiting_assignment":
        return { label: "Pending Assignment", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400", icon: Activity };
      case "accepted":
        return { label: "Accepted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400", icon: UserCheck };
      case "in_process":
        return { label: "In Progress", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400", icon: Zap };
      default:
        return { label: status.replace("_", " "), color: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400", icon: Activity };
    }
  };

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
      <CardHeader className="shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-b border-green-100 dark:border-green-900">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Active Leads</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Currently being processed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                <span className="text-sm text-slate-600">Loading...</span>
              </div>
            ) : (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                {displayItems.length} Active
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden p-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Loading active leads...</p>
                <p className="text-xs text-slate-500">Fetching current assignments</p>
              </div>
            </div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-12 px-6">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 rounded-full mb-4">
              <Activity className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">All Quiet</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
              No leads are currently being processed. New assignments will appear here when closers start working on them.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Ready for new assignments</span>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {Object.entries(groupedItems).map(([status, items]) => {
                const statusInfo = getStatusInfo(status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={status} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <StatusIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {statusInfo.label}
                      </h4>
                      <Badge variant="secondary" className={`text-xs ${statusInfo.color}`}>
                        {items.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {items.map(({lead, closer}, index) => {
                        const showDropdown = (user?.role === "manager" || user?.role === "admin") ? true :
                          (user?.role === "closer" && (lead.status === "in_process" || lead.status === "accepted"));
                        
                        return (
                          <div key={lead.id} className="relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-green-600 rounded-r-full"></div>
                            <div className="ml-3">
                              {closer && (
                                <CloserCard
                                  closer={closer}
                                  assignedLeadName={lead.customerName}
                                  allowInteractiveToggle={false}
                                  position={index + 1}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
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
// src/components/dashboard/lead-queue.tsx
"use client";

import {useState, useEffect} from "react";
import type {Lead, Closer, LeadStatus} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, Timestamp as FirestoreTimestamp, doc, serverTimestamp, writeBatch} from "firebase/firestore";
import LeadCard from "./lead-card";
import ScheduledLeadsCalendar from "./scheduled-leads-calendar";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {ListChecks, CalendarClock, Loader2, Zap, Clock} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useToast} from "@/hooks/use-toast";
import {Badge} from "@/components/ui/badge";

const FORTY_FIVE_MINUTES_MS = 45 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Helper functions (inline to avoid import issues)
function parseDateString(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") return null;
  
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;

  const recognizedFormatMatch = dateString.match(/(\w+\s\d{1,2},\s\d{4})\s(?:at)\s(\d{1,2}:\d{2}:\d{2}\s[AP]M)/i);
  if (recognizedFormatMatch) {
    const datePart = recognizedFormatMatch[1];
    const timePart = recognizedFormatMatch[2];
    date = new Date(`${datePart} ${timePart}`);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

function parseTimestamp(value: any): FirestoreTimestamp | null {
  if (!value) return null;
  
  if (value instanceof FirestoreTimestamp) {
    return value;
  }
  
  if (typeof value === 'string') {
    const date = parseDateString(value);
    if (date) {
      return FirestoreTimestamp.fromDate(date);
    }
  }
  
  if (value instanceof Date) {
    return FirestoreTimestamp.fromDate(value);
  }
  
  // Handle objects with seconds and nanoseconds (Firestore format)
  if (typeof value === 'object' && value !== null) {
    if ('seconds' in value && typeof value.seconds === 'number') {
      return new FirestoreTimestamp(value.seconds, value.nanoseconds || 0);
    }
    
    if ('toDate' in value && typeof value.toDate === 'function') {
      return value as FirestoreTimestamp;
    }
  }
  
  return null;
}

function getTimestampMillis(timestamp: FirestoreTimestamp | null | undefined): number {
  if (!timestamp) return 0;
  
  try {
    if (typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }
  } catch (error) {
    console.warn('Error getting timestamp millis:', error);
  }
  
  return 0;
}

export default function LeadQueue() {
  const {user} = useAuth();
  const {toast} = useToast();
  const [waitingLeads, setWaitingLeads] = useState<Lead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [processedScheduledLeadIds, setProcessedScheduledLeadIds] = useState<Set<string>>(new Set());
  const [availableClosers, setAvailableClosers] = useState<Closer[]>([]);
  const [loadingClosers, setLoadingClosers] = useState(true);
  const [assignedLeadCloserIds, setAssignedLeadCloserIds] = useState<Set<string>>(new Set());

  // Effect for fetching waiting_assignment leads
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingWaiting(false);
      setWaitingLeads([]);
      return;
    }
    setLoadingWaiting(true);

    const qWaiting = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "waiting_assignment"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeWaiting = onSnapshot(qWaiting, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Handle createdAt timestamp
        let createdAtTimestamp: FirestoreTimestamp | null = null;
        if (data.submissionTime) {
          createdAtTimestamp = parseTimestamp(data.submissionTime);
        } else if (data.createdAt) {
          createdAtTimestamp = parseTimestamp(data.createdAt);
        }

        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address,
          status: data.status as LeadStatus,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || data.assignedCloser || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: createdAtTimestamp,
          updatedAt: parseTimestamp(data.updatedAt) || null,
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: parseTimestamp(data.scheduledAppointmentTime) || parseTimestamp(data.scheduledTime) || null,
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          setterVerified: data.setterVerified || false,
          verifiedAt: parseTimestamp(data.verifiedAt) || null,
          verifiedBy: data.verifiedBy || null,
          photoUrls: data.photoUrls || [],
        } as Lead;
      });
      
      const unassignedLeads = leadsData.filter(lead => !lead.assignedCloserId);
      setWaitingLeads(unassignedLeads);
      setLoadingWaiting(false);
    }, (_error) => {
      toast({
        title: "Error",
        description: "Failed to load waiting leads. Please refresh the page.",
        variant: "destructive",
      });
      setLoadingWaiting(false);
    });

    return () => unsubscribeWaiting();
  }, [user, toast]);

  // Effect for fetching scheduled leads and processing them
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingScheduled(false);
      setScheduledLeads([]);
      return;
    }
    setLoadingScheduled(true);

    const qScheduled = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["rescheduled", "scheduled"]),
      orderBy("scheduledAppointmentTime", "asc")
    );

    const unsubscribeScheduled = onSnapshot(qScheduled, async (querySnapshot) => {
      const leadsData = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Handle createdAt timestamp
        let createdAtTimestamp: FirestoreTimestamp | null = null;
        if (data.submissionTime) {
          createdAtTimestamp = parseTimestamp(data.submissionTime);
        } else if (data.createdAt) {
          createdAtTimestamp = parseTimestamp(data.createdAt);
        }

        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address,
          status: data.status as LeadStatus,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || data.assignedCloser || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: createdAtTimestamp,
          updatedAt: parseTimestamp(data.updatedAt) || null,
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: parseTimestamp(data.scheduledAppointmentTime) || parseTimestamp(data.scheduledTime) || null,
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          photoUrls: data.photoUrls || [],
        } as Lead;
      });
      setScheduledLeads(leadsData);
      setLoadingScheduled(false);

      const now = new Date();
      const leadsToMoveBatch = writeBatch(db);
      const leadsToRemoveBatch = writeBatch(db);
      let leadsMovedCount = 0;
      let leadsRemovedCount = 0;

      querySnapshot.docs.forEach((docSnapshot) => {
        const lead = {id: docSnapshot.id, ...docSnapshot.data()} as Lead;
        const leadScheduledAppointmentTime = parseTimestamp(docSnapshot.data().scheduledAppointmentTime);

        if (leadScheduledAppointmentTime &&
            (lead.status === "rescheduled" || lead.status === "scheduled") &&
            !processedScheduledLeadIds.has(lead.id)) {
          const appointmentTime = leadScheduledAppointmentTime.toDate();
          const timeUntilAppointment = appointmentTime.getTime() - now.getTime();
          const timePastAppointment = now.getTime() - appointmentTime.getTime();

          if (timePastAppointment >= (10 * 60 * 1000) && !lead.setterVerified) {
            const leadRef = doc(db, "leads", lead.id);
            leadsToRemoveBatch.update(leadRef, {
              status: "canceled",
              dispositionNotes: "Automatically canceled - not verified within 10 minutes of scheduled time",
              updatedAt: serverTimestamp(),
            });
            setProcessedScheduledLeadIds((prev) => new Set(prev).add(lead.id));
            leadsRemovedCount++;
          }
          else if (timePastAppointment >= FIFTEEN_MINUTES_MS) {
            const leadRef = doc(db, "leads", lead.id);
            leadsToRemoveBatch.update(leadRef, {
              status: "expired",
              dispositionNotes: "Appointment expired - 15 minutes past scheduled time",
              updatedAt: serverTimestamp(),
            });
            setProcessedScheduledLeadIds((prev) => new Set(prev).add(lead.id));
            leadsRemovedCount++;
          }
          else if (timeUntilAppointment <= FORTY_FIVE_MINUTES_MS && lead.setterVerified === true) {
            const leadRef = doc(db, "leads", lead.id);
            leadsToMoveBatch.update(leadRef, {
              status: "waiting_assignment",
              updatedAt: serverTimestamp(),
            });
            setProcessedScheduledLeadIds((prev) => new Set(prev).add(lead.id));
            leadsMovedCount++;
          }
        }
      });

      if (leadsRemovedCount > 0) {
        try {
          await leadsToRemoveBatch.commit();
          toast({
            title: "Unverified Leads Removed",
            description: `${leadsRemovedCount} unverified lead(s) past their scheduled time were automatically canceled.`,
            variant: "destructive",
          });
        } catch (_error) {
          console.error("Error removing unverified leads:", _error);
          toast({
            title: "Removal Failed",
            description: "Could not remove unverified leads automatically.",
            variant: "destructive",
          });
        }
      }

      if (leadsMovedCount > 0) {
        try {
          await leadsToMoveBatch.commit();
          toast({
            title: "Verified Leads Updated",
            description: `${leadsMovedCount} verified lead(s) moved to waiting list for assignment.`,
          });
        } catch {
          toast({
            title: "Update Failed",
            description: "Could not move verified leads automatically.",
            variant: "destructive",
          });
          const failedLeadIds = querySnapshot.docs
            .filter((docSnapshot) => {
              const leadData = docSnapshot.data();
              const leadSchedTime = parseTimestamp(leadData.scheduledAppointmentTime);
              return leadSchedTime &&
                       (leadData.status === "rescheduled" || leadData.status === "scheduled") &&
                       (leadSchedTime.toDate().getTime() - now.getTime() <= FORTY_FIVE_MINUTES_MS) &&
                       leadData.setterVerified === true &&
                       processedScheduledLeadIds.has(docSnapshot.id);
            })
            .map((l) => l.id);

          setProcessedScheduledLeadIds((prev) => {
            const newSet = new Set(prev);
            failedLeadIds.forEach((id) => newSet.delete(id));
            return newSet;
          });
        }
      }
    }, (_error) => {
      toast({
        title: "Error",
        description: "Failed to load scheduled leads. Please refresh the page.",
        variant: "destructive",
      });
      setLoadingScheduled(false);
    });

    return () => unsubscribeScheduled();
  }, [user, toast, processedScheduledLeadIds]);

  // Effect for fetching available closers
  useEffect(() => {
    if (!user?.teamId) {
      setAssignedLeadCloserIds(new Set());
      setLoadingClosers(false);
      return;
    }

    setLoadingClosers(true);
    const leadsQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["waiting_assignment", "scheduled", "accepted", "in_process"])
    );

    const unsubscribeLeads = onSnapshot(
      leadsQuery,
      (querySnapshot) => {
        const assignedCloserIds = new Set<string>();
        querySnapshot.forEach((doc) => {
          const lead = doc.data() as Lead;
          if (lead.assignedCloserId) {
            assignedCloserIds.add(lead.assignedCloserId);
          }
        });
        setAssignedLeadCloserIds(assignedCloserIds);
      },
      (_error) => {
        console.error("Failed to load assigned closers for auto-assignment:", _error);
      }
    );
    return () => unsubscribeLeads();
  }, [user?.teamId]);

  useEffect(() => {
    if (!user?.teamId) {
      setAvailableClosers([]);
      setLoadingClosers(false);
      return;
    }

    const closersCollectionQuery = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      where("status", "==", "On Duty"),
      orderBy("name", "asc")
    );

    const unsubscribeClosers = onSnapshot(
      closersCollectionQuery,
      (querySnapshot) => {
        const allOnDutyClosers = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            name: data.name,
            status: data.status as "On Duty" | "Off Duty",
            teamId: data.teamId,
            role: data.role,
            avatarUrl: data.avatarUrl,
            phone: data.phone,
            lineupOrder: data.lineupOrder,
          } as Closer;
        });

        const filteredAvailableClosers = allOnDutyClosers.filter(
          (closer) => !assignedLeadCloserIds.has(closer.uid)
        );

        const sortedAvailableClosers = filteredAvailableClosers
          .map((closer, index) => ({
            ...closer,
            lineupOrder:
              typeof closer.lineupOrder === "number" ?
                closer.lineupOrder :
                (index + 1) * 100000,
          }))
          .sort((a, b) => {
            const orderA = a.lineupOrder ?? ((a.lineupOrder || 0) + 1) * 100000;
            const orderB = b.lineupOrder ?? ((b.lineupOrder || 0) + 1) * 100000;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
          });

        setAvailableClosers(sortedAvailableClosers);
        setLoadingClosers(false);
      },
      (_error) => {
        console.error("Failed to load available closers for auto-assignment:", _error);
        setAvailableClosers([]);
        setLoadingClosers(false);
      }
    );

    return () => unsubscribeClosers();
  }, [user?.teamId, assignedLeadCloserIds]);

  // Automatic assignment effect
  useEffect(() => {
    if (loadingWaiting || loadingClosers || !user?.teamId) return;
    if (waitingLeads.length === 0 || availableClosers.length === 0) return;

    const assignLeadsToClosers = async () => {
      try {
        const batch = writeBatch(db);
        let assignmentsCount = 0;

        const sortedWaitingLeads = [...waitingLeads]
          .filter(lead => !lead.assignedCloserId && lead.status === "waiting_assignment")
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt);
          });

        const assignmentsToMake = Math.min(sortedWaitingLeads.length, availableClosers.length);
        
        for (let i = 0; i < assignmentsToMake; i++) {
          const lead = sortedWaitingLeads[i];
          const closer = availableClosers[i];

          if (lead && closer) {
            const leadRef = doc(db, "leads", lead.id);
            batch.update(leadRef, {
              status: "waiting_assignment",
              assignedCloserId: closer.uid,
              assignedCloserName: closer.name,
              updatedAt: serverTimestamp(),
            });
            assignmentsCount++;
          }
        }

        if (assignmentsCount > 0) {
          await batch.commit();
          toast({
            title: "Leads Assigned",
            description: `${assignmentsCount} lead(s) automatically assigned to available closers.`,
          });
        }
      } catch (_error) {
        console.error("Failed to auto-assign leads:", _error);
        toast({
          title: "Assignment Failed",
          description: "Could not automatically assign leads to closers.",
          variant: "destructive",
        });
      }
    };

    const assignmentTimer = setTimeout(assignLeadsToClosers, 1000);
    return () => clearTimeout(assignmentTimer);
  }, [waitingLeads, availableClosers, loadingWaiting, loadingClosers, user?.teamId, toast]);

  const isLoading = loadingWaiting || loadingScheduled;

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
      <CardHeader className="shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-blue-100 dark:border-blue-900">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Lead Queues</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Manage waiting & scheduled leads</p>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-slate-600">Syncing...</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden p-0">
        <Tabs defaultValue="waiting" className="flex flex-col h-full">
          <div className="shrink-0 border-b border-slate-200 dark:border-slate-700">
            <TabsList className="w-full h-12 bg-transparent rounded-none p-0">
              <TabsTrigger 
                value="waiting" 
                className="flex-1 h-12 rounded-none border-r border-slate-200 dark:border-slate-700 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 dark:data-[state=active]:bg-blue-950/50 dark:data-[state=active]:text-blue-400"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Waiting Assignment</span>
                  <span className="sm:hidden">Waiting</span>
                  {waitingLeads.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
                      {waitingLeads.length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="scheduled" 
                className="flex-1 h-12 rounded-none data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-500 dark:data-[state=active]:bg-purple-950/50 dark:data-[state=active]:text-purple-400"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Scheduled</span>
                  <span className="sm:hidden">Sched</span>
                  {scheduledLeads.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400">
                      {scheduledLeads.length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="waiting" className="h-full mt-0 data-[state=inactive]:hidden">
              {loadingWaiting ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Loading waiting leads...</p>
                      <p className="text-xs text-slate-500">Fetching latest data</p>
                    </div>
                  </div>
                </div>
              ) : waitingLeads.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-12 px-6">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-full mb-4">
                    <ListChecks className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Queue is Empty</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
                    No leads are currently waiting for assignment. New leads will appear here automatically when they're ready to be processed.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>System is actively monitoring for new leads</span>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    {waitingLeads.map((lead, index) => (
                      <div key={lead.id} className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-red-600 rounded-r-full"></div>
                        <div className="ml-3">
                          <LeadCard lead={lead} context="queue-waiting" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="scheduled" className="h-full mt-0 data-[state=inactive]:hidden">
              <div className="h-full p-4">
                <ScheduledLeadsCalendar 
                  scheduledLeads={scheduledLeads} 
                  loading={loadingScheduled} 
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
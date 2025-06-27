// src/components/dashboard/lead-queue.tsx
"use client";

import {useState, useEffect} from "react";
import type {Lead, Closer} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, Timestamp as FirestoreTimestamp, doc, serverTimestamp, writeBatch} from "firebase/firestore";
import LeadCard from "./lead-card";
import ScheduledLeadsCalendar from "./scheduled-leads-calendar";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {ListChecks, CalendarClock, Loader2} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useToast} from "@/hooks/use-toast";

const FORTY_FIVE_MINUTES_MS = 45 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Helper function to attempt parsing various date string formats
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
        let createdAtTimestamp: FirestoreTimestamp | null = null;

        if (data.submissionTime) {
          if (data.submissionTime instanceof FirestoreTimestamp) {
            createdAtTimestamp = data.submissionTime;
          } else if (typeof data.submissionTime === "string") {
            const parsedDate = parseDateString(data.submissionTime);
            if (parsedDate) {
              createdAtTimestamp = FirestoreTimestamp.fromDate(parsedDate);
            }
          }
        } else if (data.createdAt instanceof FirestoreTimestamp) {
          createdAtTimestamp = data.createdAt;
        }

        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address,
          status: data.status,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || data.assignedCloser || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: createdAtTimestamp,
          updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt : serverTimestamp(),
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: data.scheduledAppointmentTime instanceof FirestoreTimestamp ? data.scheduledAppointmentTime : (data.scheduledTime instanceof FirestoreTimestamp ? data.scheduledTime : null),
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          setterVerified: data.setterVerified || false,
          verifiedAt: data.verifiedAt || null,
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
        let createdAtTimestamp: FirestoreTimestamp | null = null;
        if (data.submissionTime) {
          if (data.submissionTime instanceof FirestoreTimestamp) {
            createdAtTimestamp = data.submissionTime;
          } else if (typeof data.submissionTime === "string") {
            const parsedDate = parseDateString(data.submissionTime);
            if (parsedDate) {
              createdAtTimestamp = FirestoreTimestamp.fromDate(parsedDate);
            }
          }
        } else if (data.createdAt instanceof FirestoreTimestamp) {
          createdAtTimestamp = data.createdAt;
        }

        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address,
          status: data.status,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || data.assignedCloser || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: createdAtTimestamp,
          updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt : serverTimestamp(),
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: data.scheduledAppointmentTime instanceof FirestoreTimestamp ? data.scheduledAppointmentTime : (data.scheduledTime instanceof FirestoreTimestamp ? data.scheduledTime : null),
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
        const leadScheduledAppointmentTime = docSnapshot.data().scheduledAppointmentTime;

        if (leadScheduledAppointmentTime instanceof FirestoreTimestamp &&
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
              const leadSchedTime = leadData.scheduledAppointmentTime;
              return leadSchedTime instanceof FirestoreTimestamp &&
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
            return a.createdAt.toMillis() - b.createdAt.toMillis();
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

  return (
    <Card className="dashboard-card h-full flex flex-col bg-white/95 dark:bg-transparent premium:bg-transparent shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-0 premium:border-0 ring-1 ring-white/5 dark:ring-slate-800/20 dark:card-glass dark:glow-turquoise premium:card-glass premium:glow-premium">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6 bg-transparent shrink-0">
        <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold font-headline flex items-center text-slate-900 dark:text-slate-100 premium:text-glow">
          <div className="p-1.5 sm:p-2 bg-transparent rounded-lg mr-2 sm:mr-3 dark:glow-turquoise premium:glow-premium premium:icon-hover-glow transition-all duration-300">
            <ListChecks className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400 premium:text-premium-purple premium:nav-icon premium:icon-glow-purple transition-all duration-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base lg:text-xl">Lead Queues</span>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground premium:text-premium-teal">
              Waiting & scheduled leads
            </span>
          </div>
        </CardTitle>
        {(loadingWaiting || loadingScheduled) && <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground premium:text-premium-teal premium:nav-icon premium:icon-glow-teal" />}
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 bg-transparent">
        <Tabs defaultValue="waiting" className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 mb-2 sm:mb-4 h-9 sm:h-10 lg:h-11 bg-muted/30 dark:bg-muted/30 rounded-lg p-1 premium:border premium:border-premium-glow shrink-0">
            <TabsTrigger 
              value="waiting" 
              className="h-7 sm:h-8 lg:h-9 text-xs sm:text-sm lg:text-base font-medium rounded-md transition-all bg-transparent hover:bg-white/20 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white premium:data-[state=active]:bg-gradient-to-r premium:data-[state=active]:from-premium-purple/20 premium:data-[state=active]:to-premium-teal/10 premium:data-[state=active]:border premium:data-[state=active]:border-premium-glow premium:data-[state=active]:glow-premium"
            >
              <ListChecks className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 premium:nav-icon premium:icon-glow-purple transition-all duration-300" /> 
              <span className="hidden sm:inline">Waiting List</span>
              <span className="sm:hidden">Waiting</span>
            </TabsTrigger>
            <TabsTrigger 
              value="scheduled" 
              className="h-7 sm:h-8 lg:h-9 text-xs sm:text-sm lg:text-base font-medium rounded-md transition-all bg-transparent hover:bg-white/20 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white premium:data-[state=active]:bg-gradient-to-r premium:data-[state=active]:from-premium-teal/20 premium:data-[state=active]:to-premium-purple/10 premium:data-[state=active]:border premium:data-[state=active]:border-premium-glow premium:data-[state=active]:glow-premium"
            >
              <CalendarClock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 premium:nav-icon premium:icon-glow-teal transition-all duration-300" /> 
              <span className="hidden sm:inline">Scheduled</span>
              <span className="sm:hidden">Scheduled</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="waiting" className="h-full mt-0 data-[state=inactive]:hidden">
              {loadingWaiting ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mx-auto mb-3 premium:text-premium-purple premium:nav-icon premium:icon-glow-purple premium:icon-pulse" />
                    <p className="text-sm text-muted-foreground">Loading waiting leads...</p>
                  </div>
                </div>
              ) : waitingLeads.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-8">
                  <div className="p-3 bg-transparent rounded-full mb-3 premium:glow-premium transition-all duration-300">
                    <ListChecks className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground premium:text-premium-purple premium:nav-icon premium:icon-glow-purple" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 premium:text-glow">Queue Empty</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm max-w-xs">
                    No leads are currently waiting for assignment. New leads will appear here automatically.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-3 pr-2">
                    {waitingLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} context="queue-waiting" />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="scheduled" className="h-full mt-0 data-[state=inactive]:hidden">
              <ScheduledLeadsCalendar 
                scheduledLeads={scheduledLeads} 
                loading={loadingScheduled} 
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
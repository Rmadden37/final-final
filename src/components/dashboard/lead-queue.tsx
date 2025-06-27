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

  // ... (keeping all your existing useEffect hooks exactly as they are)
  
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

  // ... (rest of your useEffect hooks remain the same)

  return (
    <Card className="h-full flex flex-col bg-white/95 dark:bg-transparent premium:bg-transparent shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-0 premium:border-0 ring-1 ring-white/5 dark:ring-slate-800/20 dark:card-glass dark:glow-turquoise premium:card-glass premium:glow-premium">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4 bg-transparent shrink-0">
        <CardTitle className="text-lg sm:text-xl font-bold font-headline flex items-center text-slate-900 dark:text-slate-100 premium:text-glow">
          <div className="p-2 bg-transparent rounded-lg mr-2 dark:glow-turquoise premium:glow-premium premium:icon-hover-glow transition-all duration-300">
            <ListChecks className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 premium:text-premium-purple premium:nav-icon premium:icon-glow-purple transition-all duration-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base">Lead Queues</span>
            <span className="text-xs font-normal text-muted-foreground hidden sm:block">
              Waiting & scheduled leads
            </span>
          </div>
        </CardTitle>
        {(loadingWaiting || loadingScheduled) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground premium:text-premium-teal premium:nav-icon premium:icon-glow-teal" />}
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden px-3 sm:px-4 pb-3 sm:pb-4 bg-transparent">
        <Tabs defaultValue="waiting" className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 mb-3 h-9 bg-transparent rounded-lg p-1 premium:border premium:border-premium-glow shrink-0">
            <TabsTrigger value="waiting" className="h-7 text-xs sm:text-sm font-medium rounded-md transition-all bg-transparent data-[state=active]:bg-white/10 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700/20 premium:data-[state=active]:bg-gradient-to-r premium:data-[state=active]:from-premium-purple/20 premium:data-[state=active]:to-premium-teal/10 premium:data-[state=active]:border premium:data-[state=active]:border-premium-glow premium:data-[state=active]:glow-premium">
              <ListChecks className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 premium:nav-icon premium:icon-glow-purple transition-all duration-300" /> 
              <span className="hidden sm:inline">Waiting List</span>
              <span className="sm:hidden">Waiting</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="h-7 text-xs sm:text-sm font-medium rounded-md transition-all bg-transparent data-[state=active]:bg-white/10 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700/20 premium:data-[state=active]:bg-gradient-to-r premium:data-[state=active]:from-premium-teal/20 premium:data-[state=active]:to-premium-purple/10 premium:data-[state=active]:border premium:data-[state=active]:border-premium-glow premium:data-[state=active]:glow-premium">
              <CalendarClock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 premium:nav-icon premium:icon-glow-teal transition-all duration-300" /> 
              <span className="hidden sm:inline">Scheduled</span>
              <span className="sm:hidden">Scheduled</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="waiting" className="flex-grow overflow-hidden mt-0 data-[state=inactive]:hidden">
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
              <div className="h-full overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-3 pr-2">
                    {waitingLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} context="queue-waiting" />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="scheduled" className="flex-grow overflow-hidden mt-0 data-[state=inactive]:hidden">
            <div className="h-full overflow-hidden">
              <ScheduledLeadsCalendar 
                scheduledLeads={scheduledLeads} 
                loading={loadingScheduled} 
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
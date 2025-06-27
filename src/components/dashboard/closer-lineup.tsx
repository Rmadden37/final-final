// src/components/dashboard/closer-lineup.tsx
"use client";

import {useState, useEffect} from "react";
import type {Closer, UserRole, Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy} from "firebase/firestore";
import CloserCard from "./closer-card";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import { Users, Loader2, Activity } from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import ManageClosersModal from "./off-duty-closers-modal";

export default function CloserLineup() {
  const {user} = useAuth();
  const {toast} = useToast();
  const [closersInLineup, setClosersInLineup] = useState<Closer[]>([]);
  const [allOnDutyClosers, setAllOnDutyClosers] = useState<Closer[]>([]);
  const [isLoadingClosersForLineup, setIsLoadingClosersForLineup] = useState(true);
  const [assignedLeadCloserIds, setAssignedLeadCloserIds] = useState<Set<string>>(new Set());
  const [isLoadingAssignedCloserIds, setIsLoadingAssignedCloserIds] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const canManageClosers = user?.role === "manager" || user?.role === "admin";
  const isCloser = user?.role === "closer";

  // Effect 1: Fetch UIDs of closers assigned to ANY lead
  useEffect(() => {
    if (!user?.teamId) {
      setAssignedLeadCloserIds(new Set());
      setIsLoadingAssignedCloserIds(false);
      return;
    }

    setIsLoadingAssignedCloserIds(true);
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
        setIsLoadingAssignedCloserIds(false);
      },
      (_error) => {
        toast({
          title: "Error",
          description: "Failed to load assigned closers. Please refresh the page.",
          variant: "destructive",
        });
        setAssignedLeadCloserIds(new Set());
        setIsLoadingAssignedCloserIds(false);
      }
    );
    return () => unsubscribeLeads();
  }, [user?.teamId, toast]);

  // Effect 2: Fetch "On Duty" closers, then filter out those assigned to leads
  useEffect(() => {
    if (!user?.teamId) {
      setClosersInLineup([]);
      setAllOnDutyClosers([]);
      setIsLoadingClosersForLineup(false);
      return;
    }

    if (isLoadingAssignedCloserIds) {
      setClosersInLineup([]);
      setAllOnDutyClosers([]);
      setIsLoadingClosersForLineup(true);
      return;
    }

    setIsLoadingClosersForLineup(true);
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
            role: data.role as UserRole,
            avatarUrl: data.avatarUrl,
            phone: data.phone,
            lineupOrder: data.lineupOrder,
          } as Closer;
        });

        const availableClosers = allOnDutyClosers.filter(
          (closer) => !assignedLeadCloserIds.has(closer.uid)
        );

        const sortedAvailableClosers = availableClosers
          .map((closer, index) => ({
            ...closer,
            lineupOrder:
              typeof closer.lineupOrder === "number" ?
                closer.lineupOrder :
                (index + 1) * 100000,
          }))
          .sort((a, b) => {
            const orderA = a.lineupOrder || 999999;
            const orderB = b.lineupOrder || 999999;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
          });

        const sortedAllOnDutyClosers = allOnDutyClosers
          .map((closer, index) => ({
            ...closer,
            lineupOrder:
              typeof closer.lineupOrder === "number" ?
                closer.lineupOrder :
                (index + 1) * 100000,
          }))
          .sort((a, b) => {
            const orderA = a.lineupOrder || 999999;
            const orderB = b.lineupOrder || 999999;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
          });

        setClosersInLineup(sortedAvailableClosers);
        setAllOnDutyClosers(sortedAllOnDutyClosers);
        setIsLoadingClosersForLineup(false);
      },
      (_error) => {
        toast({
          title: "Error",
          description: "Failed to load closer lineup. Please refresh the page.",
          variant: "destructive",
        });
        setClosersInLineup([]);
        setAllOnDutyClosers([]);
        setIsLoadingClosersForLineup(false);
      }
    );

    return () => unsubscribeClosers();
  }, [user?.teamId, assignedLeadCloserIds, isLoadingAssignedCloserIds, toast]);

  const isOverallLoading = isLoadingAssignedCloserIds || isLoadingClosersForLineup;

  const handleCardClick = () => {
    if (canManageClosers) {
      setIsManageModalOpen(true);
    }
  };

  const getDisplayData = () => {
    if (!user || !user.role) {
      return {
        closers: [],
        emptyTitle: "Loading...",
        emptyDescription: "Please wait while we load your data.",
        titleSuffix: 'Loading'
      };
    }

    if (isCloser) {
      const displayClosers = allOnDutyClosers;
      const emptyTitle = "No On Duty Closers";
      const emptyDescription = "No closers are currently on duty.";
      const titleSuffix = 'On duty team members';
      
      return {
        closers: displayClosers,
        emptyTitle,
        emptyDescription,
        titleSuffix
      };
    } else {
      const displayClosers = closersInLineup;
      const emptyTitle = "No Available Closers";
      const emptyDescription = "All closers are currently off duty or assigned to leads.";
      const titleSuffix = 'Available team members';
      
      return {
        closers: displayClosers,
        emptyTitle,
        emptyDescription,
        titleSuffix
      };
    }
  };

  const { closers: displayClosers, emptyTitle, emptyDescription, titleSuffix } = getDisplayData();

  if (!user) {
    return (
      <Card className="h-full flex flex-col bg-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 ring-1 ring-slate-200">
        <CardContent className="flex-grow overflow-hidden px-4 pb-4">
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="h-full flex flex-col bg-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 ring-1 ring-slate-200"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4 shrink-0">
          <CardTitle className="text-lg sm:text-xl font-bold font-headline flex items-center text-slate-900 dark:text-slate-100 premium:text-premium-purple premium:text-glow">
            <div className={
              `mr-2 rounded-lg flex items-center justify-center p-2 border-2 border-premium-purple dark:border-premium-purple premium:border-premium-purple premium:shadow-premium-purple premium:bg-gradient-to-br premium:from-premium-purple/80 premium:to-premium-teal/80 premium:icon-glow-purple`
            } onClick={canManageClosers ? handleCardClick : undefined}>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-premium-purple premium:icon-glow-purple" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base leading-tight">Closer Lineup</span>
              <span className="text-xs font-normal text-muted-foreground premium:text-premium-teal truncate">{titleSuffix}</span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {isOverallLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow overflow-hidden px-4 pb-4">
          {displayClosers.length === 0 && !isOverallLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-8">
              <div className="p-3 bg-slate-100 rounded-full mb-3">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{emptyTitle}</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                {emptyDescription}
              </p>
              {user && !user.teamId && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-md mt-2">
                  Error: User missing team assignment
                </p>
              )}
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-3 pr-2">
                  {displayClosers.map((closer, index) => {
                    const isCurrentUser = closer.uid === user?.uid;
                    const isAssigned = assignedLeadCloserIds.has(closer.uid);
                    
                    return (
                      <div key={closer.uid} className={isCurrentUser ? "ring-2 ring-blue-400 rounded-lg" : ""}>
                        <CloserCard
                          closer={closer}
                          allowInteractiveToggle={false}
                          position={index + 1}
                          assignedLeadName={
                            isAssigned ? "Working on lead" : undefined
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ManageClosersModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />
    </>
  );
}
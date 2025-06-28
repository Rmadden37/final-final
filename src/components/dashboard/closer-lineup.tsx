// src/components/dashboard/closer-lineup.tsx
"use client";

import {useState, useEffect} from "react";
import type {Closer, Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy} from "firebase/firestore";
import CloserCard from "./closer-card";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import { Users, Loader2, UserCheck, Settings } from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import ManageClosersModal from "./off-duty-closers-modal";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";

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
            role: data.role,
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

  const handleManageClick = () => {
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
        titleSuffix: 'Loading',
        availableCount: 0,
        workingCount: 0
      };
    }

    if (isCloser) {
      const displayClosers = allOnDutyClosers;
      const availableCount = closersInLineup.length;
      const workingCount = allOnDutyClosers.length - availableCount;
      const emptyTitle = "No Team Members Online";
      const emptyDescription = "No closers are currently on duty.";
      const titleSuffix = 'Team status overview';
      
      return {
        closers: displayClosers,
        emptyTitle,
        emptyDescription,
        titleSuffix,
        availableCount,
        workingCount
      };
    } else {
      const displayClosers = closersInLineup;
      const availableCount = closersInLineup.length;
      const workingCount = allOnDutyClosers.length - availableCount;
      const emptyTitle = "No Available Closers";
      const emptyDescription = "All closers are currently off duty or assigned to leads.";
      const titleSuffix = 'Available for assignment';
      
      return {
        closers: displayClosers,
        emptyTitle,
        emptyDescription,
        titleSuffix,
        availableCount,
        workingCount
      };
    }
  };

  const { closers: displayClosers, emptyTitle, emptyDescription, titleSuffix, availableCount, workingCount } = getDisplayData();

  if (!user) {
    return (
      <Card className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-xl border-0 ring-1 ring-slate-200 dark:ring-slate-800">
        <CardContent className="flex-grow overflow-hidden px-4 pb-4">
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm text-slate-600">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <CardHeader className="shrink-0 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 border-b border-purple-100 dark:border-purple-900">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Closer Lineup</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{titleSuffix}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOverallLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400">
                      <UserCheck className="h-3 w-3 mr-1" />
                      {availableCount}
                    </Badge>
                    {workingCount > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                        <Users className="h-3 w-3 mr-1" />
                        {workingCount}
                      </Badge>
                    )}
                  </div>
                  {canManageClosers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleManageClick}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-grow overflow-hidden p-0">
          {displayClosers.length === 0 && !isOverallLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12 px-6">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 rounded-full mb-4">
                <Users className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{emptyTitle}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
                {emptyDescription}
              </p>
              {user && !user.teamId && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Error: User missing team assignment
                  </p>
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {displayClosers.map((closer, index) => {
                  const isCurrentUser = closer.uid === user?.uid;
                  const isAssigned = assignedLeadCloserIds.has(closer.uid);
                  
                  return (
                    <div key={closer.uid} className="relative">
                      {isCurrentUser && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-lg"></div>
                      )}
                      <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-purple-600 rounded-r-full"></div>
                        <div className="ml-3">
                          <CloserCard
                            closer={closer}
                            allowInteractiveToggle={false}
                            position={index + 1}
                            assignedLeadName={
                              isAssigned ? "Working on lead" : undefined
                            }
                          />
                        </div>
                      </div>
                      {isCurrentUser && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 text-xs">
                            You
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
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
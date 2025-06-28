// src/components/dashboard/in-process-leads.tsx
"use client";

import { useState, useEffect } from "react";
import type { Lead, Closer } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import LeadCard from "./lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Loader2, Activity, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function InProcessLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inProcessLeads, setInProcessLeads] = useState<Lead[]>([]);
  const [assignedLeadCloserMap, setAssignedLeadCloserMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  // Debug logging
  console.log('🔍 InProcessLeads - User:', { role: user?.role, teamId: user?.teamId });
  console.log('🔍 InProcessLeads - Current leads:', inProcessLeads.length);

  // Effect for fetching in_process and accepted leads
  useEffect(() => {
    if (!user || !user.teamId) {
      console.log('❌ InProcessLeads - No user or teamId');
      setLoading(false);
      setInProcessLeads([]);
      return;
    }

    console.log('🚀 InProcessLeads - Setting up query for teamId:', user.teamId);
    setLoading(true);

    const q = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["in_process", "accepted"]),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('📊 InProcessLeads - Query returned:', querySnapshot.docs.length, 'documents');
      
      const leadsData = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        console.log('📋 Lead data:', { id: docSnapshot.id, status: data.status, customerName: data.customerName });
        
        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address || "N/A",
          status: data.status,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: data.createdAt || data.submissionTime,
          updatedAt: data.updatedAt,
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: data.scheduledAppointmentTime || null,
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          photoUrls: data.photoUrls || [],
        } as Lead;
      });

      console.log('✅ InProcessLeads - Setting leads data:', leadsData.length, 'leads');
      setInProcessLeads(leadsData);

      // Create closer name map for quick lookup
      const closerMap = new Map();
      leadsData.forEach(lead => {
        if (lead.assignedCloserId && lead.assignedCloserName) {
          closerMap.set(lead.assignedCloserId, lead.assignedCloserName);
        }
      });
      setAssignedLeadCloserMap(closerMap);
      
      setLoading(false);
    }, (error) => {
      console.error('❌ InProcessLeads - Query error:', error);
      toast({
        title: "Error",
        description: "Failed to load in-process leads. Please refresh the page.",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => {
      console.log('🧹 InProcessLeads - Cleaning up subscription');
      unsubscribe();
    };
  }, [user, toast]);

  // Filter leads based on user role
  const displayLeads = inProcessLeads.filter(lead => {
    if (user?.role === "closer") {
      // Closers only see their own leads
      return lead.assignedCloserId === user.uid;
    }
    // Managers and admins see all in-process leads
    return true;
  });

  console.log('🎯 InProcessLeads - Display leads after filtering:', displayLeads.length);

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
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {user?.role === "closer" ? "Your assigned leads" : "Currently being processed"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-green-500" />
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {displayLeads.length}
                </Badge>
                {user?.role !== "closer" && (
                  <Badge variant="outline" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Team view
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden p-0">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Loading active leads...</p>
                <p className="text-xs text-slate-500">Fetching latest data</p>
              </div>
            </div>
          </div>
        ) : displayLeads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-12 px-6">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 rounded-full mb-4">
              <Activity className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {user?.role === "closer" ? "No Active Assignments" : "No Active Leads"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
              {user?.role === "closer" 
                ? "You don't have any leads currently assigned to you. Check back soon for new assignments!"
                : "No leads are currently being processed by your team members."
              }
            </p>
            {!user?.teamId && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">
                  Error: User missing team assignment
                </p>
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {displayLeads.map((lead, index) => {
                const isExpanded = expandedLeadId === lead.id;
                
                return (
                  <div key={lead.id} className="relative">
                    {/* Simplified Account Card */}
                    <div className="active-lead-summary bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="active-lead-status-indicator w-1 h-8 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                                className="active-lead-name font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors text-left"
                              >
                                {lead.customerName}
                              </button>
                              {lead.assignedCloserId === user?.uid && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs flex-shrink-0">
                                  Your Lead
                                </Badge>
                              )}
                            </div>
                            <p className="active-lead-meta text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {lead.assignedCloserName ? `Worked by: ${lead.assignedCloserName}` : 'Unassigned'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-xs hidden sm:flex">
                            {lead.status === "in_process" ? "In Process" : "Accepted"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                            className="h-6 w-6 p-0 flex-shrink-0"
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <LeadCard 
                            lead={lead} 
                            context="in-process"
                            onLeadClick={(clickedLead) => {
                              console.log('🔥 InProcessLeads - Lead clicked:', clickedLead.id, clickedLead.customerName);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
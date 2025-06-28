"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, BarChart3, ClipboardList, Wrench } from "lucide-react";
import TeamUserManagement from "./team-user-management";
import LeadHistorySpreadsheet from "./lead-history-spreadsheet";
import FixTeamsButton from "./fix-teams-button";
import AnalyticsDashboard from "./analytics-dashboard";

interface ManagerToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManagerToolsModal({
  isOpen,
  onClose,
}: ManagerToolsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <DialogTitle className="flex items-center text-2xl font-bold font-headline text-slate-900 dark:text-slate-100">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mr-3 shadow-md">
              <Settings className="h-5 w-5 text-white" />
            </div>
            Manager Tools
          </DialogTitle>
        </DialogHeader>
          
          <Tabs defaultValue="team-management" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 shadow-inner">
              <TabsTrigger 
                value="team-management" 
                className="flex items-center data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-md transition-all duration-200"
              >
                <Users className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Team Management</span>
                <span className="sm:hidden">Team</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lead-history" 
                className="flex items-center data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-md transition-all duration-200"
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Lead History</span>
                <span className="sm:hidden">Leads</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-md transition-all duration-200"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Analytics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="system-tools" 
                className="flex items-center data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md rounded-md transition-all duration-200"
              >
                <Wrench className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">System Tools</span>
                <span className="sm:hidden">Tools</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="team-management" className="mt-6">
              <TeamUserManagement />
            </TabsContent>
            
            <TabsContent value="lead-history" className="mt-6">
              <LeadHistorySpreadsheet />
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              <AnalyticsDashboard />
            </TabsContent>
            
            <TabsContent value="system-tools" className="mt-6">
              <div className="space-y-6">
                <FixTeamsButton />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

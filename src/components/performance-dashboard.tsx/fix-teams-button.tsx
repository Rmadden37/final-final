"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Users, 
  Building2,
  RefreshCw
} from "lucide-react";
import { fixTeamsAndUsers, checkTeamsAndUsersState } from "@/utils/fix-teams-and-users";

interface TeamState {
  id: string;
  name: string;
  userCount: number;
  closerCount: number;
}

interface FixResult {
  success: boolean;
  message: string;
  details: {
    duplicatesRemoved: number;
    usersMovedToEmpire: number;
    closersMovedToEmpire: number;
  };
}

export default function FixTeamsButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastFixResult, setLastFixResult] = useState<FixResult | null>(null);
  const [teamsState, setTeamsState] = useState<{
    teams: TeamState[];
    totalUsers: number;
    totalClosers: number;
  } | null>(null);

  // Only show to managers
  if (!user || user.role !== "manager") {
    return null;
  }

  const handleCheckState = async () => {
    setIsChecking(true);
    try {
      const state = await checkTeamsAndUsersState();
      setTeamsState(state);
      toast({
        title: "State Checked",
        description: "Current teams and users state has been loaded.",
      });
    } catch (error) {
      console.error("Error checking state:", error);
      toast({
        title: "Check Failed",
        description: "Failed to check teams and users state.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleFix = async () => {
    setIsFixing(true);
    try {
      const result = await fixTeamsAndUsers();
      setLastFixResult(result);
      
      if (result.success) {
        toast({
          title: "Fix Completed",
          description: result.message,
          duration: 5000,
        });
        // Refresh the state after fixing
        await handleCheckState();
      } else {
        toast({
          title: "Fix Failed",
          description: result.message,
          variant: "destructive",
          duration: 7000,
        });
      }
    } catch (error) {
      console.error("Error running fix:", error);
      toast({
        title: "Fix Failed",
        description: "An unexpected error occurred while fixing teams and users.",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="shadow-xl border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold font-headline flex items-center">
          <AlertTriangle className="mr-3 h-6 w-6 text-orange-600" />
          Fix Teams & Users
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">This tool will:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Remove duplicate team entries</li>
            <li>Move all users to Empire team</li>
            <li>Update closers team assignments</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCheckState}
            variant="outline"
            size="sm"
            disabled={isChecking || isFixing}
            className="flex-1"
          >
            {isChecking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Check State
          </Button>
          
          <Button
            onClick={handleFix}
            variant="secondary"
            size="sm"
            disabled={isFixing || isChecking}
            className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-800/40 dark:text-orange-400"
          >
            {isFixing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-2 h-4 w-4" />
            )}
            Run Fix
          </Button>
        </div>

        {teamsState && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Building2 className="mr-2 h-4 w-4" />
              Current State
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Total Users:</span>
                <Badge variant="secondary">{teamsState.totalUsers}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Total Closers:</span>
                <Badge variant="secondary">{teamsState.totalClosers}</Badge>
              </div>
              <div className="space-y-1">
                <span className="font-medium">Teams:</span>
                {teamsState.teams.map((team) => (
                  <div key={team.id} className="flex justify-between items-center pl-2">
                    <span className={team.id === "empire" ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""}>
                      {team.name}
                    </span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {team.userCount}u
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {team.closerCount}c
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {lastFixResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            lastFixResult.success 
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          }`}>
            <div className="flex items-center mb-2">
              {lastFixResult.success ? (
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                lastFixResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
              }`}>
                Last Fix Result
              </span>
            </div>
            <p className={`text-xs mb-2 ${
              lastFixResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
            }`}>
              {lastFixResult.message}
            </p>
            {lastFixResult.success && (
              <div className="text-xs space-y-1">
                <div>Duplicates removed: {lastFixResult.details.duplicatesRemoved}</div>
                <div>Users moved to Empire: {lastFixResult.details.usersMovedToEmpire}</div>
                <div>Closers moved to Empire: {lastFixResult.details.closersMovedToEmpire}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

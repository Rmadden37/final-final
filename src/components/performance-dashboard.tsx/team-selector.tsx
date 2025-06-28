"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp
} from "firebase/firestore";
import { initializeTeams } from "@/utils/init-teams";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Shield, Loader2, Building2 } from "lucide-react";

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export default function TeamSelector() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [switchingTeam, setSwitchingTeam] = useState(false);

  // Load all teams
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      setTeams(teamsData);
      setLoadingTeams(false);
    }, (_error) => {
      toast({
        title: "Error",
        description: "Failed to load teams. Please refresh the page.",
        variant: "destructive",
      });
      setLoadingTeams(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Initialize teams if none exist
  useEffect(() => {
    const checkAndInitializeTeams = async () => {
      if (!loadingTeams && teams.length === 0 && (user?.role === "manager" || user?.role === "admin")) {
        try {
          await initializeTeams();
          toast({
            title: "Teams Initialized",
            description: "Empire team has been created successfully.",
          });
        } catch {
          toast({
            title: "Error",
            description: "Failed to initialize teams.",
            variant: "destructive",
          });
        }
      }
    };

    checkAndInitializeTeams();
  }, [loadingTeams, teams.length, user?.role, toast]);

  const handleTeamSwitch = async (newTeamId: string) => {
    if (!user || !newTeamId || newTeamId === user.teamId) {
      return;
    }

    setSwitchingTeam(true);

    try {
      // Update user's teamId
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        teamId: newTeamId,
        updatedAt: serverTimestamp(),
      });

      // If user is a closer, also update their closer record
      if (user.role === "closer") {
        const closerRef = doc(db, "closers", user.uid);
        await updateDoc(closerRef, {
          teamId: newTeamId,
          updatedAt: serverTimestamp(),
        });
      }

      const selectedTeam = teams.find(t => t.id === newTeamId);
      toast({
        title: "Team Switched",
        description: `Successfully switched to ${selectedTeam?.name || "new team"}.`,
      });
    } catch {
      toast({
        title: "Switch Failed",
        description: "Failed to switch teams. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSwitchingTeam(false);
    }
  };

  const getCurrentTeam = () => {
    return teams.find(team => team.id === user?.teamId);
  };

  if (!user || user.role === "setter") {
    return null; // Setters don't need team switching
  }

  const currentTeam = getCurrentTeam();

  return (
    <div className="w-full max-w-md">
      <div className="space-y-2">
        {loadingTeams ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2 dark:text-turquoise premium:text-white" />
            <span className="text-sm text-muted-foreground dark:text-gray-400 premium:text-gray-300">Loading teams...</span>
          </div>
        ) : (
          <Select
            value={user.teamId}
            onValueChange={handleTeamSwitch}
            disabled={switchingTeam}
          >
            <SelectTrigger className="w-full dark:card-glass dark:border-turquoise/20 dark:glow-turquoise premium:card-glass premium:border-white/18 premium:text-glow">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary dark:text-turquoise premium:text-white" />
                  <span className="font-medium dark:text-gray-200 premium:text-white">{currentTeam?.name || "Unknown Team"}</span>
                  {currentTeam?.description && (
                    <span className="text-xs text-muted-foreground dark:text-gray-400 premium:text-gray-300">
                      - {currentTeam.description}
                    </span>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="dark:card-glass dark:border-turquoise/20 dark:glow-turquoise premium:card-glass premium:border-white/18">
              {teams
                .filter(team => team.isActive)
                .map((team) => (
                <SelectItem key={team.id} value={team.id} className="dark:hover:bg-turquoise/10 dark:focus:bg-turquoise/10 premium:hover:bg-white/10 premium:focus:bg-white/10 premium:text-white">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 dark:text-cyan premium:text-gray-300" />
                    <div>
                      <div className="font-medium dark:text-gray-200 premium:text-white">{team.name}</div>
                      {team.description && (
                        <div className="text-xs text-muted-foreground dark:text-gray-400 premium:text-gray-300">
                          {team.description}
                        </div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {switchingTeam && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground premium:text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin premium:text-white" />
            Switching teams...
          </div>
        )}
        
        <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded border premium:bg-white/10 premium:border-white/20 premium:text-gray-300">
          <div className="flex items-center justify-between">
            <span>
              <strong className="premium:text-white">Role:</strong> 
              <span className="inline-flex items-center gap-1 ml-1">
                {(user.role === "manager" || user.role === "admin") && <Shield className="h-3 w-3 text-blue-600 premium:text-blue-400" />}
                {user.role === "closer" && <Users className="h-3 w-3 text-green-600 premium:text-green-400" />}
                <span className="capitalize font-medium premium:text-white">{user.role}</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

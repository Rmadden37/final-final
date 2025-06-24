"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  initializeTeams, 
  getAllTeams, 
  areTeamsInitialized, 
  createTeam, 
  updateTeam,
  type Team 
} from "@/utils/init-teams";
import { Building2, Users, Settings, RefreshCw, Plus, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function TeamsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    regionId: "default", // Default region
    isActive: true
  });

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const teamsData = await getAllTeams();
      setTeams(teamsData);
      
      const initialized = await areTeamsInitialized();
      setIsInitialized(initialized);
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role === "manager" || user?.role === "admin") {
      loadTeams();
    }
  }, [user, loadTeams]);

  const handleInitializeTeams = async () => {
    try {
      setInitializing(true);
      await initializeTeams();
      await loadTeams();
      toast({
        title: "Teams Initialized",
        description: "Default teams have been created successfully!",
      });
    } catch (error) {
      console.error("Error initializing teams:", error);
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize teams. Please try again.",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTeam({
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        regionId: newTeam.regionId,
        isActive: newTeam.isActive
      });
      
      await loadTeams();
      setIsCreateModalOpen(false);
      setNewTeam({ name: "", description: "", regionId: "default", isActive: true });
      
      toast({
        title: "Team Created",
        description: `Team "${newTeam.name}" has been created successfully!`,
      });
    } catch (error) {
      console.error("Error creating team:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleTeamStatus = async (teamId: string, isActive: boolean) => {
    try {
      await updateTeam(teamId, { isActive });
      await loadTeams();
      
      toast({
        title: "Team Updated",
        description: `Team has been ${isActive ? "activated" : "deactivated"}`,
      });
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update team status",
        variant: "destructive",
      });
    }
  };

  if (!user || user.role !== "manager") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Access denied. Only managers can view teams management.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Teams Management
          </CardTitle>
          <CardDescription>
            Manage teams and configure team settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Teams Status: {isInitialized ? "Initialized" : "Not Initialized"}
              </p>
              <p className="text-xs text-muted-foreground">
                {teams.length} teams found
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadTeams}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {!isInitialized && (
                <Button
                  onClick={handleInitializeTeams}
                  disabled={initializing}
                  size="sm"
                >
                  {initializing ? "Initializing..." : "Initialize Teams"}
                </Button>
              )}
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                      Create a new team for your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="team-name">Team Name</Label>
                      <Input
                        id="team-name"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        placeholder="Enter team name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team-description">Description</Label>
                      <Textarea
                        id="team-description"
                        value={newTeam.description}
                        onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                        placeholder="Enter team description"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="team-active"
                        checked={newTeam.isActive}
                        onCheckedChange={(checked) => setNewTeam({ ...newTeam, isActive: checked })}
                      />
                      <Label htmlFor="team-active">Active Team</Label>
                    </div>
                    <Button onClick={handleCreateTeam} className="w-full">
                      Create Team
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <Badge variant={team.isActive ? "default" : "secondary"}>
                  {team.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {team.description && (
                <CardDescription>{team.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>ID: {team.id}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Created: {team.createdAt?.toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleTeamStatus(team.id, !team.isActive)}
                  >
                    {team.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Teams Found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by initializing the default teams or creating a new one.
              </p>
              {!isInitialized && (
                <Button onClick={handleInitializeTeams} disabled={initializing}>
                  {initializing ? "Initializing..." : "Initialize Default Teams"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

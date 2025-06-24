"use client";

import { Suspense, useEffect, useState } from "react";
import { Loader2, ShieldAlert, Building2, MapPin, Users, Plus, Settings2, Trash2, Edit2, MessageCircle, Upload, Image } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

interface Region {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  chatChannelId?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  regionId: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  logoUrl?: string;
  chatChannelId?: string;
  settings?: {
    autoAssignment?: boolean;
    maxLeadsPerCloser?: number;
    workingHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
}

export default function AdminToolsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [regions, setRegions] = useState<Region[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form states
  const [isCreateRegionOpen, setIsCreateRegionOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isEditRegionOpen, setIsEditRegionOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [logoUpload, setLogoUpload] = useState<File | null>(null);
  
  const [newRegion, setNewRegion] = useState({ 
    name: "", 
    description: "", 
    isActive: true, 
    chatChannelId: "" 
  });
  const [newTeam, setNewTeam] = useState({ 
    name: "", 
    description: "", 
    regionId: "", 
    isActive: true,
    logoUrl: "",
    chatChannelId: "",
    settings: {
      autoAssignment: true,
      maxLeadsPerCloser: 12,
      workingHours: {
        start: "07:00",
        end: "22:00",
        timezone: "America/Los_Angeles"
      }
    }
  });

  
  // Redirect non-admins away from this page
  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Load regions and teams
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const regionsQuery = query(collection(db, "regions"), orderBy("createdAt", "desc"));
    const teamsQuery = query(collection(db, "teams"), orderBy("createdAt", "desc"));

    const unsubscribeRegions = onSnapshot(regionsQuery, (snapshot) => {
      const regionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Region[];
      setRegions(regionsData);
    });

    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      setTeams(teamsData);
      setLoadingData(false);
    });

    return () => {
      unsubscribeRegions();
      unsubscribeTeams();
    };
  }, [user]);

  const handleCreateRegion = async () => {
    if (!newRegion.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Region name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await addDoc(collection(db, "regions"), {
        ...newRegion,
        name: newRegion.name.trim(),
        description: newRegion.description.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Region Created",
        description: `Region "${newRegion.name}" has been created successfully!`,
      });

      setNewRegion({ name: "", description: "", isActive: true, chatChannelId: "" });
      setIsCreateRegionOpen(false);
    } catch (error) {
      console.error("Error creating region:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create region. Please try again.",
        variant: "destructive",
      });
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

    if (!newTeam.regionId) {
      toast({
        title: "Validation Error",
        description: "Please select a region for this team",
        variant: "destructive",
      });
      return;
    }

    try {
      await addDoc(collection(db, "teams"), {
        ...newTeam,
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const selectedRegion = regions.find(r => r.id === newTeam.regionId);
      toast({
        title: "Team Created",
        description: `Team "${newTeam.name}" has been created in ${selectedRegion?.name} region!`,
      });

      setNewTeam({ 
        name: "", 
        description: "", 
        regionId: "", 
        isActive: true,
        logoUrl: "",
        chatChannelId: "",
        settings: {
          autoAssignment: true,
          maxLeadsPerCloser: 12,
          workingHours: {
            start: "07:00",
            end: "22:00",
            timezone: "America/Los_Angeles"
          }
        }
      });
      setIsCreateTeamOpen(false);
    } catch (error) {
      console.error("Error creating team:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleRegionStatus = async (regionId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, "regions", regionId), {
        isActive,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Region Updated",
        description: `Region has been ${isActive ? "activated" : "deactivated"}`,
      });
    } catch (error) {
      console.error("Error updating region:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update region status",
        variant: "destructive",
      });
    }
  };

  const handleToggleTeamStatus = async (teamId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, "teams", teamId), {
        isActive,
        updatedAt: serverTimestamp()
      });

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

  const handleDeleteRegion = async (regionId: string) => {
    const teamsInRegion = teams.filter(team => team.regionId === regionId);
    
    if (teamsInRegion.length > 0) {
      toast({
        title: "Cannot Delete Region",
        description: `This region has ${teamsInRegion.length} teams. Please move or delete teams first.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteDoc(doc(db, "regions", regionId));
      toast({
        title: "Region Deleted",
        description: "Region has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting region:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete region. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteDoc(doc(db, "teams", teamId));
      toast({
        title: "Team Deleted",
        description: "Team has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete team. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditRegion = (region: Region) => {
    setEditingRegion(region);
    setIsEditRegionOpen(true);
  };

  const handleUpdateRegion = async () => {
    if (!editingRegion || !editingRegion.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Region name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDoc(doc(db, "regions", editingRegion.id), {
        name: editingRegion.name.trim(),
        description: editingRegion.description.trim(),
        isActive: editingRegion.isActive,
        chatChannelId: editingRegion.chatChannelId?.trim() || "",
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Region Updated",
        description: `Region "${editingRegion.name}" has been updated successfully!`,
      });

      setEditingRegion(null);
      setIsEditRegionOpen(false);
    } catch (error) {
      console.error("Error updating region:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update region. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setIsEditTeamOpen(true);
  };

  const uploadTeamLogo = async (file: File): Promise<string> => {
    // For now, we'll use a placeholder URL since we don't have file storage configured
    // In a real app, you'd upload to Firebase Storage, AWS S3, etc.
    const fakeUrl = `https://via.placeholder.com/100x100/6366f1/ffffff?text=${file.name.charAt(0).toUpperCase()}`;
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return fakeUrl;
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    if (!editingTeam.regionId) {
      toast({
        title: "Validation Error",
        description: "Please select a region for this team",
        variant: "destructive",
      });
      return;
    }

    try {
      let logoUrl = editingTeam.logoUrl;
      
      // Upload new logo if selected
      if (logoUpload) {
        logoUrl = await uploadTeamLogo(logoUpload);
      }

      await updateDoc(doc(db, "teams", editingTeam.id), {
        name: editingTeam.name.trim(),
        description: editingTeam.description.trim(),
        regionId: editingTeam.regionId,
        isActive: editingTeam.isActive,
        logoUrl: logoUrl || "",
        chatChannelId: editingTeam.chatChannelId?.trim() || "",
        settings: editingTeam.settings,
        updatedAt: serverTimestamp()
      });

      const selectedRegion = regions.find(r => r.id === editingTeam.regionId);
      toast({
        title: "Team Updated",
        description: `Team "${editingTeam.name}" has been updated successfully!`,
      });

      setEditingTeam(null);
      setIsEditTeamOpen(false);
      setLogoUpload(null);
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update team. Please try again.",
        variant: "destructive",
      });
    }
  };



  if (loading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || user.role !== "admin") {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You do not have permission to access this area. Admin access required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            Admin Tools
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage regions, teams, and administrative functions
          </p>
        </div>
      </div>

      <Tabs defaultValue="regions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="regions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Region Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage regional divisions
                  </CardDescription>
                </div>
                <Dialog open={isCreateRegionOpen} onOpenChange={setIsCreateRegionOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Region
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Region</DialogTitle>
                      <DialogDescription>
                        Add a new regional division to organize teams
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="region-name">Region Name</Label>
                        <Input
                          id="region-name"
                          value={newRegion.name}
                          onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                          placeholder="e.g., North America, Europe, Asia Pacific"
                        />
                      </div>
                      <div>
                        <Label htmlFor="region-description">Description</Label>
                        <Textarea
                          id="region-description"
                          value={newRegion.description}
                          onChange={(e) => setNewRegion({ ...newRegion, description: e.target.value })}
                          placeholder="Describe this region's purpose and scope"
                        />
                      </div>
                      <div>
                        <Label htmlFor="region-chat">Chat Channel ID</Label>
                        <Input
                          id="region-chat"
                          value={newRegion.chatChannelId}
                          onChange={(e) => setNewRegion({ ...newRegion, chatChannelId: e.target.value })}
                          placeholder="e.g., region-north-america-chat"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="region-active"
                          checked={newRegion.isActive}
                          onCheckedChange={(checked) => setNewRegion({ ...newRegion, isActive: checked })}
                        />
                        <Label htmlFor="region-active">Active Region</Label>
                      </div>
                      <Button onClick={handleCreateRegion} className="w-full">
                        Create Region
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            
            {/* Edit Region Dialog */}
            <Dialog open={isEditRegionOpen} onOpenChange={setIsEditRegionOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Region</DialogTitle>
                  <DialogDescription>
                    Update region information and settings
                  </DialogDescription>
                </DialogHeader>
                {editingRegion && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-region-name">Region Name</Label>
                      <Input
                        id="edit-region-name"
                        value={editingRegion.name}
                        onChange={(e) => setEditingRegion({ ...editingRegion, name: e.target.value })}
                        placeholder="e.g., North America, Europe, Asia Pacific"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-region-description">Description</Label>
                      <Textarea
                        id="edit-region-description"
                        value={editingRegion.description}
                        onChange={(e) => setEditingRegion({ ...editingRegion, description: e.target.value })}
                        placeholder="Describe this region's purpose and scope"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-region-chat">Chat Channel ID</Label>
                      <Input
                        id="edit-region-chat"
                        value={editingRegion.chatChannelId || ""}
                        onChange={(e) => setEditingRegion({ ...editingRegion, chatChannelId: e.target.value })}
                        placeholder="e.g., region-north-america-chat"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-region-active"
                        checked={editingRegion.isActive}
                        onCheckedChange={(checked) => setEditingRegion({ ...editingRegion, isActive: checked })}
                      />
                      <Label htmlFor="edit-region-active">Active Region</Label>
                    </div>
                    <Button onClick={handleUpdateRegion} className="w-full">
                      Update Region
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <CardContent>
              {regions.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Regions Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first region to organize teams by geographic or business divisions.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {regions.map((region) => (
                    <Card key={region.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{region.name}</CardTitle>
                          <Badge variant={region.isActive ? "default" : "secondary"}>
                            {region.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {region.description && (
                          <CardDescription>{region.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{teams.filter(t => t.regionId === region.id).length} teams</span>
                          </div>
                          
                          {region.chatChannelId && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MessageCircle className="h-4 w-4" />
                              <span className="font-mono text-xs">{region.chatChannelId}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleRegionStatus(region.id, !region.isActive)}
                              >
                                {region.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRegion(region)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteRegion(region.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Team Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage teams within regions
                  </CardDescription>
                </div>
                <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={regions.length === 0}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Team</DialogTitle>
                      <DialogDescription>
                        Add a new team to a region
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="team-name">Team Name</Label>
                          <Input
                            id="team-name"
                            value={newTeam.name}
                            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                            placeholder="e.g., Empire, Thunder"
                          />
                        </div>
                        <div>
                          <Label htmlFor="team-region">Region</Label>
                          <Select value={newTeam.regionId} onValueChange={(value) => setNewTeam({ ...newTeam, regionId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a region" />
                            </SelectTrigger>
                            <SelectContent>
                              {regions.filter(r => r.isActive).map((region) => (
                                <SelectItem key={region.id} value={region.id}>
                                  {region.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="team-description">Description</Label>
                        <Textarea
                          id="team-description"
                          value={newTeam.description}
                          onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                          placeholder="Describe this team's role and responsibilities"
                        />
                      </div>

                      <div>
                        <Label htmlFor="team-chat">Chat Channel ID</Label>
                        <Input
                          id="team-chat"
                          value={newTeam.chatChannelId}
                          onChange={(e) => setNewTeam({ ...newTeam, chatChannelId: e.target.value })}
                          placeholder="e.g., team-empire-chat"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="max-leads">Max Leads Per Closer</Label>
                          <Input
                            id="max-leads"
                            type="number"
                            value={newTeam.settings.maxLeadsPerCloser}
                            onChange={(e) => setNewTeam({ 
                              ...newTeam, 
                              settings: { 
                                ...newTeam.settings, 
                                maxLeadsPerCloser: parseInt(e.target.value) || 12 
                              }
                            })}
                            min="1"
                            max="50"
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            id="auto-assignment"
                            checked={newTeam.settings.autoAssignment}
                            onCheckedChange={(checked) => setNewTeam({ 
                              ...newTeam, 
                              settings: { 
                                ...newTeam.settings, 
                                autoAssignment: checked 
                              }
                            })}
                          />
                          <Label htmlFor="auto-assignment">Auto Assignment</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="start-time">Start Time</Label>
                          <Input
                            id="start-time"
                            type="time"
                            value={newTeam.settings.workingHours.start}
                            onChange={(e) => setNewTeam({ 
                              ...newTeam, 
                              settings: { 
                                ...newTeam.settings, 
                                workingHours: { 
                                  ...newTeam.settings.workingHours, 
                                  start: e.target.value 
                                }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-time">End Time</Label>
                          <Input
                            id="end-time"
                            type="time"
                            value={newTeam.settings.workingHours.end}
                            onChange={(e) => setNewTeam({ 
                              ...newTeam, 
                              settings: { 
                                ...newTeam.settings, 
                                workingHours: { 
                                  ...newTeam.settings.workingHours, 
                                  end: e.target.value 
                                }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="timezone">Timezone</Label>
                          <Select 
                            value={newTeam.settings.workingHours.timezone} 
                            onValueChange={(value) => setNewTeam({ 
                              ...newTeam, 
                              settings: { 
                                ...newTeam.settings, 
                                workingHours: { 
                                  ...newTeam.settings.workingHours, 
                                  timezone: value 
                                }
                              }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                              <SelectItem value="America/Denver">Mountain</SelectItem>
                              <SelectItem value="America/Chicago">Central</SelectItem>
                              <SelectItem value="America/New_York">Eastern</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
            </CardHeader>
            
            {/* Edit Team Dialog */}
            <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Team</DialogTitle>
                  <DialogDescription>
                    Update team information and settings
                  </DialogDescription>
                </DialogHeader>
                {editingTeam && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-team-name">Team Name</Label>
                        <Input
                          id="edit-team-name"
                          value={editingTeam.name}
                          onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                          placeholder="e.g., Empire, Thunder"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-team-region">Region</Label>
                        <Select 
                          value={editingTeam.regionId} 
                          onValueChange={(value) => setEditingTeam({ ...editingTeam, regionId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a region" />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.filter(r => r.isActive).map((region) => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-team-description">Description</Label>
                      <Textarea
                        id="edit-team-description"
                        value={editingTeam.description}
                        onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                        placeholder="Describe this team's role and responsibilities"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-team-chat">Chat Channel ID</Label>
                        <Input
                          id="edit-team-chat"
                          value={editingTeam.chatChannelId || ""}
                          onChange={(e) => setEditingTeam({ ...editingTeam, chatChannelId: e.target.value })}
                          placeholder="e.g., team-empire-chat"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-team-logo">Team Logo</Label>
                        <Input
                          id="edit-team-logo"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setLogoUpload(e.target.files?.[0] || null)}
                        />
                        {editingTeam.logoUrl && (
                          <p className="text-xs text-muted-foreground mt-1">Current logo uploaded</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-max-leads">Max Leads Per Closer</Label>
                        <Input
                          id="edit-max-leads"
                          type="number"
                          value={editingTeam.settings?.maxLeadsPerCloser || 12}
                          onChange={(e) => setEditingTeam({ 
                            ...editingTeam, 
                            settings: { 
                              ...editingTeam.settings, 
                              maxLeadsPerCloser: parseInt(e.target.value) || 12 
                            }
                          })}
                          min="1"
                          max="50"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          id="edit-auto-assignment"
                          checked={editingTeam.settings?.autoAssignment ?? true}
                          onCheckedChange={(checked) => setEditingTeam({ 
                            ...editingTeam, 
                            settings: { 
                              ...editingTeam.settings, 
                              autoAssignment: checked 
                            }
                          })}
                        />
                        <Label htmlFor="edit-auto-assignment">Auto Assignment</Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="edit-start-time">Start Time</Label>
                        <Input
                          id="edit-start-time"
                          type="time"
                          value={editingTeam.settings?.workingHours?.start || "07:00"}
                          onChange={(e) => setEditingTeam({ 
                            ...editingTeam, 
                            settings: { 
                              ...editingTeam.settings, 
                              workingHours: { 
                                ...editingTeam.settings?.workingHours, 
                                start: e.target.value 
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-end-time">End Time</Label>
                        <Input
                          id="edit-end-time"
                          type="time"
                          value={editingTeam.settings?.workingHours?.end || "22:00"}
                          onChange={(e) => setEditingTeam({ 
                            ...editingTeam, 
                            settings: { 
                              ...editingTeam.settings, 
                              workingHours: { 
                                ...editingTeam.settings?.workingHours, 
                                end: e.target.value 
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-timezone">Timezone</Label>
                        <Select 
                          value={editingTeam.settings?.workingHours?.timezone || "America/Los_Angeles"} 
                          onValueChange={(value) => setEditingTeam({ 
                            ...editingTeam, 
                            settings: { 
                              ...editingTeam.settings, 
                              workingHours: { 
                                ...editingTeam.settings?.workingHours, 
                                timezone: value 
                              }
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                            <SelectItem value="America/Denver">Mountain</SelectItem>
                            <SelectItem value="America/Chicago">Central</SelectItem>
                            <SelectItem value="America/New_York">Eastern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-team-active"
                        checked={editingTeam.isActive}
                        onCheckedChange={(checked) => setEditingTeam({ ...editingTeam, isActive: checked })}
                      />
                      <Label htmlFor="edit-team-active">Active Team</Label>
                    </div>

                    <Button onClick={handleUpdateTeam} className="w-full">
                      Update Team
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Teams Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {regions.length === 0 
                      ? "Create a region first, then add teams to organize your workforce."
                      : "Create your first team within a region to get started."
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {regions.map((region) => {
                    const regionTeams = teams.filter(team => team.regionId === region.id);
                    
                    if (regionTeams.length === 0) return null;
                    
                    return (
                      <div key={region.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-lg">{region.name}</h3>
                          <Badge variant="outline">{regionTeams.length} teams</Badge>
                        </div>
                        
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 ml-6">
                          {regionTeams.map((team) => (
                            <Card key={team.id} className="relative">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {team.logoUrl && (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                        <Image className="w-6 h-6 text-primary" />
                                      </div>
                                    )}
                                    <CardTitle className="text-base">{team.name}</CardTitle>
                                  </div>
                                  <Badge variant={team.isActive ? "default" : "secondary"}>
                                    {team.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                {team.description && (
                                  <CardDescription className="text-sm">{team.description}</CardDescription>
                                )}
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {team.settings && (
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-3 w-3" />
                                        <span>Max {team.settings.maxLeadsPerCloser} leads/closer</span>
                                      </div>
                                      <div>
                                        Hours: {team.settings.workingHours?.start} - {team.settings.workingHours?.end}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {team.chatChannelId && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <MessageCircle className="h-3 w-3" />
                                      <span className="font-mono">{team.chatChannelId}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between gap-2 pt-2">
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleTeamStatus(team.id, !team.isActive)}
                                      >
                                        {team.isActive ? "Deactivate" : "Activate"}
                                      </Button>
                                      
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditTeam(team)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleDeleteTeam(team.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

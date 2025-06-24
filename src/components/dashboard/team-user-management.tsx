"use client";

import type {AppUser} from "@/types";
import React, {useEffect, useState} from "react";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {collection, query, onSnapshot, doc, writeBatch, updateDoc} from "firebase/firestore";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Loader2, Users, UserCog, Trash2, ShieldAlert, ShieldCheck, Building2, ChevronDown, Camera, Search} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import ChangeUserRoleModal from "./change-user-role-modal";
import ConfirmUserDeleteModal from "./confirm-user-delete-modal";
import UploadAvatarModal from "./upload-avatar-modal";
import TeamSelector from "./team-selector";
import InviteNewUserButton from "./invite-new-user-button";
import {initializeTeams} from "@/utils/init-teams";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function TeamUserManagement() {
  const {user: managerUser} = useAuth();
  const {toast} = useToast();
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<AppUser | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AppUser | null>(null);
  const [selectedUserForAvatar, setSelectedUserForAvatar] = useState<AppUser | null>(null);

  // Load all teams and initialize missing ones
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      setTeams(teamsData);
      
      // Always initialize teams to ensure "empire" exists
      if (managerUser?.role === "manager" || managerUser?.role === "admin") {
        // Check if Empire team exists
        const hasEmpireTeam = teamsData.some(team => team.id === "empire");
        
        if (!hasEmpireTeam) {
          initializeTeams().catch(() => {
            // Error handling done in initializeTeams
          });
        }
      }
    }, (_error) => {
      toast({
        title: "Error",
        description: "Failed to load teams.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast, managerUser]);

  useEffect(() => {
    if (managerUser?.role === "manager" || managerUser?.role === "admin") {
      setLoading(true);
      // Query all users across all teams
      const usersQuery = query(
        collection(db, "users")
      );

      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs
          .map((doc) => ({uid: doc.id, ...doc.data()} as AppUser));
        // Removed filter that excluded the manager

        // Sort client-side
        usersData.sort((a, b) => {
          const nameA = a.displayName || a.email || "";
          const nameB = b.displayName || b.email || "";
          return nameA.localeCompare(nameB);
        });

        setTeamUsers(usersData);
        setLoading(false);
      }, (_error) => {
        toast({title: "Error", description: "Could not fetch team users.", variant: "destructive"});
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
      setTeamUsers([]);
    }
  }, [managerUser, toast]);

  const handleDeleteUser = async (userToDelete: AppUser) => {
    if (!managerUser || (managerUser.role !== "manager" && managerUser.role !== "admin")) {
      toast({title: "Unauthorized", description: "Only managers and admins can delete users.", variant: "destructive"});
      return;
    }
    if (userToDelete.uid === managerUser.uid) {
      toast({title: "Action Not Allowed", description: "You cannot delete yourself.", variant: "destructive"});
      return;
    }

    const batch = writeBatch(db);
    const userDocRef = doc(db, "users", userToDelete.uid);
    batch.delete(userDocRef);

    // If the user was a closer, manager, or admin, delete their closer record too
    if (userToDelete.role === "closer" || userToDelete.role === "manager" || userToDelete.role === "admin") {
      const closerDocRef = doc(db, "closers", userToDelete.uid);
      batch.delete(closerDocRef);
    }

    try {
      await batch.commit();
      toast({
        title: "User Records Deleted",
        description: `${userToDelete.displayName || userToDelete.email}'s records have been removed from the application. Note: Full Firebase Authentication account deletion requires backend admin privileges.`,
        duration: 7000,
      });
      setSelectedUserForDelete(null); // Close modal
    } catch {
      toast({
        title: "Deletion Failed",
        description: "Could not delete user records. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChangeUserTeam = async (userToMove: AppUser, newTeamId: string) => {
    if (!managerUser || (managerUser.role !== "manager" && managerUser.role !== "admin")) {
      toast({title: "Unauthorized", description: "Only managers and admins can change user teams.", variant: "destructive"});
      return;
    }

    if (userToMove.teamId === newTeamId) {
      toast({title: "No Change", description: "User is already on that team.", variant: "default"});
      return;
    }

    try {
      const userDocRef = doc(db, "users", userToMove.uid);
      await updateDoc(userDocRef, {
        teamId: newTeamId,
        updatedAt: new Date()
      });

      // If the user is a closer, manager, or admin, also update their closer record
      if (userToMove.role === "closer" || userToMove.role === "manager" || userToMove.role === "admin") {
        const closerDocRef = doc(db, "closers", userToMove.uid);
        await updateDoc(closerDocRef, {
          teamId: newTeamId,
          updatedAt: new Date()
        });
      }

      const newTeam = teams.find(t => t.id === newTeamId);
      toast({
        title: "Team Changed",
        description: `${userToMove.displayName || userToMove.email} has been moved to ${newTeam?.name || newTeamId}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to change user's team. Please try again.",
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center">
            <Users className="mr-3 h-7 w-7 text-primary" />
            Team Management
          </CardTitle>
          <CardDescription className="text-center">Loading team members...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!managerUser || (managerUser.role !== "manager" && managerUser.role !== "admin")) {
    return null;
  }

  // Filter users based on search query and selected filters
  const filteredUsers = teamUsers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const displayName = (user.displayName || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const teamName = (teams.find(t => t.id === user.teamId)?.name || '').toLowerCase();
    const matchesSearch =
      searchLower === '' ||
      displayName.includes(searchLower) ||
      email.includes(searchLower) ||
      role.includes(searchLower) ||
      teamName.includes(searchLower);
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesTeam = !teamFilter || user.teamId === teamFilter;
    return matchesSearch && matchesRole && matchesTeam;
  });
  
  return (
    <>
      <div className="space-y-6">
        {/* Team Selection and Invite Controls */}
        <div className="space-y-4">
          {/* Team Selection Dropdown */}
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold font-headline">Current Team</h3>
              <p className="text-sm text-muted-foreground">Select the team you want to manage</p>
            </div>
          </div>
          <TeamSelector />
          
          {/* Invite New User Button */}
          <div className="flex justify-start">
            <InviteNewUserButton 
              variant="primary-solid"
              className="invite-user-prominent-btn border-2 border-blue-600 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold shadow-lg hover:from-blue-600 hover:to-blue-800 hover:shadow-xl focus:ring-4 focus:ring-blue-400 dark:from-blue-900 dark:to-blue-700 dark:text-blue-100 dark:hover:from-blue-800 dark:hover:to-blue-900 dark:focus:ring-blue-800 transition-all duration-300 rounded-xl px-6 py-3 text-base"
            />
          </div>
        </div>
        
        {/* Team Member Management */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center">
                <Users className="mr-3 h-7 w-7 text-primary" />
                <div>
                  <CardTitle className="text-2xl font-bold font-headline">Team Management</CardTitle>
                  <CardDescription>Manage roles, teams, and access for your team members.</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
                {/* Search Filter */}
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name, email, role or team..."
                    className="w-full pl-9 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search team members"
                  />
                </div>
                {/* Role Filter */}
                <select
                  className="border rounded px-2 py-1 text-sm bg-background"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  aria-label="Filter by role"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="closer">Closer</option>
                  <option value="user">User</option>
                </select>
                {/* Team Filter */}
                <select
                  className="border rounded px-2 py-1 text-sm bg-background"
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  aria-label="Filter by team"
                >
                  <option value="">All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {searchQuery.trim() !== '' ? "No matching team members found." : "No team members found."}
              </p>
            ) : (
              <ul className="divide-y divide-border team-member-list">
                {filteredUsers.map((teamMember) => (
                  <li
                    key={teamMember.uid}
                    className={`py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full ${teamMember.uid === managerUser?.uid ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative group">
                        <Avatar 
                          className={`h-10 w-10 border cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary hover:ring-offset-2 ${teamMember.uid === managerUser?.uid ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                          onClick={() => setSelectedUserForAvatar(teamMember)}
                          tabIndex={0}
                          aria-label={`Edit avatar for ${teamMember.displayName || teamMember.email}`}
                        >
                          <AvatarImage src={teamMember.avatarUrl || undefined} alt={teamMember.displayName || teamMember.email || "User"} />
                          <AvatarFallback>
                            {teamMember.displayName ? teamMember.displayName.substring(0, 2).toUpperCase() : (teamMember.email ? teamMember.email.substring(0, 2).toUpperCase() : "??")}
                          </AvatarFallback>
                        </Avatar>
                        {/* Camera overlay on hover */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                             onClick={() => setSelectedUserForAvatar(teamMember)}>
                          <Camera className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="font-semibold">{teamMember.displayName || teamMember.email || "Unnamed User"}</p>
                          {teamMember.uid === managerUser?.uid && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">You</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{teamMember.email}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${teamMember.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : teamMember.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : teamMember.role === 'closer' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}>{teamMember.role}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                            <Building2 className="mr-1 h-3 w-3" />{teams.find(t => t.id === teamMember.teamId)?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Responsive action buttons: stack vertically on mobile, row on desktop */}
                    <div className="flex flex-col xs:flex-row gap-2 w-full xs:w-auto team-management-actions">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" aria-label="User actions">
                            Actions <ChevronDown className="ml-1.5 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedUserForRoleChange(teamMember)} aria-label="Change role">
                            <UserCog className="mr-2 h-4 w-4" /> Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedUserForDelete(teamMember)} disabled={(teamMember.role === "manager" || teamMember.role === "admin") || teamMember.uid === managerUser?.uid} aria-label="Delete user">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild disabled>
                            <span className="flex items-center text-xs text-muted-foreground">
                              <Building2 className="mr-2 h-4 w-4" />
                              Change Team (use badge above)
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedUserForRoleChange && (
        <ChangeUserRoleModal
          userToEdit={selectedUserForRoleChange}
          isOpen={!!selectedUserForRoleChange}
          onClose={() => setSelectedUserForRoleChange(null)}
          managerTeamId={managerUser.teamId}
        />
      )}

      {selectedUserForDelete && (
        <ConfirmUserDeleteModal
          userToDelete={selectedUserForDelete}
          isOpen={!!selectedUserForDelete}
          onClose={() => setSelectedUserForDelete(null)}
          onConfirmDelete={() => handleDeleteUser(selectedUserForDelete)}
        />
      )}

      {selectedUserForAvatar && (
        <UploadAvatarModal
          user={selectedUserForAvatar}
          isOpen={!!selectedUserForAvatar}
          onClose={() => setSelectedUserForAvatar(null)}
        />
      )}
    </>
  );
}


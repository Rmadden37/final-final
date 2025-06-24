"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UserPlus, Loader2, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { inviteUserFunction , db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  displayName: z.string().min(2, "Name must be at least 2 characters").optional().or(z.literal("")),
  phoneNumber: z.string().min(10, "Please enter a valid phone number").optional().or(z.literal("")),
  tempPassword: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["setter", "closer", "manager"], {
    required_error: "Please select a role",
  }),
  teamId: z.string().min(1, "Please select a team"),
});

type InviteUserFormData = z.infer<typeof inviteUserSchema>;

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface InviteNewUserButtonProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "primary-solid" | "outline" | "ghost";
}

export default function InviteNewUserButton({ 
  className = "", 
  size = "sm",
  variant = "primary-solid" 
}: InviteNewUserButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load teams
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      setTeams(teamsData.filter(team => team.isActive));
      setLoadingTeams(false);
    }, (error) => {
      console.error("Error loading teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams.",
        variant: "destructive",
      });
      setLoadingTeams(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      displayName: "",
      phoneNumber: "",
      tempPassword: "",
      role: undefined,
      teamId: user?.teamId || "", // Default to current user's team
    },
  });

  // Reset form when modal closes
  const handleModalClose = () => {
    if (!isSubmitting) {
      form.reset();
      setIsModalOpen(false);
    }
  };

  const onSubmit = async (data: InviteUserFormData) => {
    setIsSubmitting(true);
    
    // Debug logging
    console.log("Submitting invite user form with data:", {
      email: data.email,
      displayName: data.displayName,
      phoneNumber: data.phoneNumber,
      role: data.role,
      tempPasswordLength: data.tempPassword?.length
    });
    
    try {
      // Additional client-side validation
      if (!data.email.trim()) {
        throw new Error("Email address is required");
      }
      
      if (!data.tempPassword.trim()) {
        throw new Error("Temporary password is required");
      }
      
      if (!data.role) {
        throw new Error("Role selection is required");
      }

      console.log("Calling inviteUserFunction...");
      const result = await inviteUserFunction({
        email: data.email.trim(),
        displayName: data.displayName?.trim() || undefined,
        phoneNumber: data.phoneNumber?.trim() || undefined,
        tempPassword: data.tempPassword,
        role: data.role,
        teamId: data.teamId,
      });

      console.log("inviteUserFunction result:", result);
      const responseData = result.data as { success?: boolean; message?: string };
      
      if (responseData?.success) {
        toast({
          title: "Invitation Sent! ✉️",
          description: responseData.message || "User invitation sent successfully",
          duration: 5000,
        });
        
        handleModalClose();
      } else {
        throw new Error("Invitation failed");
      }
    } catch (error: any) {
      console.error("Invite user error:", error);
      
      let errorMessage = "Failed to send invitation. Please try again.";
      
      // Handle Firebase function errors
      if (error?.code === "functions/already-exists") {
        errorMessage = "This user is already a member of your team.";
      } else if (error?.code === "functions/failed-precondition") {
        errorMessage = error.message || "User is already a member of another team.";
      } else if (error?.code === "functions/invalid-argument") {
        errorMessage = error.message || "Invalid invitation data provided.";
      } else if (error?.code === "functions/permission-denied") {
        errorMessage = "You don't have permission to invite users.";
      } else if (error?.code === "functions/unauthenticated") {
        errorMessage = "Authentication required. Please log in and try again.";
      } else if (error?.code === "functions/not-found") {
        errorMessage = "User profile not found. Please contact support.";
      } else if (error?.code === "functions/internal") {
        // Use the specific error message from the backend
        errorMessage = error.message || "Internal server error. Please try again.";
      } else if (error?.code === "functions/unavailable") {
        errorMessage = "Service temporarily unavailable. Please try again later.";
      } else if (error?.message) {
        // Fallback to the error message if available
        errorMessage = error.message;
      }
      
      toast({
        title: "Invitation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant={variant}
        size={size}
        className={className}
      >
        <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        <span className="hidden md:inline">Invite New User</span>
        <span className="md:hidden">Invite</span>
      </Button>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite New Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to add a new member to your team. They will receive
              their login credentials and can start using the system immediately.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="user@company.com"
                        type="email"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe (optional)"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(555) 123-4567 (optional)"
                        type="tel"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tempPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary Password *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter temporary password"
                        type="password"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Minimum 6 characters. User will be able to change this password after first login.
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role for this user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="setter">
                          <div className="flex flex-col">
                            <span className="font-medium">Setter</span>
                            <span className="text-xs text-muted-foreground">
                              Can create and manage leads
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="closer">
                          <div className="flex flex-col">
                            <span className="font-medium">Closer</span>
                            <span className="text-xs text-muted-foreground">
                              Can accept and process assigned leads
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="manager">
                          <div className="flex flex-col">
                            <span className="font-medium">Manager</span>
                            <span className="text-xs text-muted-foreground">
                              Full access to team management
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || loadingTeams}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{team.name}</span>
                                {team.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {team.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {loadingTeams && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading teams...
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

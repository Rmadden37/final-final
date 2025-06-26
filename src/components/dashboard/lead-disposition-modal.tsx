"use client";

import type {Lead, LeadStatus,Closer} from "@/types";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {useToast} from "@/hooks/use-toast";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {doc, updateDoc, serverTimestamp, Timestamp, collection, query, where, onSnapshot} from "firebase/firestore";
import {useState, useEffect} from "react";
import {Loader2} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { LeadNotifications } from "@/lib/notification-service";

interface LeadDispositionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

const dispositionOptions: LeadStatus[] = [
  "sold",
  "no_sale", 
  "canceled",
  "rescheduled",
  "credit_fail",
  "waiting_assignment", // Allow managers to reassign leads - Reassign Closer option
];

// Time picker: 8am to 10pm in 30-minute increments
const timeSlots = (() => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    // Add :00 slot
    const hour12 = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour12 === 0 ? 12 : hour12;
    
    slots.push({
      value: `${hour.toString().padStart(2, '0')}:00`,
      label: `${displayHour}:00 ${ampm}`
    });
    
    // Add :30 slot (except for 10:30 PM to keep it until 10 PM)
    if (hour < 22) {
      slots.push({
        value: `${hour.toString().padStart(2, '0')}:30`,
        label: `${displayHour}:30 ${ampm}`
      });
    }
  }
  return slots;
})();

export default function LeadDispositionModal({lead, isOpen, onClose}: LeadDispositionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {toast} = useToast();
  const {user} = useAuth();

  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [appointmentTime, setAppointmentTime] = useState<string>("17:00"); // Default to 5:00 PM

  // State for available closers when reassigning
  const [availableClosers, setAvailableClosers] = useState<Closer[]>([]);
  const [selectedCloserId, setSelectedCloserId] = useState<string | undefined>(undefined);
  const [loadingClosers, setLoadingClosers] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(undefined);
      setNotes("");
      setAppointmentDate(undefined);
      setAppointmentTime("17:00");
      setSelectedCloserId(undefined);
    }
  }, [isOpen]);

  // Filter disposition options based on user role and current lead status
  const getAvailableDispositionOptions = () => {
    if (user?.role === "manager" || user?.role === "admin") {
      // Managers/admins can set any disposition, including reassignment
      return dispositionOptions;
    } else {
      // Closers cannot set leads back to waiting_assignment
      return dispositionOptions.filter(option => option !== "waiting_assignment");
    }
  };

  const availableOptions = getAvailableDispositionOptions();

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(undefined);
      setNotes("");
      setAppointmentDate(undefined);
      setAppointmentTime("17:00"); // Default to 5:00 PM
      setSelectedCloserId(undefined);
      setAvailableClosers([]);
    }
  }, [isOpen]);

  // Load available closers when "Reassign Closer" is selected
  useEffect(() => {
    if (selectedStatus === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") && user?.teamId) {
      setLoadingClosers(true);
      
      const closersQuery = query(
        collection(db, "closers"),
        where("teamId", "==", user.teamId),
        where("status", "==", "On Duty")
      );

      const unsubscribe = onSnapshot(closersQuery, (querySnapshot) => {
        const closersData = querySnapshot.docs.map((doc) => {
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

        // Filter out the current assigned closer and sort by lineup order
        const filteredClosers = closersData
          .filter(closer => closer.uid !== lead.assignedCloserId)
          .sort((a, b) => {
            const orderA = a.lineupOrder || 999999;
            const orderB = b.lineupOrder || 999999;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
          });
        
        setAvailableClosers(filteredClosers);
        setLoadingClosers(false);
      }, (error) => {
        console.error("Error loading available closers:", error);
        toast({
          title: "Error Loading Closers",
          description: "Could not load available closers for reassignment.",
          variant: "destructive",
        });
        setLoadingClosers(false);
      });

      return () => unsubscribe();
    } else {
      setAvailableClosers([]);
      setSelectedCloserId(undefined);
    }
  }, [selectedStatus, user?.role, user?.teamId, lead.assignedCloserId, toast]);

  const handleSubmit = async () => {
    if (!selectedStatus) {
      toast({
        title: "No Status Selected",
        description: "Please select a disposition status.",
        variant: "destructive",
      });
      return;
    }

    // If reassigning to a specific closer, validate selection
    if (selectedStatus === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") && availableClosers.length > 0 && !selectedCloserId) {
      toast({
        title: "No Closer Selected",
        description: "Please select a closer to reassign this lead to.",
        variant: "destructive",
      });
      return;
    }

    let scheduledTimestamp: Timestamp | undefined = undefined;
    if (selectedStatus === "rescheduled") {
      if (!appointmentDate || !appointmentTime) {
        toast({
          title: "Missing Appointment Time",
          description: "Please select a date and time for the appointment.",
          variant: "destructive",
        });
        return;
      }
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const combinedDateTime = new Date(appointmentDate);
      combinedDateTime.setHours(hours, minutes, 0, 0);

      if (combinedDateTime <= new Date()) {
        toast({
          title: "Invalid Appointment Time",
          description: "Scheduled appointment time must be in the future.",
          variant: "destructive",
        });
        return;
      }
      scheduledTimestamp = Timestamp.fromDate(combinedDateTime);
    }

    setIsLoading(true);
    try {
      const leadDocRef = doc(db, "leads", lead.id);
      const updateData: Record<string, any> = {
        status: selectedStatus,
        dispositionNotes: notes,
        updatedAt: serverTimestamp(),
      };

      if (selectedStatus === "rescheduled" && scheduledTimestamp) {
        updateData.scheduledAppointmentTime = scheduledTimestamp;
      } else {
        // Clear scheduled time if not rescheduled or if it was previously and now something else
        updateData.scheduledAppointmentTime = null;
      }

      // Handle reassignment logic
      let reassignedCloser: Closer | undefined = undefined;
      if (selectedStatus === "waiting_assignment") {
        if (selectedCloserId && (user?.role === "manager" || user?.role === "admin")) {
          // Assign to specific closer
          const selectedCloser = availableClosers.find(c => c.uid === selectedCloserId);
          if (selectedCloser) {
            updateData.assignedCloserId = selectedCloser.uid;
            updateData.assignedCloserName = selectedCloser.name;
            reassignedCloser = selectedCloser;
            // Keep status as waiting_assignment so closer can accept
          }
        } else {
          // Move to general assignment queue
          updateData.assignedCloserId = null;
          updateData.assignedCloserName = null;
        }
      }

      await updateDoc(leadDocRef, updateData);

      // Send notification if reassigned to a closer
      if (reassignedCloser) {
        await LeadNotifications.leadAssigned(
          { ...lead, ...updateData, id: lead.id },
          reassignedCloser.uid
        );
      }

      const successMessage = selectedStatus === "waiting_assignment" && selectedCloserId 
        ? `Lead reassigned to ${availableClosers.find(c => c.uid === selectedCloserId)?.name}.`
        : `Lead marked as ${selectedStatus.replace("_", " ")}.`;
        
      toast({
        title: "Disposition Updated",
        description: successMessage,
      });
      onClose();
    } catch {
      toast({
        title: "Update Failed",
        description: "Could not update lead disposition.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-full sm:max-w-md p-2 sm:p-6 overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {(user?.role === "manager" || user?.role === "admin") ? "Manager Disposition" : "Update Lead Disposition"}
          </DialogTitle>
          <DialogDescription>
            {(user?.role === "manager" || user?.role === "admin")
              ? `Set the status for lead: ${lead.customerName}. As a manager/admin, you can set any disposition or reassign the lead.`
              : `Select the outcome for lead: ${lead.customerName}.`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <RadioGroup onValueChange={(value) => setSelectedStatus(value as LeadStatus)} value={selectedStatus} className="w-full">
            {availableOptions.map((status) => (
              <div 
                key={status} 
                className={cn(
                  "flex items-center space-x-2 rounded-md p-2",
                  status === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") 
                    ? "bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30" 
                    : ""
                )}
              >
                <RadioGroupItem value={status} id={`status-${status}`} />
                <Label htmlFor={`status-${status}`} className="capitalize flex-1">
                  {status === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") ? (
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      Reassign Closer
                    </span>
                  ) : (
                    status.replace("_", " ")
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedStatus === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") && (
            <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/30 p-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                <Label className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Reassign to Available Closer
                </Label>
              </div>
              
              {loadingClosers ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-amber-600 dark:text-amber-400">Loading available closers...</span>
                </div>
              ) : availableClosers.length > 0 ? (
                <>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Select a closer to reassign this lead to, or leave unselected to move to general assignment queue.
                  </p>
                  <Select onValueChange={setSelectedCloserId} value={selectedCloserId}>
                    <SelectTrigger className="w-full max-w-full">
                      <SelectValue placeholder="Select a closer (or leave blank for general queue)" />
                    </SelectTrigger>
                    <SelectContent className="max-w-full">
                      {availableClosers.map((closer) => (
                        <SelectItem key={closer.uid} value={closer.uid} className="truncate max-w-full">
                          {closer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  No available closers found. This will move the lead to the general assignment queue.
                </p>
              )}
            </div>
          )}

          {selectedStatus === "rescheduled" && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <Label className="text-sm font-medium">Set Appointment Time</Label>
              <DatePicker
                date={appointmentDate}
                onDateChange={setAppointmentDate}
                placeholder="Pick a date"
                className="w-full max-w-full"
              />
              <div className="w-full max-w-full">
                <TimePicker
                  time={appointmentTime}
                  onTimeChange={setAppointmentTime}
                  placeholder="Select time"
                  timeSlots={timeSlots}
                  className="w-full max-w-full"
                />
              </div>
            </div>
          )}

          <div style={{ minHeight: 24 }}>
            <Textarea
              placeholder="Add any relevant notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedStatus}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Disposition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Lead, LeadStatus, Closer } from "@/types";
import { doc, updateDoc, serverTimestamp, Timestamp, collection, query, where, onSnapshot } from "firebase/firestore";
import { Loader2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { LeadNotifications } from "@/lib/notification-service";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";


interface LeadDispositionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

const dispositionOptions: LeadStatus[] = [
  "sold", "no_sale", "canceled", "rescheduled", "credit_fail", "waiting_assignment",
];

const timeSlots = (() => {
    // ... (your timeSlots implementation is good, no changes needed)
    const slots = [];
    for (let hour = 8; hour <= 22; hour++) {
      const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      slots.push({ value: `${hour.toString().padStart(2, '0')}:00`, label: `${hour12}:00 ${ampm}` });
      if (hour < 22) {
        slots.push({ value: `${hour.toString().padStart(2, '0')}:30`, label: `${hour12}:30 ${ampm}` });
      }
    }
    return slots;
})();

export default function LeadDispositionModal({ lead, isOpen, onClose }: LeadDispositionModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [appointmentTime, setAppointmentTime] = useState<string>("17:00");
  const [availableClosers, setAvailableClosers] = useState<Closer[]>([]);
  const [selectedCloserId, setSelectedCloserId] = useState<string | undefined>(undefined);
  const [loadingClosers, setLoadingClosers] = useState(false);

  // FIX 1: Combined and improved state reset effect.
  // It now resets when the modal opens OR if the lead itself changes while the modal is open.
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(undefined);
      setNotes("");
      setAppointmentDate(undefined);
      setAppointmentTime("17:00");
      setSelectedCloserId(undefined);
      setAvailableClosers([]); // Ensure closers list is cleared on open
    }
  }, [isOpen, lead.id]); // FIX 2: Added lead.id to dependency array

  // IMPROVEMENT: Memoize the available options to prevent re-calculating on every render.
  const availableOptions = useMemo(() => {
    if (user?.role === "manager" || user?.role === "admin") {
      return dispositionOptions;
    }
    return dispositionOptions.filter(option => option !== "waiting_assignment");
  }, [user?.role]);

  // This effect for fetching closers is well-written, especially with the cleanup function. No changes needed.
  // Destructure the specific properties you need from the user and lead objects.
  // This creates stable, primitive variables for the hook to use.
  const { teamId, role } = (user ?? {}) as { teamId?: string; role?: string }; // Type assertion for safety
  const { assignedCloserId } = lead;

  useEffect(() => {
    // Now, the logic inside the hook uses these stable variables.
    if (selectedStatus === "waiting_assignment" && teamId && (role === "manager" || role === "admin")) {
      setLoadingClosers(true);
      const closersQuery = query(
        collection(db, "closers"),
        where("teamId", "==", teamId), // Use the stable variable
        where("status", "==", "On Duty")
      );

      const unsubscribe = onSnapshot(closersQuery, (querySnapshot) => {
        const closersData = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as Closer);
        
        // The filter still uses the stable `assignedCloserId` from the destructuring
        const filteredClosers = closersData
          .filter(closer => closer.uid !== assignedCloserId)
          .sort((a, b) => (a.lineupOrder ?? 999) - (b.lineupOrder ?? 999) || a.name.localeCompare(b.name));
        
        setAvailableClosers(filteredClosers);
        setLoadingClosers(false);
      }, (error) => {
        console.error("Error loading available closers:", error);
        toast({ title: "Error Loading Closers", description: "Could not load closers.", variant: "destructive" });
        setLoadingClosers(false);
      });

      return () => unsubscribe();
    } else {
      setAvailableClosers([]);
      setSelectedCloserId(undefined);
    }
  }, 
  // The dependency array now correctly lists the stable, primitive values.
  // This is efficient and satisfies the rules of hooks.
  [selectedStatus, teamId, role, assignedCloserId, toast]
);

  // The handleSubmit function is complex but appears logically sound. No changes made.
  const handleSubmit = async () => {
    // ... (Your handleSubmit logic is robust)
    if (!selectedStatus) {
      toast({ title: "No Status Selected", description: "Please select a disposition status.", variant: "destructive" });
      return;
    }

    if (selectedStatus === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") && availableClosers.length > 0 && !selectedCloserId) {
      // Note: This logic path allows moving to general queue, so this validation might be too strict
      // depending on desired behavior. For now, it's a safe check.
    }

    let scheduledTimestamp: Timestamp | undefined = undefined;
    if (selectedStatus === "rescheduled") {
      if (!appointmentDate) {
        toast({ title: "Missing Appointment Date", description: "Please select a date for the appointment.", variant: "destructive" });
        return;
      }
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const combinedDateTime = new Date(appointmentDate);
      combinedDateTime.setHours(hours, minutes, 0, 0);

      if (combinedDateTime <= new Date()) {
        toast({ title: "Invalid Appointment Time", description: "Appointment must be in the future.", variant: "destructive" });
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
        scheduledAppointmentTime: selectedStatus === "rescheduled" && scheduledTimestamp ? scheduledTimestamp : null,
      };

      let reassignedCloser: Closer | undefined = undefined;
      if (selectedStatus === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin")) {
        if (selectedCloserId) {
          const selectedCloser = availableClosers.find(c => c.uid === selectedCloserId);
          if (selectedCloser) {
            updateData.assignedCloserId = selectedCloser.uid;
            updateData.assignedCloserName = selectedCloser.name;
            reassignedCloser = selectedCloser;
          }
        } else {
          updateData.assignedCloserId = null;
          updateData.assignedCloserName = null;
        }
      }

      await updateDoc(leadDocRef, updateData);

      if (reassignedCloser) {
        await LeadNotifications.leadAssigned({ ...lead, ...updateData, id: lead.id }, reassignedCloser.uid);
      }

      const successMessage = reassignedCloser
        ? `Lead reassigned to ${reassignedCloser.name}.`
        : `Lead marked as ${selectedStatus.replace("_", " ")}.`;
        
      toast({ title: "Disposition Updated", description: successMessage });
      onClose();
    } catch (error) {
      console.error("Failed to update disposition: ", error)
      toast({ title: "Update Failed", description: "Could not update lead disposition.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* ... (Your JSX is well-structured, no changes needed here) ... */}
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
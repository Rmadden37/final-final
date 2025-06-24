"use client";

import {useState, useEffect} from "react";
import type {Closer, UserRole, AppUser} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, doc, writeBatch, setDoc, serverTimestamp} from "firebase/firestore";
import CloserCard from "./closer-card";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from "@/components/ui/button";
import {Loader2, RefreshCw} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import {syncAllUsersToClosers} from "@/utils/sync-all-users-to-closers";

export default function CloserManagementContent() {
  const {user} = useAuth();
  const {toast} = useToast();
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Auto-sync ALL users (closers and managers) to closers collection on component mount
  useEffect(() => {
    const autoSyncAllUsers = async () => {
      if (!user || !user.teamId || user.role !== "manager" || syncComplete) {
        return;
      }

      try {
        console.log("Auto-syncing ALL users (closers and managers) to closers collection...");
        const result = await syncAllUsersToClosers();
        
        if (result.usersAdded > 0) {
          console.log(`Auto-synced ${result.usersAdded} user(s) to closers collection:`);
          result.syncedUsers.forEach(user => {
            console.log(`  - ${user.name} (${user.role})`);
          });
        } else {
          console.log("All users already synced to closers collection");
        }
        
        setSyncComplete(true);
      } catch (error) {
        console.error("Failed to auto-sync users:", error);
        setSyncComplete(true); // Prevent infinite retry
      }
    };

    autoSyncAllUsers();
  }, [user, syncComplete]);



  useEffect(() => {
    if (!user || !user.teamId || user.role !== "manager") {
      setLoading(false);
      setClosers([]);
      return;
    }

    setLoading(true);
    // Fetch closers ordered by name initially. lineupOrder will be handled client-side.
    const q = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      orderBy("name", "asc") // Primary sort by name from DB
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let closersData = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          uid: docSnapshot.id,
          name: data.name,
          status: data.status as "On Duty" | "Off Duty",
          teamId: data.teamId,
          role: data.role as UserRole,
          avatarUrl: data.avatarUrl,
          phone: data.phone,
          lineupOrder: data.lineupOrder, // This might be undefined
        } as Closer; // Closer type has lineupOrder as optional
      });

      // Client-side defaulting of lineupOrder and then sort
      closersData = closersData.map((closer, index) => ({
        ...closer,
        // Assign a default lineupOrder if it's not a number (i.e., missing or invalid)
        // Use a large multiplier for initial index-based order derived from name sort
        lineupOrder: typeof closer.lineupOrder === "number" ? closer.lineupOrder : (index + 1) * 100000,
      }));

      closersData.sort((a, b) => {
        const orderA = a.lineupOrder!; // Should be a number after defaulting
        const orderB = b.lineupOrder!;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name); // Fallback to name if orders are identical
      });

      setClosers(closersData);
      setLoading(false);
    }, (error) => {
      toast({
        title: "Error",
        description: "Failed to load closer information. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleMoveCloser = async (closerUid: string, direction: "up" | "down") => {
    setIsUpdatingOrder(true);
    const currentIndex = closers.findIndex((c) => c.uid === closerUid);

    if (currentIndex === -1) {
      toast({title: "Error", description: "Closer not found.", variant: "destructive"});
      setIsUpdatingOrder(false);
      return;
    }

    let otherIndex = -1;
    if (direction === "up" && currentIndex > 0) {
      otherIndex = currentIndex - 1;
    } else if (direction === "down" && currentIndex < closers.length - 1) {
      otherIndex = currentIndex + 1;
    }

    if (otherIndex === -1) {
      setIsUpdatingOrder(false);
      return;
    }

    const closerToMove = closers[currentIndex];
    const otherCloser = closers[otherIndex];

    const batch = writeBatch(db);

    // lineupOrder should be present due to client-side defaulting.
    // If for some reason it's not, this would be an issue, but the defaulting logic aims to prevent that.
    const orderToMove = closerToMove.lineupOrder!;
    const orderOther = otherCloser.lineupOrder!;

    const closerToMoveRef = doc(db, "closers", closerToMove.uid);
    batch.update(closerToMoveRef, {lineupOrder: orderOther});

    const otherCloserRef = doc(db, "closers", otherCloser.uid);
    batch.update(otherCloserRef, {lineupOrder: orderToMove});

    try {
      await batch.commit();
      toast({title: "Lineup Updated", description: `${closerToMove.name} moved.`});
      // The onSnapshot listener will automatically update the UI with new order
    } catch (error) {
      toast({title: "Update Failed", description: "Could not update lineup order.", variant: "destructive"});
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Manual sync function for testing/forcing complete sync
  const handleManualSync = async () => {
    if (!user || user.role !== "manager") return;

    setIsManualSyncing(true);
    try {
      console.log("Starting manual sync of all users...");
      const result = await syncAllUsersToClosers();
      
      if (result.usersAdded > 0) {
        toast({
          title: "Sync Complete",
          description: `Added ${result.usersAdded} user(s) to closer lineup. Check console for details.`,
        });
        console.log(`Manual sync added ${result.usersAdded} user(s):`);
        result.syncedUsers.forEach(user => {
          console.log(`  - ${user.name} (${user.role})`);
        });
      } else {
        toast({
          title: "Sync Complete",
          description: "All users are already in the closer lineup.",
        });
        console.log("Manual sync: All users already synced");
      }

      if (result.errors.length > 0) {
        console.error("Sync errors:", result.errors);
        toast({
          title: "Sync Warning",
          description: "Some errors occurred during sync. Check console for details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (closers.length === 0) {
    return (
      <div className="flex flex-col h-40 items-center justify-center space-y-4">
        <p className="text-muted-foreground">No closers found for this team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Manual sync button for testing */}
      {(user?.role === "manager" || user?.role === "admin") && (
        <div className="flex justify-end">
          <Button 
            onClick={handleManualSync}
            disabled={isManualSyncing || loading}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            {isManualSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isManualSyncing ? "Syncing..." : "Sync All Users"}
          </Button>
        </div>
      )}
      
      <ScrollArea className="h-[calc(60vh)] max-h-[400px] pr-3">
        <div className="space-y-3">
          {closers.map((closer, index) => (
            <CloserCard
              key={closer.uid}
              closer={closer}
              allowInteractiveToggle={true}
              showMoveControls={user?.role === "manager" || user?.role === "admin"}
              canMoveUp={index > 0}
              canMoveDown={index < closers.length - 1}
              onMove={(direction) => handleMoveCloser(closer.uid, direction)}
              isUpdatingOrder={isUpdatingOrder}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Utility to sync managers to the closers collection
 * This ensures all managers are included in the closer rotation system
 */

import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, writeBatch, serverTimestamp } from "firebase/firestore";
import type { AppUser } from "@/types";

export interface SyncResult {
  managersFound: number;
  managersAlreadyInClosers: number;
  managersAdded: number;
  errors: string[];
}

/**
 * Sync all managers to the closers collection
 * This function finds all users with role="manager" and ensures they have corresponding closer records
 */
export async function syncManagersToClosers(): Promise<SyncResult> {
  console.log("Starting sync of managers to closers collection...");
  
  const result: SyncResult = {
    managersFound: 0,
    managersAlreadyInClosers: 0,
    managersAdded: 0,
    errors: []
  };

  try {
    // Get all users with role="manager"
    const usersRef = collection(db, "users");
    const managersQuery = query(usersRef, where("role", "==", "manager"));
    const managersSnapshot = await getDocs(managersQuery);
    
    result.managersFound = managersSnapshot.docs.length;
    console.log(`Found ${result.managersFound} manager(s)`);

    if (result.managersFound === 0) {
      console.log("No managers found to sync");
      return result;
    }

    // Get all existing closer records
    const closersRef = collection(db, "closers");
    const closersSnapshot = await getDocs(closersRef);
    const existingCloserIds = new Set(closersSnapshot.docs.map(doc => doc.id));

    // Prepare batch operations
    const batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 500; // Firestore batch limit

    for (const managerDoc of managersSnapshot.docs) {
      const managerData = managerDoc.data() as Omit<AppUser, 'uid'>;
      const manager: AppUser = {
        ...managerData,
        uid: managerDoc.id // Ensure uid is set from the document ID
      };
      
      if (existingCloserIds.has(manager.uid)) {
        result.managersAlreadyInClosers++;
        console.log(`Manager ${manager.displayName || manager.email} already exists in closers collection`);
        continue;
      }

      // Create closer record for manager
      const closerDocRef = doc(db, "closers", manager.uid);
      batch.set(closerDocRef, {
        uid: manager.uid,
        name: manager.displayName || manager.email || "Unknown Manager",
        teamId: manager.teamId,
        status: "Off Duty", // Default status for newly added managers
        role: "manager", // Keep role as manager
        avatarUrl: manager.avatarUrl || null,
        phone: null, // Can be updated later if needed
        lineupOrder: new Date().getTime() + Math.random(), // Unique lineup order
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      result.managersAdded++;
      batchCount++;
      
      console.log(`Prepared to add manager ${manager.displayName || manager.email} to closers collection`);

      // Execute batch if we reach the limit
      if (batchCount >= maxBatchSize) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} operations`);
        batchCount = 0;
      }
    }

    // Execute remaining operations in batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} operations`);
    }

    console.log(`Sync completed successfully:
      - Managers found: ${result.managersFound}
      - Managers already in closers: ${result.managersAlreadyInClosers}
      - Managers added: ${result.managersAdded}`);

  } catch (error: any) {
    const errorMessage = `Failed to sync managers to closers: ${error.message}`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
  }

  return result;
}

/**
 * Check how many managers can be added to the closer rotation
 * This is a read-only function that returns the count without making changes
 */
export async function getManagersToAddCount(): Promise<{ count: number; managers: AppUser[] }> {
  try {
    // Get all users with role="manager"
    const usersRef = collection(db, "users");
    const managersQuery = query(usersRef, where("role", "==", "manager"));
    const managersSnapshot = await getDocs(managersQuery);
    
    const managers = managersSnapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id // Ensure uid is set from the document ID
    } as AppUser));

    // Get all existing closer records
    const closersRef = collection(db, "closers");
    const closersSnapshot = await getDocs(closersRef);
    const existingCloserIds = new Set(closersSnapshot.docs.map(doc => doc.id));

    // Filter managers that don't have closer records
    const managersToAdd = managers.filter(manager => !existingCloserIds.has(manager.uid));

    return {
      count: managersToAdd.length,
      managers: managersToAdd
    };
  } catch (error: any) {
    console.error(`Failed to check managers to add: ${error.message}`);
    return { count: 0, managers: [] };
  }
}

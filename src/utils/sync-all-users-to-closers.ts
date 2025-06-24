/**
 * Utility to sync ALL users (closers and managers) to the closers collection
 * This ensures everyone who should be in the closer rotation is included
 */

import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, writeBatch, serverTimestamp, orderBy } from "firebase/firestore";
import type { AppUser } from "@/types";

export interface CompleteSyncResult {
  usersFound: number;
  usersAlreadyInClosers: number;
  usersAdded: number;
  errors: string[];
  syncedUsers: Array<{name: string; role: string; uid: string}>;
}

/**
 * Sync ALL users with role="closer" or role="manager" to the closers collection
 * This function ensures complete coverage of all people who should be in the closer rotation
 */
export async function syncAllUsersToClosers(): Promise<CompleteSyncResult> {
  console.log("Starting complete sync of ALL users to closers collection...");
  
  const result: CompleteSyncResult = {
    usersFound: 0,
    usersAlreadyInClosers: 0,
    usersAdded: 0,
    errors: [],
    syncedUsers: []
  };

  try {
    // Get ALL users (we'll filter by role)
    const usersRef = collection(db, "users");
    const allUsersSnapshot = await getDocs(usersRef);
    
    // Filter for closers and managers
    const relevantUsers = allUsersSnapshot.docs
      .map(doc => ({
        ...doc.data(),
        uid: doc.id
      } as AppUser))
      .filter(user => user.role === "closer" || user.role === "manager" || user.role === "admin");
    
    result.usersFound = relevantUsers.length;
    console.log(`Found ${result.usersFound} user(s) with role "closer", "manager", or "admin"`);

    if (result.usersFound === 0) {
      console.log("No relevant users found to sync");
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

    // Get the highest existing lineup order to append new users at the end
    const existingClosers = closersSnapshot.docs.map(doc => doc.data());
    const maxLineupOrder = existingClosers.reduce((max, closer) => {
      const order = closer.lineupOrder || 0;
      return Math.max(max, order);
    }, 0);

    let nextLineupOrder = maxLineupOrder + 1000; // Start new users after existing ones

    for (const user of relevantUsers) {
      if (existingCloserIds.has(user.uid)) {
        result.usersAlreadyInClosers++;
        console.log(`User ${user.displayName || user.email} already exists in closers collection`);
        continue;
      }

      // Create closer record for user
      const closerDocRef = doc(db, "closers", user.uid);
      batch.set(closerDocRef, {
        uid: user.uid,
        name: user.displayName || user.email || "Unknown User",
        teamId: user.teamId,
        status: "Off Duty", // Default status for newly added users
        role: user.role, // Keep original role (closer or manager)
        avatarUrl: user.avatarUrl || null,
        phone: user.phoneNumber || null,
        lineupOrder: nextLineupOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      result.usersAdded++;
      result.syncedUsers.push({
        name: user.displayName || user.email || "Unknown User",
        role: user.role,
        uid: user.uid
      });
      
      batchCount++;
      nextLineupOrder += 1000; // Space out lineup orders
      
      console.log(`Prepared to add ${user.role} ${user.displayName || user.email} to closers collection`);

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

    console.log(`Complete sync finished successfully:
      - Users found (closers + managers): ${result.usersFound}
      - Users already in closers: ${result.usersAlreadyInClosers}
      - Users added: ${result.usersAdded}`);

    if (result.syncedUsers.length > 0) {
      console.log("Users added to closers collection:");
      result.syncedUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.role})`);
      });
    }

  } catch (error: any) {
    const errorMessage = `Failed to sync all users to closers: ${error.message}`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
  }

  return result;
}

/**
 * Get a list of all users who should be in closers but aren't
 */
export async function getMissingClosers(): Promise<{ missing: AppUser[]; existing: string[] }> {
  try {
    // Get all users with relevant roles
    const usersRef = collection(db, "users");
    const allUsersSnapshot = await getDocs(usersRef);
    
    const relevantUsers = allUsersSnapshot.docs
      .map(doc => ({
        ...doc.data(),
        uid: doc.id
      } as AppUser))
      .filter(user => user.role === "closer" || user.role === "manager" || user.role === "admin");

    // Get all existing closer records
    const closersRef = collection(db, "closers");
    const closersSnapshot = await getDocs(closersRef);
    const existingCloserIds = new Set(closersSnapshot.docs.map(doc => doc.id));

    // Find missing users
    const missingUsers = relevantUsers.filter(user => !existingCloserIds.has(user.uid));

    return {
      missing: missingUsers,
      existing: Array.from(existingCloserIds)
    };
  } catch (error: any) {
    console.error(`Failed to check missing closers: ${error.message}`);
    return { missing: [], existing: [] };
  }
}

/**
 * Fix Teams and Users Script
 * This script:
 * 1. Removes any duplicate teams 
 * 2. Assigns all users to Empire team
 * 3. Ensures team data integrity
 */

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  deleteDoc, 
  query,
  where
} from "firebase/firestore";
import { initializeTeams } from "./init-teams";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface User {
  uid: string;
  teamId?: string;
  role: string;
  [key: string]: any;
}

interface Closer {
  uid: string;
  teamId?: string;
  [key: string]: any;
}

export async function fixTeamsAndUsers(): Promise<{
  success: boolean;
  message: string;
  details: {
    duplicatesRemoved: number;
    usersMovedToEmpire: number;
    closersMovedToEmpire: number;
  };
}> {
  try {
    console.log("Starting teams and users fix...");

    // Step 1: Get all teams and identify duplicates
    const teamsSnapshot = await getDocs(collection(db, "teams"));
    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Team));

    console.log(`Found ${teams.length} teams:`, teams.map(t => `${t.name} (${t.id})`));

    // Find duplicate teams by name
    const teamsByName = new Map<string, Team[]>();
    teams.forEach(team => {
      const name = team.name.toLowerCase();
      if (!teamsByName.has(name)) {
        teamsByName.set(name, []);
      }
      teamsByName.get(name)!.push(team);
    });

    // Step 2: Remove duplicate teams (keep the first one for each name)
    let duplicatesRemoved = 0;
    const batch = writeBatch(db);

    for (const [name, teamList] of teamsByName) {
      if (teamList.length > 1) {
        console.log(`Found ${teamList.length} teams with name "${name}"`);
        // Keep the first team, delete the rest
        for (let i = 1; i < teamList.length; i++) {
          const duplicateTeam = teamList[i];
          console.log(`Marking duplicate team for deletion: ${duplicateTeam.name} (${duplicateTeam.id})`);
          batch.delete(doc(db, "teams", duplicateTeam.id));
          duplicatesRemoved++;
        }
      }
    }

    // Commit team deletions first
    if (duplicatesRemoved > 0) {
      await batch.commit();
      console.log(`Removed ${duplicatesRemoved} duplicate teams`);
    }

    // Step 3: Ensure Empire team exists
    await initializeTeams();

    // Step 4: Move all users to Empire team
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as User));

    const userBatch = writeBatch(db);
    let usersMovedToEmpire = 0;

    users.forEach(user => {
      if (user.teamId !== "empire") {
        console.log(`Moving user ${user.uid} to Empire team (was on ${user.teamId})`);
        const userRef = doc(db, "users", user.uid);
        userBatch.update(userRef, {
          teamId: "empire",
          updatedAt: new Date()
        });
        usersMovedToEmpire++;
      }
    });

    if (usersMovedToEmpire > 0) {
      await userBatch.commit();
      console.log(`Moved ${usersMovedToEmpire} users to Empire team`);
    }

    // Step 5: Move all closers to Empire team
    const closersSnapshot = await getDocs(collection(db, "closers"));
    const closers = closersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as Closer));

    const closerBatch = writeBatch(db);
    let closersMovedToEmpire = 0;

    closers.forEach(closer => {
      if (closer.teamId !== "empire") {
        console.log(`Moving closer ${closer.uid} to Empire team (was on ${closer.teamId})`);
        const closerRef = doc(db, "closers", closer.uid);
        closerBatch.update(closerRef, {
          teamId: "empire",
          updatedAt: new Date()
        });
        closersMovedToEmpire++;
      }
    });

    if (closersMovedToEmpire > 0) {
      await closerBatch.commit();
      console.log(`Moved ${closersMovedToEmpire} closers to Empire team`);
    }

    const result = {
      success: true,
      message: "Teams and users fixed successfully!",
      details: {
        duplicatesRemoved,
        usersMovedToEmpire,
        closersMovedToEmpire
      }
    };

    console.log("Fix completed:", result);
    return result;

  } catch (error) {
    console.error("Error fixing teams and users:", error);
    return {
      success: false,
      message: `Failed to fix teams and users: ${error}`,
      details: {
        duplicatesRemoved: 0,
        usersMovedToEmpire: 0,
        closersMovedToEmpire: 0
      }
    };
  }
}

/**
 * Check the current state of teams and users
 */
export async function checkTeamsAndUsersState(): Promise<{
  teams: Array<{ id: string; name: string; userCount: number; closerCount: number }>;
  totalUsers: number;
  totalClosers: number;
}> {
  try {
    // Get all teams
    const teamsSnapshot = await getDocs(collection(db, "teams"));
    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name
    }));

    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      teamId: doc.data().teamId
    }));

    // Get all closers
    const closersSnapshot = await getDocs(collection(db, "closers"));
    const closers = closersSnapshot.docs.map(doc => ({
      uid: doc.id,
      teamId: doc.data().teamId
    }));

    // Count users and closers per team
    const teamsWithCounts = teams.map(team => {
      const userCount = users.filter(u => u.teamId === team.id).length;
      const closerCount = closers.filter(c => c.teamId === team.id).length;
      return {
        id: team.id,
        name: team.name,
        userCount,
        closerCount
      };
    });

    return {
      teams: teamsWithCounts,
      totalUsers: users.length,
      totalClosers: closers.length
    };
  } catch (error) {
    console.error("Error checking teams and users state:", error);
    throw error;
  }
}

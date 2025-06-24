/**
 * Teams initialization utility
 * This script can be used to initialize the teams collection with default teams
 */

import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";

export interface Team {
  id: string;
  name: string;
  description: string;
  regionId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
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

const DEFAULT_TEAMS: Omit<Team, "createdAt" | "updatedAt">[] = [
  {
    id: "empire",
    name: "Empire",
    description: "Elite sales team for enterprise-level opportunities",
    regionId: "default",
    isActive: true,
    settings: {
      autoAssignment: true,
      maxLeadsPerCloser: 12,
      workingHours: {
        start: "07:00",
        end: "22:00",
        timezone: "America/Los_Angeles"
      }
    }
  }
];

/**
 * Initialize teams in the database
 * This function will create the default teams if they don't exist
 */
export async function initializeTeams(): Promise<void> {
  console.log("Initializing teams collection...");
  
  try {
    const teamsRef = collection(db, "teams");
    
    // Check which teams already exist
    const existingTeams = await getDocs(teamsRef);
    const existingTeamIds = new Set(existingTeams.docs.map(doc => doc.id));
    
    console.log(`Found ${existingTeams.size} existing teams: ${Array.from(existingTeamIds).join(', ')}`);
    
    // Create missing teams
    const promises = DEFAULT_TEAMS
      .filter(teamData => !existingTeamIds.has(teamData.id))
      .map(async (teamData) => {
        const teamDoc = doc(teamsRef, teamData.id);
        const teamWithTimestamps: Team = {
          ...teamData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await setDoc(teamDoc, teamWithTimestamps);
        console.log(`Created team: ${teamData.name} (${teamData.id})`);
      });
    
    if (promises.length === 0) {
      console.log("All default teams already exist. No action needed.");
    } else {
      await Promise.all(promises);
      console.log(`Created ${promises.length} new teams. Teams initialization completed successfully!`);
    }
    
  } catch (error) {
    console.error("Error initializing teams:", error);
    throw error;
  }
}

/**
 * Get all teams
 */
export async function getAllTeams(): Promise<Team[]> {
  try {
    const teamsRef = collection(db, "teams");
    const querySnapshot = await getDocs(teamsRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Team[];
  } catch (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }
}

/**
 * Check if teams are initialized
 */
export async function areTeamsInitialized(): Promise<boolean> {
  try {
    const teamsRef = collection(db, "teams");
    const querySnapshot = await getDocs(teamsRef);
    return querySnapshot.size > 0;
  } catch (error) {
    console.error("Error checking teams initialization:", error);
    return false;
  }
}

/**
 * Create a new team
 */
export async function createTeam(teamData: Omit<Team, "id" | "createdAt" | "updatedAt">): Promise<string> {
  try {
    const teamsRef = collection(db, "teams");
    const teamId = teamData.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const teamDoc = doc(teamsRef, teamId);
    
    const team: Team = {
      ...teamData,
      id: teamId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(teamDoc, team);
    console.log(`Created new team: ${teamData.name} (${teamId})`);
    
    return teamId;
  } catch (error) {
    console.error("Error creating team:", error);
    throw error;
  }
}

/**
 * Update team settings
 */
export async function updateTeam(teamId: string, updates: Partial<Omit<Team, "id" | "createdAt">>): Promise<void> {
  try {
    const teamDoc = doc(db, "teams", teamId);
    
    await setDoc(teamDoc, {
      ...updates,
      updatedAt: new Date()
    }, { merge: true });
    
    console.log(`Updated team: ${teamId}`);
  } catch (error) {
    console.error("Error updating team:", error);
    throw error;
  }
}

// Chat initialization utility for creating chat channels
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { ChatService } from "@/lib/chat-service";
import { getAllTeams } from "@/utils/init-teams";

export interface Region {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all regions from the database
 */
export async function getAllRegions(): Promise<Region[]> {
  try {
    const regionsRef = collection(db, "regions");
    const querySnapshot = await getDocs(regionsRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Region[];
  } catch (error) {
    console.error("Error fetching regions:", error);
    throw error;
  }
}

/**
 * Initialize chat channels for all active teams and regions
 * Creates both team-specific channels and regional channels
 */
export async function initializeChatChannels(): Promise<void> {
  console.log("Initializing chat channels...");
  
  try {
    // Get all regions and teams
    const regions = await getAllRegions();
    const teams = await getAllTeams();
    
    const activeRegions = regions.filter(region => region.isActive);
    const activeTeams = teams.filter(team => team.isActive);
    
    console.log(`Found ${activeRegions.length} active regions and ${activeTeams.length} active teams`);

    // Initialize channels using ChatService
    await ChatService.initializeChannels(activeRegions, activeTeams);
    
    console.log("Chat channels initialized successfully!");
  } catch (error) {
    console.error("Error initializing chat channels:", error);
    throw error;
  }
}

/**
 * Check if chat channels are initialized
 */
export async function areChatChannelsInitialized(): Promise<boolean> {
  try {
    const channelsRef = collection(db, "chatChannels");
    const snapshot = await getDocs(channelsRef);
    return snapshot.size > 0;
  } catch (error) {
    console.error("Error checking chat channels:", error);
    return false;
  }
}

/**
 * Setup chat cleanup Cloud Function trigger
 * This would typically be done in Firebase Functions
 */
export async function setupChatCleanup(): Promise<void> {
  // In a real implementation, this would set up a Cloud Function
  // that runs daily to clean up old messages
  console.log("Note: Chat cleanup should be implemented as a Cloud Function");
  console.log("Messages older than 7 days will be automatically deleted");
}

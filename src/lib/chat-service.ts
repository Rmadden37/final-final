// Chat service for Firebase operations
import { 
  collection, 
  doc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc,
  writeBatch,
  getDocs,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatMessage, ChatChannel } from "@/types";

export class ChatService {
  // Send a message to a chat channel
  static async sendMessage(
    content: string,
    senderId: string,
    senderName: string,
    senderRole: string,
    chatId: string,
    chatType: "team" | "region" | "bot",
    senderAvatar?: string,
    replyToId?: string,
    messageType: "text" | "emoji" | "sticker" | "gif" | "image" = "text",
    mediaUrl?: string,
    mediaMetadata?: {
      width?: number;
      height?: number;
      altText?: string;
      fileName?: string;
    }
  ): Promise<void> {
    const messageData = {
      content: content.trim(),
      senderId,
      senderName,
      senderRole,
      senderAvatar: senderAvatar || null,
      chatId,
      chatType,
      timestamp: serverTimestamp(),
      replyToId: replyToId || null,
      isDeleted: false,
      messageType,
      mediaUrl: mediaUrl || null,
      mediaMetadata: mediaMetadata || null,
    };

    // Add message to messages collection
    const messageRef = await addDoc(collection(db, "chatMessages"), messageData);

    // Update chat channel with last message info
    const channelRef = doc(db, "chatChannels", chatId);
    await updateDoc(channelRef, {
      lastMessageId: messageRef.id,
      lastMessageContent: content.substring(0, 100), // Truncate for preview
      lastMessageTimestamp: serverTimestamp(),
      lastMessageSender: senderName,
    });
  }

  // Listen to messages in a chat channel
  static listenToMessages(
    chatId: string,
    callback: (messages: ChatMessage[]) => void,
    messageLimit: number = 50
  ): () => void {
    const messagesQuery = query(
      collection(db, "chatMessages"),
      where("chatId", "==", chatId),
      where("isDeleted", "==", false),
      orderBy("timestamp", "desc"),
      limit(messageLimit)
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      
      // Reverse to show oldest first
      callback(messages.reverse());
    });
  }

  // Get chat channels for a user - ensures both regional and team chats are available
  static async listenToUserChannels(
    userId: string,
    userTeamId: string,
    callback: (channels: ChatChannel[]) => void
  ): Promise<() => void> {
    // First, get the user's team to find their region
    const teamRef = doc(db, "teams", userTeamId);
    const teamSnap = await getDoc(teamRef);
    const teamData = teamSnap.exists() ? teamSnap.data() : null;
    const userRegionId = teamData?.regionId;
    const teamName = teamData?.name || "Unknown Team";

    if (!userRegionId) {
      console.warn("User team has no regionId, using default region");
    }

    // Get region info
    const regionRef = doc(db, "regions", userRegionId || "default");
    const regionSnap = await getDoc(regionRef);
    const regionData = regionSnap.exists() ? regionSnap.data() : null;
    const regionName = regionData?.name || "Default Region";

    // Get all active channels
    const channelsQuery = query(
      collection(db, "chatChannels"),
      where("isActive", "==", true)
    );

    return onSnapshot(channelsQuery, async (snapshot) => {
      const allChannels: ChatChannel[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatChannel[];

      // Get all users to calculate member counts
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as Array<{uid: string, teamId?: string}>;

      // Get all teams to map teamId to regionId  
      const teamsQuery = query(collection(db, "teams"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<{id: string, regionId?: string}>;

      // Find user's specific channels
      let regionalChannel = allChannels.find(channel => 
        channel.type === "region" && channel.regionId === (userRegionId || "default")
      );
      
      let teamChannel = allChannels.find(channel => 
        channel.type === "team" && channel.teamId === userTeamId
      );

      // Calculate member counts
      let regionalMemberCount = 0;
      let teamMemberCount = 0;

      if (userRegionId || "default") {
        // Count users whose team belongs to this region
        const regionTeamIds = teams
          .filter(team => team.regionId === (userRegionId || "default"))
          .map(team => team.id);
        regionalMemberCount = users.filter(user => 
          user.teamId && regionTeamIds.includes(user.teamId)
        ).length;
      }

      // Count users with this specific teamId
      teamMemberCount = users.filter(user => user.teamId === userTeamId).length;

      // Create missing channels if they don't exist
      const batch = writeBatch(db);
      let needsBatchCommit = false;

      if (!regionalChannel) {
        const regionChannelId = `region_${userRegionId || "default"}`;
        const regionChannelRef = doc(db, "chatChannels", regionChannelId);
        batch.set(regionChannelRef, {
          id: regionChannelId,
          name: `${regionName} Regional Chat`,
          type: "region",
          regionId: userRegionId || "default",
          memberCount: regionalMemberCount,
          isActive: true,
          lastMessageTimestamp: serverTimestamp(),
        });
        
        regionalChannel = {
          id: regionChannelId,
          name: `${regionName} Regional Chat`,
          type: "region" as const,
          regionId: userRegionId || "default",
          memberCount: regionalMemberCount,
          isActive: true,
        };
        needsBatchCommit = true;
      } else {
        // Update existing regional channel member count
        regionalChannel.memberCount = regionalMemberCount;
        const regionChannelRef = doc(db, "chatChannels", regionalChannel.id);
        batch.update(regionChannelRef, { memberCount: regionalMemberCount });
        needsBatchCommit = true;
      }

      if (!teamChannel) {
        const teamChannelId = `team_${userTeamId}`;
        const teamChannelRef = doc(db, "chatChannels", teamChannelId);
        batch.set(teamChannelRef, {
          id: teamChannelId,
          name: `${teamName} Team Chat`,
          type: "team",
          teamId: userTeamId,
          regionId: userRegionId || "default",
          memberCount: teamMemberCount,
          isActive: true,
          lastMessageTimestamp: serverTimestamp(),
        });
        
        teamChannel = {
          id: teamChannelId,
          name: `${teamName} Team Chat`,
          type: "team" as const,
          teamId: userTeamId,
          regionId: userRegionId || "default",
          memberCount: teamMemberCount,
          isActive: true,
        };
        needsBatchCommit = true;
      } else {
        // Update existing team channel member count
        teamChannel.memberCount = teamMemberCount;
        const teamChannelRef = doc(db, "chatChannels", teamChannel.id);
        batch.update(teamChannelRef, { memberCount: teamMemberCount });
        needsBatchCommit = true;
      }

      // Commit new channels if needed
      if (needsBatchCommit) {
        try {
          await batch.commit();
        } catch (error) {
          console.error("Error creating missing chat channels:", error);
        }
      }

      // Always return exactly 2 channels: Regional Chat first, then Team Chat
      const userChannels: ChatChannel[] = [regionalChannel, teamChannel].filter(Boolean);

      callback(userChannels);
    });
  }

  // Initialize chat channels for both regions and teams
  static async initializeChannels(
    regions: Array<{id: string, name: string, isActive: boolean}>,
    teams: Array<{id: string, name: string, regionId: string, isActive: boolean}>
  ): Promise<void> {
    const batch = writeBatch(db);

    // Create regional channels
    for (const region of regions) {
      if (region.isActive) {
        const regionChannelRef = doc(db, "chatChannels", `region_${region.id}`);
        batch.set(regionChannelRef, {
          id: `region_${region.id}`,
          name: `${region.name} Regional Chat`,
          type: "region",
          regionId: region.id,
          memberCount: 0,
          isActive: true,
          lastMessageTimestamp: serverTimestamp(),
        });
      }
    }

    // Create team channels
    for (const team of teams) {
      if (team.isActive) {
        const teamChannelRef = doc(db, "chatChannels", `team_${team.id}`);
        batch.set(teamChannelRef, {
          id: `team_${team.id}`,
          name: `${team.name} Team Chat`,
          type: "team",
          teamId: team.id,
          regionId: team.regionId,
          memberCount: 0,
          isActive: true,
          lastMessageTimestamp: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  }

  // Delete old messages (7+ days old)
  static async cleanupOldMessages(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldMessagesQuery = query(
      collection(db, "chatMessages"),
      where("timestamp", "<", Timestamp.fromDate(sevenDaysAgo))
    );

    const snapshot = await getDocs(oldMessagesQuery);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} old chat messages`);
  }

  // Edit a message
  static async editMessage(messageId: string, newContent: string): Promise<void> {
    const messageRef = doc(db, "chatMessages", messageId);
    await updateDoc(messageRef, {
      content: newContent.trim(),
      editedAt: serverTimestamp(),
    });
  }

  // Delete a message (soft delete)
  static async deleteMessage(messageId: string): Promise<void> {
    const messageRef = doc(db, "chatMessages", messageId);
    await updateDoc(messageRef, {
      isDeleted: true,
      content: "[Message deleted]",
    });
 }

  // Calculate and update member counts for all channels
  static async updateAllChannelMemberCounts(): Promise<void> {
    try {
      // Get all users
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as Array<{uid: string, teamId?: string}>;

      // Get all teams to map teamId to regionId
      const teamsQuery = query(collection(db, "teams"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<{id: string, regionId?: string}>;

      // Get all channels
      const channelsQuery = query(collection(db, "chatChannels"));
      const channelsSnapshot = await getDocs(channelsQuery);
      
      const batch = writeBatch(db);

      // Calculate member counts for each channel
      for (const channelDoc of channelsSnapshot.docs) {
        const channel = { id: channelDoc.id, ...channelDoc.data() } as {id: string, type?: string, teamId?: string, regionId?: string};
        let memberCount = 0;

        if (channel.type === "team" && channel.teamId) {
          // Count users with this specific teamId
          memberCount = users.filter(user => user.teamId === channel.teamId).length;
        } else if (channel.type === "region" && channel.regionId) {
          // Count users whose team belongs to this region
          const regionTeamIds = teams
            .filter(team => team.regionId === channel.regionId)
            .map(team => team.id);
          memberCount = users.filter(user => 
            user.teamId && regionTeamIds.includes(user.teamId)
          ).length;
        }

        // Update the member count
        const channelRef = doc(db, "chatChannels", channel.id);
        batch.update(channelRef, { memberCount });
      }

      await batch.commit();
      console.log("Updated member counts for all chat channels");
    } catch (error) {
      console.error("Error updating channel member counts:", error);
    }
  }

  // Update member count for a channel
  static async updateChannelMemberCount(channelId: string, count: number): Promise<void> {
    const channelRef = doc(db, "chatChannels", channelId);
    await updateDoc(channelRef, {
      memberCount: count,
    });
  }

  // Get messages for a channel (for compatibility with existing code)
  static async getChannelMessages(channelId: string, limitCount: number = 50): Promise<ChatMessage[]> {
    const messagesQuery = query(
      collection(db, "chatMessages"),
      where("chatId", "==", channelId),
      where("isDeleted", "==", false),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(messagesQuery);
    const messages: ChatMessage[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ChatMessage[];
    
    // Reverse to show oldest first
    return messages.reverse();
  }

  // Bot conversation management (using localStorage for simplicity)
  static getBotConversation(channelId: string): any[] {
    try {
      if (typeof window === 'undefined') return [];
      // eslint-disable-next-line no-undef
      const stored = localStorage.getItem(`botConv_${channelId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static updateBotConversation(channelId: string, conversation: any[]): void {
    try {
      if (typeof window === 'undefined') return;
      // eslint-disable-next-line no-undef
      localStorage.setItem(`botConv_${channelId}`, JSON.stringify(conversation));
    } catch (error) {
      console.error("Error saving bot conversation:", error);
    }
  }
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import TeamChat from "../dashboard/team-chat";
import { useAuth } from "@/hooks/use-auth";

export default function TeamChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const { user } = useAuth();

  // Mock unread check - you can replace this with actual chat service logic
  useEffect(() => {
    if (!user) return;
    
    // Simulate checking for unread messages
    try {
      const lastRead = parseInt(localStorage.getItem("team-chat-last-read") || "0", 10);
      // For now, just set hasUnread to false
      setHasUnread(false);
    } catch {
      setHasUnread(false);
    }
  }, [user]);

  // Mark as read when chat is opened
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem("team-chat-last-read", Date.now().toString());
      setHasUnread(false);
    }
  }, [isOpen]);

  return (
    <>
      {/* Chat Button */}
      <div className="relative">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="hidden sm:flex hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
        >
          <span className="relative">
            <MessageCircle className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 animate-pulse z-10" />
            )}
          </span>
          <span className="text-green-600 dark:text-green-400 font-medium">Group Chat</span>
        </Button>
        {/* Mobile version */}
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="sm:hidden hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
        >
          <span className="relative">
            <MessageCircle className="h-5 w-5 text-green-500" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 animate-pulse z-10" />
            )}
          </span>
        </Button>
      </div>
      {/* Chat Component */}
      <TeamChat 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
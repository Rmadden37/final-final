"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import TeamChat from "../performance-dashboard/team-chat";

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="floating-chat-button fixed bottom-6 right-6 md:bottom-6 md:right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 dark:from-green-400 dark:to-emerald-500 dark:hover:from-green-500 dark:hover:to-emerald-600 premium:from-premium-purple premium:to-premium-teal premium:hover:from-premium-purple/90 premium:hover:to-premium-teal/90 shadow-lg hover:shadow-xl transition-all duration-200 border-0 dark:shadow-green-500/20 premium:shadow-premium-purple/30 premium:glow-premium premium:floating-premium group"
          size="icon"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-white dark:text-slate-900 premium:text-white premium:nav-icon premium:icon-glow-white transition-all duration-300" />
          </div>
        </Button>
      </div>

      {/* Team Chat Component */}
      <TeamChat 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}

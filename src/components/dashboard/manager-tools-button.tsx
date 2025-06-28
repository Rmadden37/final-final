"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";
import ManagerToolsModal from "./manager-tools-modal";

export default function ManagerToolsButton() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (user?.role !== "manager" && user?.role !== "admin") {
    return null;
  }

  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 h-32 dark:card-glass dark:glow-turquoise"
        onClick={() => setIsModalOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
          <CardTitle className="text-xl sm:text-2xl font-bold font-headline flex items-center text-slate-900 dark:text-slate-100">
            <div className="p-2 bg-blue-800 dark:bg-blue-800 rounded-lg mr-3">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span>Manager Tools</span>
              <span className="text-sm font-normal text-muted-foreground">
                Team management & analytics
              </span>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>
      <ManagerToolsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

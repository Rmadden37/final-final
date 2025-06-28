
"use client";

import {useState} from "react";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Users, ChevronDownSquare} from "lucide-react"; // Changed UserX to Users
import ManageClosersModal from "./off-duty-closers-modal"; // Kept filename for now, but it's ManageClosersModal functionality

export default function ManageClosersButton() { // Renamed component for clarity, was OffDutyClosers
  const {user} = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (user?.role !== "manager") {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        className="w-full justify-start text-left shadow-md hover:shadow-lg transition-shadow h-auto py-3"
      >
        <div className="flex items-center w-full">
          <Users className="mr-3 h-7 w-7 text-muted-foreground" /> {/* Changed icon */}
          <div className="flex-1">
            <p className="text-base font-medium font-headline">Manage Closers</p> {/* Changed text */}
            <p className="text-xs text-muted-foreground">View team members & set duty status</p> {/* Changed text */}
          </div>
          <ChevronDownSquare className="ml-auto h-5 w-5 text-muted-foreground opacity-70" />
        </div>
      </Button>
      <ManageClosersModal // Component name inside the modal file itself is ManageClosersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

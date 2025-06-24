"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CreateLeadFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLeadFormSimple({ isOpen, onClose }: CreateLeadFormProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Lead - Test Version</DialogTitle>
          <DialogDescription>
            This is a simplified test version to isolate the issue.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <p>If you can see this, the dynamic import is working.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

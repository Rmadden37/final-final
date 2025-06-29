"use client";

import type {AppUser} from "@/types";
import {Button as _Button} from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Loader2, ShieldAlert} from "lucide-react";
import {useState} from "react";

interface ConfirmUserDeleteModalProps {
  userToDelete: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}

export default function ConfirmUserDeleteModal({
  userToDelete,
  isOpen,
  onClose,
  onConfirmDelete,
}: ConfirmUserDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirmDelete();
    setIsDeleting(false);
    // onClose will be called by the parent component after deletion logic
  };

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline">Confirm User Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the user: <strong>{userToDelete.displayName || userToDelete.email}</strong>?
            This action will remove their records from the application.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive flex items-start">
          <ShieldAlert className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Warning:</strong> This will delete the user's data from Firestore (user profile, closer record if applicable).
            However, it will <strong>not</strong> delete their Firebase Authentication account. Full account deletion requires backend admin privileges.
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Delete User Records"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


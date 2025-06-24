"use client";

import React, {useState} from "react";
import {useAuth} from "@/hooks/use-auth";
import {db, storage, auth} from "@/lib/firebase";
import {ref, uploadBytesResumable, getDownloadURL} from "firebase/storage";
import {doc, updateDoc} from "firebase/firestore";
import {sendPasswordResetEmail} from "firebase/auth";
import {useToast} from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Camera, Upload, Loader2, X, KeyRound} from "lucide-react";
import type {AppUser} from "@/types";

interface UploadAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
}

export default function UploadAvatarModal({isOpen, onClose, user}: UploadAvatarModalProps) {
  const {user: currentUser} = useAuth();
  const {toast} = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentUser) return;

    // Check permissions
    if (currentUser.role !== "manager" && currentUser.role !== "admin") {
      toast({
        title: "Unauthorized",
        description: "Only managers and admins can upload user photos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `avatars/${user.uid}_${timestamp}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, fileName);
      
      // Upload file with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          toast({
            title: "Upload Failed",
            description: "Failed to upload image. Please try again.",
            variant: "destructive",
          });
          setUploading(false);
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Update user document
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
              avatarUrl: downloadURL,
              updatedAt: new Date()
            });

            // If the user is a closer, manager, or admin, also update their closer record
            if (user.role === "closer" || user.role === "manager" || user.role === "admin") {
              const closerDocRef = doc(db, "closers", user.uid);
              await updateDoc(closerDocRef, {
                avatarUrl: downloadURL,
                updatedAt: new Date()
              });
            }

            toast({
              title: "Photo Updated",
              description: `${user.displayName || user.email}'s profile photo has been updated.`,
            });

            // Clean up and close
            handleClose();
          } catch (error) {
            console.error("Error updating user:", error);
            toast({
              title: "Update Failed",
              description: "Photo uploaded but failed to update user profile.",
              variant: "destructive",
            });
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading && !sendingPasswordReset) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      onClose();
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) {
      toast({
        title: "Error",
        description: "Email address not found for this user.",
        variant: "destructive",
      });
      return;
    }

    setSendingPasswordReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: "Password Reset Email Sent",
        description: `Password reset email sent to ${user.email}. They will need to check their inbox.`,
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Reset Failed",
        description: "Could not send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const canUpload = currentUser?.role === "manager" || currentUser?.role === "admin";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !uploading && !sendingPasswordReset) handleClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <Camera className="mr-2 h-5 w-5 text-primary" />
            Update Profile Photo
          </DialogTitle>
          <DialogDescription>
            Upload a new profile photo for {user.displayName || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Avatar */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-sm text-muted-foreground">Current Photo:</div>
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.email || "User"} />
              <AvatarFallback className="text-lg">
                {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : (user.email ? user.email.substring(0, 2).toUpperCase() : "??")}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* File Input */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Select New Photo:</div>
            <div className="flex flex-col items-center space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={!canUpload || uploading}
                className="hidden"
                id="avatar-upload"
              />
              <label 
                htmlFor="avatar-upload" 
                className={`cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center transition-colors hover:border-gray-400 dark:hover:border-gray-500 ${!canUpload || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Click to select an image
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Max 5MB • JPG, PNG, GIF
                </div>
              </label>

              {/* Preview */}
              {previewUrl && (
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={previewUrl} alt="Preview" />
                  </Avatar>
                  {!uploading && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{width: `${uploadProgress}%`}}
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            {/* Photo Upload Buttons */}
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={uploading || sendingPasswordReset}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!selectedFile || uploading || sendingPasswordReset || !canUpload}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>

            {/* Password Reset Button */}
            {canUpload && user.email && (
              <div className="border-t pt-3">
                <div className="text-sm text-muted-foreground mb-2">Account Management:</div>
                <Button 
                  variant="outline"
                  onClick={handlePasswordReset}
                  disabled={uploading || sendingPasswordReset}
                  className="w-full"
                >
                  {sendingPasswordReset ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Reset Email...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Send Password Reset Email
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {!canUpload && (
            <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-3 py-2 rounded-md">
              Only managers and admins can upload user photos.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

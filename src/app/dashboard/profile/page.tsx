"use client";

import _Link from "next/link";
import React, {useState, useEffect, useRef} from "react";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {auth, db, storage} from "@/lib/firebase";
import {updateProfile, sendPasswordResetEmail} from "firebase/auth";
import {doc, updateDoc, getDoc} from "firebase/firestore";
import {ref as storageRef, uploadBytesResumable, getDownloadURL} from "firebase/storage";
import {useToast} from "@/hooks/use-toast";
import {Loader2, User, Mail, ShieldCheck, Edit3, KeyRound, Camera, Users, Bell} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose} from "@/components/ui/dialog";
import ReactCrop, {type Crop, PixelCrop, centerCrop, makeAspectCrop} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import NotificationSettings from "@/components/notifications/notification-settings";
import NotificationTestPanel from "@/components/notifications/notification-test-panel";


const profileFormSchema = z.object({
  displayName: z.string().min(2, {message: "Display name must be at least 2 characters."}).max(50, {message: "Display name cannot exceed 50 characters."}),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Helper function to preview the crop
async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: PixelCrop,
  scale = 1,
  rotate = 0,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  const rotateRads = (rotate * Math.PI) / 180;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );
  ctx.restore();
}


export default function ProfilePage() {
  const {user, firebaseUser, loading: authLoading, logout} = useAuth();
  const {toast} = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Profile picture state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [upImgSrc, setUpImgSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    if (user?.displayName) {
      form.reset({displayName: user.displayName});
    }
  }, [user, form]);

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    if (!firebaseUser || !user) {
      toast({title: "Error", description: "User not found.", variant: "destructive"});
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateProfile(firebaseUser, {displayName: values.displayName});
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {displayName: values.displayName});

      if (user.role === "closer") {
        const closerDocRef = doc(db, "closers", user.uid);
        const closerDocSnap = await getDoc(closerDocRef);
        if (closerDocSnap.exists()) {
          await updateDoc(closerDocRef, {name: values.displayName});
        }
      }

      toast({
        title: "Profile Updated",
        description: "Your display name has been successfully updated.",
      });
      form.reset({displayName: values.displayName});
    } catch (_error: unknown) {
      toast({
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({title: "Error", description: "Email address not found.", variant: "destructive"});
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox for a password reset link. You will be logged out.",
      });
      setTimeout(async () => {
        await logout();
      }, 3000);
    } catch (_error: unknown) {
      toast({
        title: "Request Failed",
        description: "Could not send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () => setUpImgSrc(reader.result?.toString() || ""));
      reader.readAsDataURL(e.target.files[0]);
      setIsPhotoModalOpen(true);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const {width, height} = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({unit: "%", width: 90}, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  }

  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      canvasPreview(
        imgRef.current,
        previewCanvasRef.current,
        completedCrop
      );
    }
  }, [completedCrop]);


  const handleUploadCroppedImage = async () => {
    if (!completedCrop || !previewCanvasRef.current || !user) {
      toast({title: "Error", description: "Crop details or user not available.", variant: "destructive"});
      return;
    }
    
    console.log('Starting upload process...');
    console.log('User:', user.uid);
    console.log('Completed crop:', completedCrop);
    
    setIsUploadingPhoto(true);
    const canvas = previewCanvasRef.current;
    
    console.log('Creating blob from canvas...');
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        toast({title: "Error", description: "Could not create image blob.", variant: "destructive"});
        setIsUploadingPhoto(false);
        return;
      }

      console.log('Blob created successfully:', blob.size, 'bytes');
      const fileRef = storageRef(storage, `profile_pictures/${user.uid}/profile.png`);
      console.log('Storage ref created:', fileRef.fullPath);
      
      try {
        // Use uploadBytesResumable for better error handling and progress tracking
        console.log('Starting Firebase upload...');
        const uploadTask = uploadBytesResumable(fileRef, blob, {contentType: "image/png"});
        
        // Wait for upload completion with proper error handling
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              // Optional: Add progress tracking here if needed
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload progress:', Math.round(progress) + '%');
            },
            (error) => {
              console.error('Upload error:', error);
              console.error('Error code:', error.code);
              console.error('Error message:', error.message);
              reject(error);
            },
            () => {
              console.log('Upload completed successfully');
              resolve(uploadTask.snapshot);
            }
          );
        });

        console.log('Getting download URL...');
        const downloadURL = await getDownloadURL(fileRef);
        console.log('Download URL obtained:', downloadURL);

        console.log('Updating user document...');
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {avatarUrl: downloadURL});

        if (user.role === "closer") {
          console.log('Updating closer document...');
          const closerDocRef = doc(db, "closers", user.uid);
          const closerDocSnap = await getDoc(closerDocRef);
          if (closerDocSnap.exists()) {
            await updateDoc(closerDocRef, {avatarUrl: downloadURL});
          }
        }

        console.log('Upload process completed successfully');
        toast({title: "Profile Photo Updated", description: "Your new photo is now active."});
        setIsPhotoModalOpen(false);
        setUpImgSrc("");
      } catch (error: unknown) {
        console.error('Profile photo upload error:', error);
        console.error('Error details:', {
          code: (error as any)?.code,
          message: (error as any)?.message,
          stack: (error as any)?.stack
        });
        toast({
          title: "Upload Failed",
          description: (error as any)?.message || "Could not upload profile picture. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingPhoto(false);
      }
    }, "image/png", 0.95);
  };


  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <p className="text-destructive">User not found. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl space-y-8"> {/* Increased max-w for new section */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline flex items-center justify-center">
            <User className="mr-3 h-8 w-8 text-primary" />
            User Profile
          </CardTitle>
          <CardDescription className="text-center">Manage your personal information and account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24 border-2 border-primary shadow-md">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.email || "User"} />
              <AvatarFallback className="text-3xl">
                {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : (user.email ? user.email.substring(0, 2).toUpperCase() : <User size={40}/>)}
              </AvatarFallback>
            </Avatar>
            <div className="relative group">
              <Button variant="outline" size="sm" onClick={() => document.getElementById("photoInput")?.click()} disabled={isUploadingPhoto}>
                <Camera className="mr-2 h-4 w-4" />
                {isUploadingPhoto ? "Uploading..." : "Change Photo"}
              </Button>
              <input type="file" id="photoInput" accept="image/*" onChange={onSelectFile} className="hidden" />
            </div>
            <p className="text-xs text-muted-foreground">For best results, upload a 1x1 (square) image.</p>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center text-sm">
              <Mail className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Email:</span>
              <span className="ml-2 text-muted-foreground">{user.email}</span>
            </div>
            <div className="flex items-center text-sm">
              <ShieldCheck className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Role:</span>
              <span className="ml-2 text-muted-foreground capitalize">{user.role}</span>
            </div>
            {user.teamId && (
              <div className="flex items-center text-sm">
                <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Team ID:</span>
                <span className="ml-2 text-muted-foreground">{user.teamId}</span>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({field}) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Edit3 className="mr-2 h-4 w-4"/>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isUpdatingProfile} className="w-full sm:w-auto">
                {isUpdatingProfile ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-start space-y-4 border-t pt-6 mt-6">
          <div className="w-full">
            <h3 className="text-xl font-bold font-headline flex items-center justify-center">
              <KeyRound className="mr-2 h-6 w-6 text-primary"/>
                    Password Reset
            </h3>
            <p className="text-sm text-muted-foreground mt-1 text-center">
                    If you need to reset your password, click the button below. A reset link will be sent to your email address.
            </p>
          </div>
          <Button variant="outline" onClick={handlePasswordReset} disabled={isSendingResetEmail} className="w-full sm:w-auto self-center">
            {isSendingResetEmail ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              "Send Password Reset Email"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Push Notifications Settings */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center justify-center">
            <Bell className="mr-3 h-7 w-7 text-primary" />
            Push Notifications
          </CardTitle>
          <CardDescription className="text-center">
            Get instant notifications for new leads, appointments, and important updates
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <NotificationSettings />
        </CardContent>
      </Card>

      {/* Notification Testing Panel (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="shadow-xl border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <NotificationTestPanel />
          </CardContent>
        </Card>
      )}

      {/* Photo Cropping Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPhotoModalOpen(false);
          setUpImgSrc("");
        } else {
          setIsPhotoModalOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Your Photo</DialogTitle>
            <DialogDescription>
              Adjust the selection to crop your photo. A 1x1 aspect ratio is maintained.
            </DialogDescription>
          </DialogHeader>
          {upImgSrc && (
            <div className="flex flex-col items-center space-y-4">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                minWidth={100}
                minHeight={100}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={upImgSrc}
                  onLoad={onImageLoad}
                  style={{maxHeight: "70vh"}}
                />
              </ReactCrop>
              <div>
                <h4 className="text-sm font-medium mb-1">Preview:</h4>
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    border: "1px solid black",
                    objectFit: "contain",
                    width: completedCrop?.width ?? 0,
                    height: completedCrop?.height ?? 0,
                    borderRadius: "50%",
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {
                setUpImgSrc(""); setCrop(undefined);
              }} disabled={isUploadingPhoto}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleUploadCroppedImage} disabled={isUploadingPhoto || !completedCrop?.width}>
              {isUploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Cropped Photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


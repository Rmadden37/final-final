"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useState, useCallback, useRef, useEffect, ChangeEvent } from "react";
import { Loader2, MapPin, Upload, X, FileImage } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { DispatchType, LeadStatus } from "@/types";
import { LeadNotifications } from "@/lib/notification-service";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { createPortal } from "react-dom";

interface PlacePrediction {
  description: string;
  place_id: string;
}

// Generate 30-minute intervals from 8 AM to 10 PM (matching reschedule specifications)
const timeSlots: { value: string; label: string }[] = [];
for (let hour = 8; hour <= 22; hour++) {
  // Add :00 slot
  const hour12 = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour12 === 0 ? 12 : hour12;
  
  timeSlots.push({
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: `${displayHour}:00 ${ampm}`
  });
  
  // Add :30 slot (except for 10:30 PM to keep it until 10 PM)
  if (hour < 22) {
    timeSlots.push({
      value: `${hour.toString().padStart(2, '0')}:30`,
      label: `${displayHour}:30 ${ampm}`
    });
  }
}

const formSchema = z.object({
  customerName: z.string().min(2, { message: "Customer name must be at least 2 characters." }),
  customerPhone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).regex(/^\+?[0-9\s()-]+$/, { message: "Invalid phone number format."}),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  dispatchType: z.enum(["immediate", "scheduled"], { required_error: "Please select a dispatch type." }) as z.ZodType<DispatchType>,
  appointmentDate: z.date().optional(),
  appointmentTime: z.string().optional(),
  assignedCloserId: z.string().optional(),
  photos: z.array(z.instanceof(File)).max(5, { message: "Maximum 5 photos allowed." }).optional(),
}).superRefine((data, ctx) => {
  if (data.dispatchType === "scheduled") {
    if (!data.appointmentDate) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: "Date is required for scheduled dispatch.", 
        path: ["appointmentDate"] 
      });
    }
    if (!data.appointmentTime) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: "Time is required for scheduled dispatch.", 
        path: ["appointmentTime"] 
      });
    }
    
    // Validate that the selected date/time is in the future
    if (data.appointmentDate && data.appointmentTime) {
      const [hours, minutes] = data.appointmentTime.split(':').map(Number);
      const selectedDateTime = new Date(data.appointmentDate);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      if (selectedDateTime <= new Date()) {
        ctx.addIssue({ 
          code: z.ZodIssueCode.custom, 
          message: "Scheduled appointment must be in the future.", 
          path: ["appointmentDate"] 
        });
      }
    }
  }
  
  // Photo validation
  if (data.photos) {
    for (let i = 0; i < data.photos.length; i++) {
      const file = data.photos[i];
      if (file.size > 5 * 1024 * 1024) { // 5MB
        ctx.addIssue({ 
          code: z.ZodIssueCode.custom, 
          message: `Photo ${i + 1} is too large. Maximum size is 5MB.`, 
          path: ["photos"] 
        });
      }
      if (!file.type.startsWith('image/')) {
        ctx.addIssue({ 
          code: z.ZodIssueCode.custom, 
          message: `File ${i + 1} is not an image.`, 
          path: ["photos"] 
        });
      }
    }
  }
});

interface CreateLeadFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLeadForm({ isOpen, onClose }: CreateLeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      address: "",
      dispatchType: "immediate",
      photos: [],
    },
  });

  const dispatchType = form.watch("dispatchType");
  const photos = form.watch("photos") || [];

  // Set default appointment time to 5:00 PM when scheduled dispatch is selected
  useEffect(() => {
    if (dispatchType === "scheduled" && !form.getValues("appointmentTime")) {
      form.setValue("appointmentTime", "17:00");
    }
  }, [dispatchType, form]);

  // Set client-side flag to enable portal rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close address predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };

    if (showPredictions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPredictions]);

  // Address autocomplete functionality
  const fetchAddressPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setAddressPredictions([]);
      setShowPredictions(false);
      return;
    }

    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    setIsLoadingPredictions(true);
    try {
      // Safely access environment variable
      const apiKey = typeof window !== 'undefined' 
        ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
        : null;
      
      if (!apiKey) {
        console.warn('Google Maps API key not configured or not in browser environment');
        setAddressPredictions([]);
        setShowPredictions(false);
        return;
      }
      
      const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}&key=${encodeURIComponent(apiKey)}`);
      if (response.ok) {
        const data = await response.json();
        setAddressPredictions(data.predictions || []);
        setShowPredictions(true);
      } else {
        console.error('Places API response not ok:', response.status);
        setAddressPredictions([]);
        setShowPredictions(false);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      setAddressPredictions([]);
      setShowPredictions(false);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, []);

  // Handle photo selection
  const handlePhotoSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const currentPhotos = form.getValues("photos") || [];
    
    if (currentPhotos.length + files.length > 5) {
      toast({
        title: "Too many photos",
        description: "Maximum 5 photos allowed.",
        variant: "destructive",
      });
      return;
    }

    // Create preview URLs (browser only)
    const newPreviewUrls = typeof window !== 'undefined' 
      ? files.map(file => {
          try {
            return URL.createObjectURL(file);
          } catch (error) {
            console.error('Error creating object URL:', error);
            return '';
          }
        }).filter(url => url !== '')
      : [];
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    
    // Update form
    form.setValue("photos", [...currentPhotos, ...files]);
  }, [form, toast]);

  // Remove photo
  const removePhoto = useCallback((index: number) => {
    const currentPhotos = form.getValues("photos") || [];
    const currentPreviews = previewUrls;
    
    // Revoke URL to prevent memory leaks (browser only)
    if (currentPreviews[index] && typeof window !== 'undefined') {
      URL.revokeObjectURL(currentPreviews[index]);
    }
    
    // Update arrays
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    const newPreviews = currentPreviews.filter((_, i) => i !== index);
    
    form.setValue("photos", newPhotos);
    setPreviewUrls(newPreviews);
  }, [form, previewUrls]);

  // Upload photos to Firebase Storage
  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    setUploadingPhotos(true);
    const uploadPromises = photos.map(async (photo, index) => {
      const fileName = `leads/${Date.now()}-${index}-${photo.name}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, photo);
      return getDownloadURL(snapshot.ref);
    });

    try {
      const urls = await Promise.all(uploadPromises);
      return urls;
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Upload photos if any
      let photoUrls: string[] = [];
      if (values.photos && values.photos.length > 0) {
        photoUrls = await uploadPhotos(values.photos);
      }

      // Prepare lead data
      const selectedCloser = values.assignedCloserId && values.assignedCloserId === user?.uid
        ? { uid: user.uid, name: user.displayName || user.email || 'Self' }
        : null;

      const leadData: Record<string, unknown> = {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        address: values.address,
        dispatchType: values.dispatchType,
        status: values.dispatchType === "immediate" ? "waiting_assignment" : "scheduled",
        teamId: user.teamId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        setterId: user.uid,
        setterName: user.displayName || user.email,
        setterLocation: null,
        assignedCloserId: selectedCloser?.uid || null,
        assignedCloserName: selectedCloser?.name || null,
        dispositionNotes: "",
        photoUrls: photoUrls,
      };

      // Add scheduled appointment data if applicable
      if (values.dispatchType === "scheduled" && values.appointmentDate && values.appointmentTime) {
        const [hours, minutes] = values.appointmentTime.split(':').map(Number);
        const scheduledDateTime = new Date(values.appointmentDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);
        
        leadData.scheduledAppointmentTime = Timestamp.fromDate(scheduledDateTime);
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, "leads"), leadData);

      // Send new lead notification
      try {
        await LeadNotifications.newLead({
          id: docRef.id,
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          address: values.address,
          status: leadData.status as LeadStatus,
          teamId: user.teamId,
          dispatchType: values.dispatchType,
          assignedCloserId: selectedCloser?.uid || null,
          assignedCloserName: selectedCloser?.name || null,
          createdAt: new Date() as unknown as Timestamp,
          updatedAt: new Date() as unknown as Timestamp,
          setterId: user.uid,
          setterName: user.displayName || user.email || 'Unknown',
          setterLocation: null,
          dispositionNotes: "",
          scheduledAppointmentTime: (leadData.scheduledAppointmentTime as Timestamp) || null,
          photoUrls: photoUrls
        });
      } catch (notificationError) {
        console.error("Error sending new lead notification:", notificationError);
        // Don't fail the lead creation if notification fails
      }

      toast({
        title: "Lead created successfully",
        description: `Lead for ${values.customerName} has been created.`,
      });

      // Reset form and close
      form.reset();
      setPreviewUrls([]);
      onClose();
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error creating lead",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup preview URLs on unmount (browser only)
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
      }
    };
  }, [previewUrls]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto isolate fixed">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Lead</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Fill out the form below to create a new lead.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 relative isolate">
            {/* Customer Name */}
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Customer Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter customer name" 
                      className="text-sm sm:text-base"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number */}
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter phone number" 
                      className="text-sm sm:text-base"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address with Autocomplete */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={addressInputRef}
                          placeholder="Enter address"
                          className="pl-10 text-sm sm:text-base"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            fetchAddressPredictions(e.target.value);
                          }}
                          onFocus={() => {
                            if (addressPredictions.length > 0) {
                              setShowPredictions(true);
                            }
                          }}
                          onBlur={() => {
                            // Delay hiding to allow click on predictions
                            setTimeout(() => setShowPredictions(false), 200);
                          }}
                        />
                        {isLoadingPredictions && (
                          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Address Predictions Dropdown - Using Portal to prevent layout shifts */}
                      {showPredictions && addressPredictions.length > 0 && isClient && (
                        <>
                          {createPortal(
                            <div 
                              className="fixed z-[9999] bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto min-w-[300px]"
                              style={{
                                insetBlockStart: addressInputRef.current
                                  ? addressInputRef.current.getBoundingClientRect().bottom + window.scrollY + 4
                                  : 0,
                                insetInlineStart: addressInputRef.current
                                  ? addressInputRef.current.getBoundingClientRect().left + window.scrollX
                                  : 0,
                                inlineSize: addressInputRef.current
                                  ? addressInputRef.current.getBoundingClientRect().width
                                  : 300
                              }}
                            >
                              {addressPredictions.map((prediction) => (
                                <div
                                  key={prediction.place_id}
                                  className="px-3 py-2 cursor-pointer hover:bg-muted text-sm"
                                  onClick={() => {
                                    field.onChange(prediction.description);
                                    setShowPredictions(false);
                                    setAddressPredictions([]);
                                  }}
                                >
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate">{prediction.description}</span>
                                  </div>
                                </div>
                              ))}
                            </div>,
                            document.body
                          )}
                        </>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dispatch Type */}
            <FormField
              control={form.control}
              name="dispatchType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm sm:text-base">Dispatch Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="immediate" id="immediate" />
                        <label htmlFor="immediate" className="text-sm sm:text-base cursor-pointer">
                          Immediate Dispatch
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="scheduled" id="scheduled" />
                        <label htmlFor="scheduled" className="text-sm sm:text-base cursor-pointer">
                          Scheduled Dispatch
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assign to Self - Only for managers and closers */}
            {["manager", "closer"].includes(user?.role || "") && (
              <FormField
                control={form.control}
                name="assignedCloserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Assign to Self</FormLabel>
                    <FormDescription className="text-xs sm:text-sm">
                      Assign this lead directly to yourself, bypassing the assignment queue.
                    </FormDescription>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="assignToSelf"
                        checked={field.value === user?.uid}
                        onChange={(e) => {
                          field.onChange(e.target.checked ? user?.uid : "");
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="assignToSelf" className="text-sm cursor-pointer">
                        Assign this lead to me
                      </label>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Scheduled Appointment Fields - Simple Implementation */}
            {dispatchType === "scheduled" && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg isolate">
                <h4 className="font-medium text-sm sm:text-base">Schedule Appointment</h4>
                <div className="text-sm text-muted-foreground">
                  Select a date and time for the scheduled appointment:
                </div>
                
                {/* Date Picker */}
                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Date</FormLabel>
                      <FormControl>
                        <div className="isolate">
                          <DatePicker
                            date={field.value}
                            onDateChange={field.onChange}
                            placeholder="Select appointment date"
                            className="text-sm sm:text-base"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Picker */}
                <FormField
                  control={form.control}
                  name="appointmentTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Time</FormLabel>
                      <FormControl>
                        <div className="isolate">
                          <TimePicker
                            time={field.value}
                            onTimeChange={field.onChange}
                            placeholder="Select appointment time"
                            className="text-sm sm:text-base"
                            timeSlots={timeSlots}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Photo Upload */}
            <FormField
              control={form.control}
              name="photos"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Photos</FormLabel>
                  <FormDescription className="text-xs sm:text-sm">
                    Upload up to 5 photos. Maximum 5MB per photo.
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Upload Button */}
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={photos.length >= 5}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photos
                        </Button>
                        {photos.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {photos.length}/5 photos
                          </span>
                        )}
                      </div>

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />

                      {/* Photo Previews */}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {previewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                                {url ? (
                                  <img
                                    src={url}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <FileImage className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removePhoto(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                                <FileImage className="h-3 w-3 inline mr-1" />
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 dark:border-turquoise/20">
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline"
                  className="text-sm sm:text-base dark:card-glass dark:glow-cyan dark:border-turquoise/30 dark:hover:glow-turquoise"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSubmitting || uploadingPhotos}
                className="text-sm sm:text-base bg-gradient-to-r from-[#3574F2] to-[#5096F2] hover:from-[#3574F2]/90 hover:to-[#5096F2]/90 dark:from-turquoise dark:to-cyan dark:hover:from-turquoise/90 dark:hover:to-cyan/90 dark:glow-turquoise"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingPhotos ? "Uploading..." : "Creating..."}
                  </>
                ) : (
                  "Create Lead"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
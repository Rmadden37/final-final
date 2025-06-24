"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  ImageIcon, 
  Download, 
  ArrowLeft, 
  ArrowRight, 
  X,
  ExternalLink,
  Loader2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeadPhotoGalleryProps {
  photoUrls: string[];
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function LeadPhotoGallery({
  photoUrls,
  customerName,
  isOpen,
  onClose,
}: LeadPhotoGalleryProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const { toast } = useToast();

  const handlePrevious = () => {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? photoUrls.length - 1 : prev - 1
    );
    setImageLoading(true);
  };

  const handleNext = () => {
    setCurrentPhotoIndex((prev) => 
      prev === photoUrls.length - 1 ? 0 : prev + 1
    );
    setImageLoading(true);
  };

  const handleDownload = async (url: string, index: number) => {
    setDownloading(true);
    try {
      // Add proper error handling and CORS support
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'same-origin',
        headers: {
          'Accept': 'image/*'
        }
      });
      
      if (!response.ok) {
        // More specific error messages
        if (response.status === 403) {
          throw new Error('Access denied - insufficient permissions');
        } else if (response.status === 404) {
          throw new Error('Image not found');
        } else {
          throw new Error(`Failed to fetch image (${response.status})`);
        }
      }
      
      const blob = await response.blob();
      const filename = `${customerName.replace(/\s+/g, '_')}_photo_${index + 1}.jpg`;
      
      // Create download link
      if (typeof window !== 'undefined') {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
      
      toast({
        title: "Download Complete",
        description: `Photo ${index + 1} has been downloaded.`,
      });
    } catch (error) {
      if (typeof window !== 'undefined') {
        console.error('Download failed:', error);
      }
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unable to download the photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      // Download each photo with a small delay to avoid overwhelming the browser
      for (let i = 0; i < photoUrls.length; i++) {
        await handleDownload(photoUrls[i], i);
        // Small delay between downloads
        if (i < photoUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      toast({
        title: "All Downloads Complete",
        description: `${photoUrls.length} photos have been downloaded.`,
      });
    } catch (error) {
      console.error('Download all failed:', error);
      toast({
        title: "Download Failed",
        description: "Some photos may not have downloaded. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    toast({
      title: "Image Load Error",
      description: "Unable to load this image.",
      variant: "destructive",
    });
  };

  if (!photoUrls || photoUrls.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Photos for {customerName}
            </div>
            <Badge variant="secondary" className="text-xs">
              {currentPhotoIndex + 1} of {photoUrls.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="relative flex-1 min-h-[400px] max-h-[60vh] bg-black/5 dark:bg-black/20 mx-6">
          {/* Main Image Display */}
          <div className="relative w-full h-full flex items-center justify-center">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={photoUrls[currentPhotoIndex]}
              alt={`Photo ${currentPhotoIndex + 1} for ${customerName}`}
              className="max-w-full max-h-full object-contain rounded-lg"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: imageLoading ? 'none' : 'block' }}
            />
          </div>

          {/* Navigation Arrows */}
          {photoUrls.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black"
                onClick={handlePrevious}
                disabled={imageLoading}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black"
                onClick={handleNext}
                disabled={imageLoading}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {photoUrls.length > 1 && (
          <div className="px-6 py-4 border-t">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photoUrls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentPhotoIndex(index);
                    setImageLoading(true);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                    index === currentPhotoIndex
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openInNewTab(photoUrls[currentPhotoIndex])}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(photoUrls[currentPhotoIndex], currentPhotoIndex)}
              disabled={downloading}
              className="flex items-center gap-2"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download This Photo
            </Button>
            {photoUrls.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="flex items-center gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download All ({photoUrls.length})
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose} size="sm">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

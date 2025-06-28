"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, User, Shield, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileCardProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    uid: string;
    name?: string;
    displayName?: string;
    email?: string | null;
    role?: string;
    avatarUrl?: string;
    phone?: string | null;
    phoneNumber?: string | null;
  };
}

export default function ProfileCard({ isOpen, onClose, profile }: ProfileCardProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const displayName = profile.name || profile.displayName || "Unknown User";
  const email = profile.email;
  const phone = profile.phone || profile.phoneNumber;
  const role = profile.role || "User";
  const avatarSrc = profile.avatarUrl || `https://ui-avatars.com/api/?name=${displayName.replace(/\s+/g, "+")}&background=random&color=fff`;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      // Check if we're in a secure context and clipboard API is available
      if (typeof window !== 'undefined' && 
          typeof navigator !== 'undefined' && 
          navigator.clipboard && 
          window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast({
          title: "Copied!",
          description: `${field} copied to clipboard`,
        });
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        // Fallback for non-secure contexts or unsupported browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setCopiedField(field);
          toast({
            title: "Copied!",
            description: `${field} copied to clipboard`,
          });
          setTimeout(() => setCopiedField(null), 2000);
        } catch {
          throw new Error('Copy operation not supported');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "manager":
        return "default"; // Blue
      case "closer":
        return "secondary"; // Gray
      case "setter":
        return "outline"; // White with border
      default:
        return "secondary";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case "manager":
        return <Shield className="h-3 w-3" />;
      case "closer":
      case "setter":
        return <User className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md dark:card-glass dark:glow-turquoise">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center justify-center">
            <User className="mr-2 h-6 w-6 text-primary" />
            Team Member Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Avatar */}
          <Avatar className="h-20 w-20 border-2 border-primary shadow-lg">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 text-blue-900 dark:text-blue-100 font-bold text-lg">
              {displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name and Role */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold font-headline">{displayName}</h3>
            <Badge variant={getRoleBadgeVariant(role)} className="flex items-center gap-1">
              {getRoleIcon(role)}
              <span className="capitalize">{role}</span>
            </Badge>
          </div>

          {/* Contact Information */}
          <div className="w-full space-y-3">
            {/* Email */}
            {email && (
              <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-slate-800/40 dark:border dark:border-turquoise/20 rounded-lg dark:glow-turquoise">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground dark:text-turquoise/80 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground dark:text-gray-400 uppercase tracking-wide">Email</p>
                    <p className="font-medium truncate dark:text-gray-200">{email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0 dark:hover:bg-turquoise/10"
                  onClick={() => copyToClipboard(email, "Email")}
                >
                  {copiedField === "Email" ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-turquoise" />
                  ) : (
                    <Copy className="h-4 w-4 dark:text-gray-300" />
                  )}
                </Button>
              </div>
            )}

            {/* Phone */}
            {phone && (
              <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-slate-800/40 dark:border dark:border-cyan/20 rounded-lg dark:glow-cyan">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Phone className="h-4 w-4 text-muted-foreground dark:text-cyan/80 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground dark:text-gray-400 uppercase tracking-wide">Phone</p>
                    <p className="font-medium dark:text-gray-200">{phone}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0 dark:hover:bg-cyan/10"
                  onClick={() => copyToClipboard(phone, "Phone")}
                >
                  {copiedField === "Phone" ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-cyan" />
                  ) : (
                    <Copy className="h-4 w-4 dark:text-gray-300" />
                  )}
                </Button>
              </div>
            )}

            {/* If neither email nor phone available */}
            {!email && !phone && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No contact information available</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Send, 
  Users, 
  MessageCircle, 
  Hash,
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  Loader2,
  User,
  Smile,
  Paperclip,
  X,
  Globe,
  ArrowLeft,
  Menu,
  Home
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface TeamChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock types for demonstration
interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date | { toDate(): Date };
  messageType?: "text" | "image" | "gif" | "sticker";
  mediaUrl?: string;
  editedAt?: Date;
  mediaMetadata?: {
    width?: number;
    height?: number;
    fileName?: string;
    altText?: string;
  };
}

interface ChatChannel {
  id: string;
  name: string;
  type: "team" | "region";
  memberCount?: number;
  lastMessageContent?: string;
  lastMessageSender?: string;
}

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
}

// Emoji picker data
const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
  "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
  "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
  "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯",
  "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐",
  "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈",
  "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾"
];

function MessageItem({ message, isOwn, onEdit, onDelete, onReply }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const getTimestamp = () => {
    if (!message.timestamp) return "";
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp objects or any object with toDate method
      if (message.timestamp && typeof message.timestamp === 'object' && 'toDate' in message.timestamp) {
        date = (message.timestamp as { toDate(): Date }).toDate();
      } else {
        date = new Date(message.timestamp as unknown as string | number | Date);
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return "just now";
    }
  };

  return (
    <div className={`chat-message-mobile flex gap-3 group ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <Avatar className="avatar-mobile h-8 w-8 mt-1">
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
          <AvatarFallback className="text-xs">
            {message.senderName?.substring(0, 2).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`message-bubble-mobile max-w-[70%] ${isOwn ? 'flex flex-col items-end' : ''}`}>
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{message.senderName || "Unknown"}</span>
            <span className="text-xs text-muted-foreground">{getTimestamp()}</span>
          </div>
        )}
        
        <div className={`rounded-lg px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          {isEditing ? (
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleEdit}
              className="bg-transparent border-0 p-0 h-auto min-h-0 text-inherit"
              autoFocus
            />
          ) : (
            <div>
              {/* Render content based on message type */}
              {message.messageType === "image" || message.messageType === "gif" || message.messageType === "sticker" ? (
                <div className="flex flex-col gap-2">
                  {message.mediaUrl && (
                    <img
                      src={message.mediaUrl}
                      alt={message.mediaMetadata?.altText || "Shared media"}
                      className={`rounded-lg max-w-xs ${
                        message.messageType === "sticker" ? "max-h-24" : "max-h-64"
                      } object-contain`}
                      style={{
                        inlineSize: message.mediaMetadata?.width ? Math.min(message.mediaMetadata.width, 300) : "auto",
                        blockSize: message.mediaMetadata?.height ? Math.min(message.mediaMetadata.height, 256) : "auto"
                      }}
                    />
                  )}
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}
              {message.editedAt && (
                <span className="text-xs opacity-70 italic">(edited)</span>
              )}
            </div>
          )}
        </div>

        {isOwn && (
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{getTimestamp()}</span>
          </div>
        )}

        {/* Message actions - only visible on hover */}
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => onReply?.(message.id)}
          >
            <Reply className="h-3 w-3" />
          </Button>
          
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(message.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isOwn && (
        <Avatar className="avatar-mobile h-8 w-8 mt-1">
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
          <AvatarFallback className="text-xs">
            {message.senderName?.substring(0, 2).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export default function TeamChat({ isOpen, onClose }: TeamChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isOpen || !user) return;
    
    // Reset mobile sidebar state when dialog opens
    setShowMobileSidebar(true);
    
    // Mock channels for demonstration
    setChannels([
      {
        id: "team",
        name: "Team Chat",
        type: "team",
        memberCount: 5,
      },
      {
        id: "region",
        name: "Regional Chat",
        type: "region",
        memberCount: 15,
      }
    ]);
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as HTMLElement)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const selectChannel = async (channel: ChatChannel) => {
    setActiveChannel(channel);
    setMessages([]);
    setShowMobileSidebar(false); // Hide sidebar on mobile when channel is selected
    
    // Mock messages for demonstration
    setMessages([
      {
        id: "1",
        content: "Welcome to the team chat!",
        senderId: "other",
        senderName: "Team Bot",
        timestamp: new Date(),
        messageType: "text"
      }
    ]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChannel || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setShowEmojiPicker(false);

    // Mock message sending
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      content: messageContent,
      senderId: user.uid,
      senderName: user.displayName || "You",
      timestamp: new Date(),
      messageType: "text"
    };

    setMessages(prev => [...prev, newMsg]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeChannel || !user) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Mock file upload
    toast({
      title: "Image Upload",
      description: "Image upload feature coming soon!",
    });
  };

  const editMessage = async (messageId: string, content: string) => {
    // Mock message editing
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content, editedAt: new Date() }
        : msg
    ));
  };

  const deleteMessage = async (messageId: string) => {
    // Mock message deletion
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const getChannelIcon = (channel: ChatChannel) => {
    if (channel.type === "region") {
      return <Globe className="h-4 w-4 text-blue-500" />;
    }
    return <MessageCircle className="h-4 w-4 text-green-500" />;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="chat-dialog-mobile max-w-6xl md:max-w-6xl h-[85vh] p-0 flex flex-col">
        <div className="chat-layout-mobile flex md:flex-row h-full min-h-0">
          {/* Sidebar - Channel List */}
          <div className={`chat-sidebar-mobile w-full md:w-80 border-r md:border-r bg-muted/30 flex flex-col ${!showMobileSidebar && activeChannel ? 'hidden md:flex' : 'flex'}`}>
            <DialogHeader className="chat-header-mobile p-4 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  <div>
                    <DialogTitle className="chat-title-mobile">
                      Group Conversations
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Regional and team group chats
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </div>
            </DialogHeader>
            
            <ScrollArea className="flex-1 min-h-0">
              <div className="channel-list-mobile p-3 space-y-3">
                {channels.length === 0 && (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Setting up your chats...</p>
                  </div>
                )}
                
                {channels.map((channel, index) => (
                  <div key={channel.id} className="space-y-2">
                    {index === 0 && channels.length > 1 && (
                      <div className="px-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {channel.type === "region" ? "Regional Chat" : "Team Chat"}
                        </h4>
                      </div>
                    )}
                    {index === 1 && channel.type === "team" && (
                      <div className="px-2 pt-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Team Chat
                        </h4>
                      </div>
                    )}
                    
                    <Button
                      variant={activeChannel?.id === channel.id ? "secondary" : "ghost"}
                      className="channel-item-mobile w-full justify-start h-auto p-3 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectChannel(channel);
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {getChannelIcon(channel)}
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{channel.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {channel.type === "region" 
                              ? "All region members" 
                              : "Team members only"
                            }
                          </div>
                          {channel.lastMessageContent && (
                            <div className="text-xs text-muted-foreground truncate mt-1 max-w-48">
                              {channel.lastMessageSender}: {channel.lastMessageContent}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <div>{channel.memberCount || 0}</div>
                          <div>member{(channel.memberCount || 0) !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    </Button>
                  </div>
                ))}
                
                {channels.length > 0 && (
                  <div className="px-2 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      💡 Switch between regional and team conversations
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Main Chat Area */}
          <div className={`chat-main-mobile flex-1 flex flex-col min-h-0 ${showMobileSidebar && activeChannel ? 'hidden md:flex' : 'flex'}`}>
            {activeChannel ? (
              <>
                {/* Chat Header */}
                <div className="chat-header-mobile p-4 border-b bg-background shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Mobile Back Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="back-button-mobile md:hidden"
                        onClick={() => setShowMobileSidebar(true)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      {getChannelIcon(activeChannel)}
                      <div>
                        <h3 className="font-semibold">{activeChannel.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {activeChannel.type === "region" 
                            ? "Regional group conversation" 
                            : "Team group conversation"
                          } • {activeChannel.memberCount || 0} member{(activeChannel.memberCount || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                    >
                      <Home className="h-4 w-4" />
                      <span className="hidden lg:inline">Dashboard</span>
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 min-h-0 p-4">
                  <div className="space-y-3 max-w-none">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        {activeChannel?.type === "region" ? (
                          <Globe className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                        ) : (
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        )}
                        <h3 className="text-lg font-semibold mb-2">Start the group conversation</h3>
                        <p className="text-muted-foreground">
                          {activeChannel?.type === "region" 
                            ? "Be the first to message your regional group!" 
                            : "Be the first to message your team group!"
                          }
                        </p>
                      </div>
                    )}
                    
                    {messages.map((message) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === user?.uid}
                        onEdit={editMessage}
                        onDelete={deleteMessage}
                        onReply={(messageId) => {
                          console.log("Reply to:", messageId);
                        }}
                      />
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted rounded-lg px-3 py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 border-t bg-background relative">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="chat-button-mobile shrink-0"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="chat-button-mobile shrink-0"
                      disabled={isLoading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      disabled={isLoading}
                      className="chat-input-mobile flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || isLoading} className="chat-button-mobile">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div 
                      ref={emojiPickerRef}
                      className="emoji-picker-mobile absolute bottom-14 left-3 md:bottom-14 md:left-3 bg-background border border-border rounded-lg p-3 shadow-lg z-50 w-80 md:w-80"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Emojis</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEmojiPicker(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
                        {EMOJIS.map((emoji, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted"
                            onClick={() => handleEmojiSelect(emoji)}
                          >
                            <span className="text-lg">{emoji}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  {/* Mobile Menu Button when no channel selected */}
                  <Button
                    variant="outline"
                    size="lg"
                    className="md:hidden mb-4"
                    onClick={() => setShowMobileSidebar(true)}
                  >
                    <Menu className="h-4 w-4 mr-2" />
                    Select Conversation
                  </Button>
                  
                  <div className="flex justify-center gap-4 mb-4">
                    <Globe className="h-8 w-8 text-blue-500" />
                    <MessageCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Select a group conversation</h3>
                  <p className="text-muted-foreground">Choose between regional or team chat to start messaging.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
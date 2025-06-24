"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  time?: string;
  onTimeChange: (time: string | undefined) => void;
  placeholder?: string;
  className?: string;
  timeSlots?: { value: string; label: string }[];
  disabled?: boolean;
  error?: boolean;
}

// Default time slots: 8 AM to 10 PM in 30-minute intervals
const defaultTimeSlots = (() => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    // Add :00 slot
    const hour12 = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour12 === 0 ? 12 : hour12;
    
    slots.push({
      value: `${hour.toString().padStart(2, '0')}:00`,
      label: `${displayHour}:00 ${ampm}`
    });
    
    // Add :30 slot (except for 10:30 PM to keep it until 10 PM)
    if (hour < 22) {
      slots.push({
        value: `${hour.toString().padStart(2, '0')}:30`,
        label: `${displayHour}:30 ${ampm}`
      });
    }
  }
  return slots;
})();

export function TimePicker({
  time,
  onTimeChange,
  placeholder = "Select time",
  className,
  timeSlots = defaultTimeSlots,
  disabled = false,
  error = false,
}: TimePickerProps) {
  const selectedTimeSlot = timeSlots.find(slot => slot.value === time);

  return (
    <Select 
      onValueChange={onTimeChange} 
      value={time}
      disabled={disabled}
    >
      <SelectTrigger 
        className={cn(
          "w-full transition-colors",
          error && "border-destructive",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className
        )}
        aria-label={selectedTimeSlot ? `Selected time: ${selectedTimeSlot.label}` : placeholder}
      >
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-[200px]" position="popper" sideOffset={4}>
        {timeSlots.map((slot) => (
          <SelectItem 
            key={slot.value} 
            value={slot.value}
            className="cursor-pointer"
          >
            {slot.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

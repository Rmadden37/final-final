"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  error?: boolean;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled,
  className,
  minDate,
  maxDate,
  error = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Set client-side flag to enable portal rendering
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Close calendar when clicking outside (simplified since we have overlay)
  React.useEffect(() => {
    // No need for complex click detection since overlay handles it
  }, [open]);

  // Default disabled function to prevent past dates
  const defaultDisabled = React.useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let isDisabled = date < today;
    
    if (minDate) {
      isDisabled = isDisabled || date < minDate;
    }
    
    if (maxDate) {
      isDisabled = isDisabled || date > maxDate;
    }
    
    return isDisabled;
  }, [minDate, maxDate]);

  const finalDisabled = disabled || defaultDisabled;

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal transition-colors",
          !date && "text-muted-foreground",
          error && "border-destructive",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className
        )}
        aria-label={date ? `Selected date: ${format(date, "PPP")}` : placeholder}
        onClick={() => setOpen(!open)}
      >
        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          {date ? format(date, "PPP") : placeholder}
        </span>
      </Button>

      {/* Calendar Portal - Using Portal to prevent dialog layout shifts */}
      {open && isClient && (
        <>
          {/* Invisible overlay to prevent click-through */}
          {createPortal(
            <div 
              className="fixed inset-0 z-[99998]"
              onClick={() => setOpen(false)}
            />,
            document.body
          )}
          {/* Calendar */}
          {createPortal(
            <div 
              data-calendar-portal
              className="fixed z-[99999] bg-background border shadow-xl rounded-md p-0 pointer-events-auto"
              style={{
                top: buttonRef.current 
                  ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 4
                  : 0,
                left: buttonRef.current 
                  ? buttonRef.current.getBoundingClientRect().left + window.scrollX
                  : 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => {
                  if (selectedDate) {
                    onDateChange(selectedDate);
                    setOpen(false);
                  }
                }}
                disabled={finalDisabled}
                initialFocus
                className="rounded-md pointer-events-auto"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground pointer-events-auto",
                  day_today: "bg-accent text-accent-foreground font-semibold pointer-events-auto",
                  day: "pointer-events-auto cursor-pointer",
                  button: "pointer-events-auto",
                }}
              />
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

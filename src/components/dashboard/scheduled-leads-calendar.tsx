"use client";

import React, { useState, useMemo } from "react";
import { format, addDays, startOfDay, isSameDay, isToday, isBefore } from "date-fns";
import { ArrowLeft, ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/types";
import LeadCard from "./lead-card";

interface ScheduledLeadsCalendarProps {
  scheduledLeads: Lead[];
  loading: boolean;
}

export default function ScheduledLeadsCalendar({ scheduledLeads, loading }: ScheduledLeadsCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Debug logging
  console.log(`📅 ScheduledLeadsCalendar received ${scheduledLeads.length} leads:`, scheduledLeads);
  
  // Check for Prince Vegeta specifically
  const princeVegetaLead = scheduledLeads.find(lead => 
    lead.customerName.toLowerCase().includes('prince') || lead.customerName.toLowerCase().includes('vegeta')
  );
  if (princeVegetaLead) {
    console.log('🥦 Prince Vegeta found in calendar:', princeVegetaLead);
  } else {
    console.log('❌ Prince Vegeta not found in calendar leads');
  }

  // Generate the next 14 days starting from today
  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => addDays(today, i));
  }, []);

  // Group leads by date
  const leadsByDate = useMemo(() => {
    const grouped = new Map<string, Lead[]>();
    
    scheduledLeads.forEach(lead => {
      if (lead.scheduledAppointmentTime) {
        const appointmentDate = lead.scheduledAppointmentTime.toDate();
        const dateKey = format(appointmentDate, 'yyyy-MM-dd');
        
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        const dateLeads = grouped.get(dateKey);
        if (dateLeads) {
          dateLeads.push(lead);
        }
      }
    });

    // Sort leads within each date by appointment time
    grouped.forEach(leads => {
      leads.sort((a, b) => {
        const timeA = a.scheduledAppointmentTime?.toDate().getTime() || 0;
        const timeB = b.scheduledAppointmentTime?.toDate().getTime() || 0;
        return timeA - timeB;
      });
    });

    return grouped;
  }, [scheduledLeads]);

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const leadsForSelectedDate = leadsByDate.get(selectedDateKey) || [];

  const goToPreviousDay = () => {
    const currentIndex = dates.findIndex(date => isSameDay(date, selectedDate));
    if (currentIndex > 0) {
      setSelectedDate(dates[currentIndex - 1]);
    }
  };

  const goToNextDay = () => {
    const currentIndex = dates.findIndex(date => isSameDay(date, selectedDate));
    if (currentIndex < dates.length - 1) {
      setSelectedDate(dates[currentIndex + 1]);
    }
  };

  const canGoPrevious = !isSameDay(selectedDate, dates[0]);
  const canGoNext = !isSameDay(selectedDate, dates[dates.length - 1]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Calendar className="h-8 w-8 animate-pulse text-primary mx-auto mb-2 premium:text-premium-teal premium:nav-icon premium:icon-glow-teal premium:icon-pulse" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Date Navigation Header - Responsive */}
      <div className="flex items-center justify-between mb-3 p-2 bg-muted/30 rounded-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousDay}
          disabled={!canGoPrevious}
          className="h-7 w-7 p-0 sm:h-8 sm:w-8 premium:hover:bg-premium-glass/50 premium:hover:glow-premium transition-all duration-300"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 premium:nav-icon premium:icon-glow-purple" />
        </Button>
        
        <div className="text-center">
          <h3 className="font-semibold text-xs sm:text-sm">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
          </h3>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {format(selectedDate, "MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground sm:hidden">
            {format(selectedDate, "MMM d")}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextDay}
          disabled={!canGoNext}
          className="h-7 w-7 p-0 sm:h-8 sm:w-8 premium:hover:bg-premium-glass/50 premium:hover:glow-premium transition-all duration-300"
        >
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 premium:nav-icon premium:icon-glow-purple" />
        </Button>
      </div>

      {/* Horizontal Date Scrollbar - Mobile Optimized */}
      <div className="mb-3">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-1 sm:space-x-2 pb-2">
            {dates.map(date => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const leadsCount = leadsByDate.get(dateKey)?.length || 0;
              const isSelected = isSameDay(date, selectedDate);
              const isPast = isBefore(date, startOfDay(new Date())) && !isToday(date);
              
              return (
                <Button
                  key={dateKey}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDate(date)}
                  className={`
                    flex-shrink-0 flex flex-col items-center p-1.5 sm:p-2 h-auto min-w-[50px] sm:min-w-[60px]
                    ${isPast ? 'opacity-60' : ''}
                    ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                  `}
                >
                  <span className="text-xs font-medium leading-tight">
                    {isToday(date) ? "Today" : format(date, "EEE")}
                  </span>
                  <span className="text-sm font-bold leading-tight">
                    {format(date, "d")}
                  </span>
                  {leadsCount > 0 && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 h-3 min-w-[12px] mt-0.5">
                      {leadsCount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Leads for Selected Date - Mobile Optimized */}
      <div className="flex-1 overflow-hidden">
        {leadsForSelectedDate.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-2 premium:text-premium-teal premium:nav-icon premium:icon-glow-teal" />
              <p className="text-sm sm:text-base text-muted-foreground">
                No appointments for{" "}
                <span className="hidden sm:inline">{format(selectedDate, "MMM d")}</span>
                <span className="sm:hidden">today</span>
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full pr-2 sm:pr-4">
            <div className="space-y-2 sm:space-y-3">
              {leadsForSelectedDate.map(lead => (
                <div key={lead.id} className="border-l-2 sm:border-l-4 border-primary/20 pl-2 sm:pl-3">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <Clock className="h-3 w-3 text-muted-foreground premium:text-premium-teal premium:nav-icon premium:icon-glow-teal" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {lead.scheduledAppointmentTime && 
                        format(lead.scheduledAppointmentTime.toDate(), "h:mm a")
                      }
                    </span>
                  </div>
                  <LeadCard lead={lead} context="queue-scheduled" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

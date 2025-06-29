"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin } from "lucide-react";
import LeadCard from "@/components/dashboard/lead-card";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { format, startOfDay, endOfDay, addDays } from "date-fns";

interface LeadFormWithCalendarProps {
  className?: string;
}

export default function LeadFormWithCalendar({ className }: LeadFormWithCalendarProps) {
  const { user } = useAuth();
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Fetch scheduled leads
  useEffect(() => {
    if (!user?.teamId) return;

    const startDate = startOfDay(selectedDate);
    const endDate = endOfDay(selectedDate);

    const q = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "scheduled"),
      orderBy("scheduledAppointmentTime", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leads = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Lead))
        .filter(lead => {
          if (!lead.scheduledAppointmentTime) return false;
          const appointmentDate = lead.scheduledAppointmentTime.toDate();
          return appointmentDate >= startDate && appointmentDate <= endDate;
        });

      setScheduledLeads(leads);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.teamId, selectedDate]);

  // Generate next 7 days for quick selection
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      date,
      label: format(date, i === 0 ? "'Today'" : i === 1 ? "'Tomorrow'" : "EEE, MMM d"),
      isToday: i === 0,
      isTomorrow: i === 1
    };
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Scheduled Appointments
        </h2>
        <p className="text-muted-foreground">
          View and manage scheduled lead appointments
        </p>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {upcomingDays.map((day, index) => (
              <Button
                key={index}
                variant={selectedDate.toDateString() === day.date.toDateString() ? "default" : "outline"}
                onClick={() => setSelectedDate(day.date)}
                className="h-auto p-3 flex flex-col items-center"
              >
                <span className="text-sm font-medium">{day.label}</span>
                <span className="text-xs text-muted-foreground">
                  {format(day.date, "MMM d")}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Appointments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading appointments...</p>
            </div>
          ) : scheduledLeads.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No appointments scheduled</h3>
              <p className="text-muted-foreground">
                No leads are scheduled for {format(selectedDate, "MMMM d, yyyy")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledLeads.map((lead) => (
                <div key={lead.id} className="border rounded-lg p-4">
                  {lead.scheduledAppointmentTime && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Clock className="h-4 w-4" />
                      <span>
                        Scheduled for {format(lead.scheduledAppointmentTime.toDate(), "h:mm a")}
                      </span>
                    </div>
                  )}
                  <LeadCard lead={lead} context="calendar" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Lead } from "@/types";
import LeadCard from "@/components/performance-dashboard.tsx/lead-card";

interface LeadFormWithCalendarProps {
  scheduledLeads?: Lead[];
}

const LeadFormWithCalendar: React.FC<LeadFormWithCalendarProps> = ({ scheduledLeads = [] }) => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  // Filter scheduled leads for the selected date
  const leadsForSelectedDate = useMemo(() => {
    if (!startDate) return [];
    return scheduledLeads.filter(lead => {
      if (!lead.scheduledAppointmentTime) return false;
      const leadDate = lead.scheduledAppointmentTime.toDate();
      return (
        leadDate.getFullYear() === startDate.getFullYear() &&
        leadDate.getMonth() === startDate.getMonth() &&
        leadDate.getDate() === startDate.getDate()
      );
    });
  }, [scheduledLeads, startDate]);

  return (
    <Dialog open>
      <DialogContent
        className="fixed inset-0 flex items-center justify-center bg-white z-50 p-0 overflow-y-auto"
        style={{ height: 'calc(var(--vh, 1vh) * 100)', maxHeight: '100dvh' }}
      >
        <DialogTitle>
          <span className="sr-only">Select a date for your lead</span>
        </DialogTitle>
        <div className="w-full max-w-md flex flex-col items-center justify-center overflow-y-auto p-4 sm:p-6 mobile:p-2" style={{ maxHeight: '90vh' }}>
          <form className="w-full flex flex-col gap-4">
            <div className="w-full flex justify-center">
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                inline
                calendarClassName="!z-50 w-full max-w-xs sm:max-w-sm mobile:max-w-full"
              />
            </div>
            <input
              type="text"
              placeholder="Lead Name"
              className="block w-full border rounded p-2 text-base mobile:text-sm mobile:p-2"
              autoComplete="off"
            />
            <button type="submit" className="w-full bg-blue-600 text-white rounded p-2 font-semibold text-base mobile:text-sm">Create Lead</button>
          </form>
          {/* Scheduled leads for selected date */}
          <div className="w-full mt-4">
            {leadsForSelectedDate.length > 0 ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto mobile:max-h-none"> {/* On mobile, remove max height to show all leads */}
                <div className="text-xs font-semibold text-gray-500 mb-1">Scheduled leads for this date:</div>
                {leadsForSelectedDate.map(lead => (
                  <LeadCard key={lead.id} lead={lead} context="queue-scheduled" />
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center">No scheduled leads for this date.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormWithCalendar;

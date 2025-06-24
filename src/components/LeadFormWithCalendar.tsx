import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const LeadFormWithCalendar: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  return (
    <Dialog open>
      <DialogContent
        className="fixed inset-0 flex items-center justify-center bg-white z-50 p-0"
        style={{ height: 'calc(var(--vh, 1vh) * 100)', maxHeight: '100dvh' }}
      >
        <DialogTitle>
          <span className="sr-only">Select a date for your lead</span>
        </DialogTitle>
        <div className="w-full max-w-md h-full flex flex-col items-center justify-center overflow-auto p-4">
          <form className="w-full flex flex-col gap-4">
            <DatePicker
              selected={startDate}
              onChange={(date: Date | null) => setStartDate(date)}
              inline
              calendarClassName="!z-50"
            />
            {/* Add your other form fields here */}
            <input
              type="text"
              placeholder="Lead Name"
              className="block w-full border rounded p-2"
              autoComplete="off"
            />
            <button type="submit" className="w-full bg-blue-600 text-white rounded p-2 font-semibold">Create Lead</button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormWithCalendar;

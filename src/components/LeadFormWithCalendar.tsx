import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const LeadFormWithCalendar: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <div className="w-full max-w-md p-4 relative flex flex-col items-center">
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          inline
          calendarClassName="!z-50"
        />
        {/* Add your other form fields here */}
      </div>
    </div>
  );
};

export default LeadFormWithCalendar;

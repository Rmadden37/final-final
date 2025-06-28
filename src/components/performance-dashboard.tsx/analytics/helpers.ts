import { Lead } from "./types";

export const chartConfig = {
  leads: { label: "Leads", color: "#3b82f6" },
  sold: { label: "Sold", color: "#10b981" },
  no_sale: { label: "No Sale", color: "#ef4444" },
  credit_fail: { label: "Failed Credits", color: "#f97316" },
  waiting_assignment: { label: "Waiting Assignment", color: "#8b5cf6" },
  in_process: { label: "In Process", color: "#06b6d4" },
  assigned: { label: "Assigned", color: "#84cc16" },
  canceled: { label: "Canceled", color: "#f59e0b" },
  rescheduled: { label: "Rescheduled", color: "#ec4899" },
  scheduled: { label: "Scheduled", color: "#00FFFF" },
  immediate: { label: "Immediate", color: "#6366f1" },
  accepted: { label: "Accepted", color: "#22c55e" },
  pending: { label: "Pending", color: "#fbbf24" },
  qualified: { label: "Qualified", color: "#14b8a6" },
  unqualified: { label: "Unqualified", color: "#ef4444" },
  callback: { label: "Callback", color: "#a855f7" },
  follow_up: { label: "Follow Up", color: "#f472b6" },
  interested: { label: "Interested", color: "#059669" },
  not_interested: { label: "Not Interested", color: "#dc2626" },
  busy: { label: "Busy", color: "#ea580c" },
  voicemail: { label: "Voicemail", color: "#7c3aed" },
  wrong_number: { label: "Wrong Number", color: "#be123c" },
  do_not_call: { label: "Do Not Call", color: "#991b1b" },
} as const;

export const getLeadDate = (lead: Lead): Date | null => {
  if (!lead.createdAt) return null;
  if (lead.createdAt instanceof Date) return lead.createdAt;
  if (typeof (lead.createdAt as any).seconds === 'number') {
    return new Date((lead.createdAt as any).seconds * 1000);
  }
  return null;
};

export const getChartConfig = (status: string) => {
  const config = chartConfig[status as keyof typeof chartConfig];
  return {
    label: config?.label || status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    color: config?.color || "#64748b"
  };
};

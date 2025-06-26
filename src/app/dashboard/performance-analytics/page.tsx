"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, TrendingUp, ChartBar, Users, Target, PieChart, Activity, Sparkles, Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import PerformanceDashboard from "@/components/analytics/performance-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { callLocalAIAssistant } from "@/lib/local-ai-assistant";
import { useIsMobile } from "@/hooks/use-mobile";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { calculateTeamMetrics } from "@/components/analytics/utils";
import type { Lead } from "@/types";

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface QuickAction {
  icon: React.ReactNode;
  title: string;
  description: string;
  query: string;
  category: 'performance' | 'trends' | 'team';
}

const quickActions: QuickAction[] = [
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Weekly Performance",
    description: "Get this week's sales performance summary",
    query: "Show me this week's sales performance compared to last week",
    category: 'performance'
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Top Performers",
    description: "Who are our best closers this month?",
    query: "Who are the top 5 performing closers this month?",
    category: 'team'
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Pipeline Analysis",
    description: "Review current pipeline status",
    query: "Analyze our current sales pipeline and forecast",
    category: 'trends'
  },
  {
    icon: <PieChart className="h-5 w-5" />,
    title: "Team Distribution",
    description: "How are leads distributed across teams?",
    query: "Show me how leads are distributed across our teams",
    category: 'team'
  },
  {
    icon: <Activity className="h-5 w-5" />,
    title: "Daily Metrics",
    description: "Today's key performance indicators",
    query: "What are today's key metrics and how do they compare to our goals?",
    category: 'performance'
  }
];

const GOOGLE_SHEETS_TRENDING_CSV_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_OVERALL_CSV_URL || process.env.GOOGLE_SHEETS_OVERALL_CSV_URL;

// --- Helper: Parse date string as YYYY-MM-DD
function parseDate(str: string) {
  // Accepts MM/DD/YYYY or YYYY-MM-DD
  if (!str) return null;
  if (str.includes("/")) {
    const [m, d, y] = str.split("/");
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  return new Date(str);
}

// --- Helper: Format date as YYYY-MM-DD consistently ---
function formatDate(date: string | Date) {
  // Accepts string or Date object, always returns 'YYYY-MM-DD'
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

// --- Collapsible Debug Panel ---
function CollapsibleDebugPanel({ trendingData, netSalesTrend }: { trendingData: any[]; netSalesTrend: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-8">
      <button
        className="mb-2 px-3 py-1 rounded bg-gradient-to-r from-blue-700 to-purple-700 text-white text-xs font-semibold shadow hover:opacity-90 transition"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide Debug Panel" : "Show Debug Panel"}
      </button>
      {open && (
        <div className="p-4 rounded-xl bg-[#18192a] border border-blue-900/40 text-xs text-left overflow-x-auto font-mono shadow-lg">
          <div className="font-bold mb-1 text-blue-300">Debug Panel</div>
          <div className="mb-1 text-blue-200"><b>Raw trendingData (first 3 rows):</b></div>
          <pre className="mb-2 text-blue-100">{JSON.stringify(trendingData.slice(0,3), null, 2)}</pre>
          <div className="mb-1 text-purple-200"><b>Processed netSalesTrend (first 3 rows):</b></div>
          <pre className="mb-2 text-purple-100">{JSON.stringify(netSalesTrend.slice(0,3), null, 2)}</pre>
          <div className="text-cyan-300"><b>Total net sales in range:</b> {netSalesTrend.length}</div>
        </div>
      )}
    </div>
  );
}

export default function PerformanceAnalyticsPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hi! I'm your AI sales analytics assistant. I can help you analyze performance data, track trends, and answer questions about your sales metrics. What would you like to know?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<any>({ totalLeads: 0, avgRevenuePerLead: 0 });
  const [region, setRegion] = useState<string>("all");
  const [team, setTeam] = useState<string>("all");
  const [regions, setRegions] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [regionData, setRegionData] = useState<any[]>([]);
  const [trendingData, setTrendingData] = useState<any[]>([]);
  const isMobile = useIsMobile();
  const tabOptions = [
    { value: "dashboard", label: "Performance Dashboard" },
    { value: "setter-overview", label: "Setter Overview" },
    { value: "closer-overview", label: "Closer Overview" },
    { value: "ai-assistant", label: "AI Assistant" },
  ];
  const [selectedTab, setSelectedTab] = useState("dashboard");

  useEffect(() => {
    if (!user?.teamId) return;
    const fetchLeads = async () => {
      const q = query(collection(db, "leads"), where("teamId", "==", user.teamId));
      const snapshot = await getDocs(q);
      const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
      setLeads(leadsData);
      setTeamMetrics(calculateTeamMetrics(leadsData, [], []));
    };
    fetchLeads();
  }, [user?.teamId]);

  useEffect(() => {
    if (!user) return;
    // Fetch regions and teams for admin
    if (user.role === "admin") {
      // Example: fetch regions and teams from Firestore (replace with real logic)
      setRegions(["West", "East", "South", "North"]);
      setTeams(["Team A", "Team B", "Team C"]);
      // Example: regionData for graph
      setRegionData([
        { name: "West", accounts: 120, avgKW: 6.2 },
        { name: "East", accounts: 90, avgKW: 5.8 },
        { name: "South", accounts: 75, avgKW: 6.5 },
        { name: "North", accounts: 60, avgKW: 5.9 },
      ]);
    } else if (user.teamId) {
      // For non-admins, fetch only their team
      const fetchLeads = async () => {
        const q = query(collection(db, "leads"), where("teamId", "==", user.teamId));
        const snapshot = await getDocs(q);
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
        setLeads(leadsData);
        setTeamMetrics(calculateTeamMetrics(leadsData, [], []));
      };
      fetchLeads();
    }
  }, [user]);

  // Fetch trending data from Google Sheets CSV
  useEffect(() => {
    async function fetchTrendingCSV() {
      try {
        const url = GOOGLE_SHEETS_TRENDING_CSV_URL;
        if (!url) return;
        const res = await fetch(url);
        const text = await res.text();
        // Parse CSV (assume first row is header)
        const [header, ...rows] = text.trim().split(/\r?\n/);
        const keys = header.split(",");
        const data = rows.map(row => {
          const values = row.split(",");
          const obj: any = {};
          keys.forEach((k, i) => { obj[k.trim()] = values[i]?.trim(); });
          return obj;
        });
        setTrendingData(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch trending CSV", e);
      }
    }
    fetchTrendingCSV();
  }, []);

  const handleSendMessage = async (messageText?: string) => {
    const question = messageText || inputValue.trim();
    
    if (!question) {
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: question,
      isBot: false,
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      // Call the local AI assistant
      const response = await callLocalAIAssistant({
        message: question,
        context: {
          userRole: (user?.role === 'admin' ? 'manager' : user?.role) as 'setter' | 'closer' | 'manager' || 'closer',
          teamId: user?.teamId || 'default',
          leadCount: 0
        }
      });
      
      // Add bot response
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error calling AI assistant:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `☀️ The cosmic energies are momentarily disrupted! Please try your query again, and the solar wisdom shall illuminate your path.`,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      // Update user message status to error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'error' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredQuickActions = selectedCategory === "all" 
    ? quickActions 
    : quickActions.filter(action => action.category === selectedCategory);

  // --- NEW: Simple Net Sales Cumulative Line Chart ---
  // --- Helper: Fill missing dates in timeline and add projection ---
  function fillTimelineWithProjection(data: { date: string, netSales: number }[], start: Date, end: Date, today?: Date) {
    const dataMap = new Map(data.map(d => [d.date, d.netSales]));
    const result: { date: string, netSales: number, isActual: boolean }[] = [];
    let current = new Date(start);
    let lastValue = 0;
    let lastActualDate: Date | null = null;
    let lastActualValue = 0;
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      if (dataMap.has(key)) {
        lastValue = dataMap.get(key)!;
        result.push({ date: key, netSales: lastValue, isActual: true });
        if (current <= today) {
          lastActualDate = new Date(current);
          lastActualValue = lastValue;
        }
      } else {
        result.push({ date: key, netSales: lastValue, isActual: false });
      }
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  // --- Helper: Fill missing dates in timeline for full 12 months ---
  function fillTimelineFullYear(data: { date: string, netSales: number }[], start: Date, end: Date) {
    const dataMap = new Map(data.map(d => [d.date, d.netSales]));
    const result: { date: string, netSales: number, isActual: boolean }[] = [];
    let current = new Date(start);
    let lastValue = 0;
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      if (dataMap.has(key)) {
        lastValue = dataMap.get(key)!;
        result.push({ date: key, netSales: lastValue, isActual: true });
      } else {
        result.push({ date: key, netSales: lastValue, isActual: false });
      }
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  const netSalesTrendRaw = useMemo(() => {
    if (!trendingData || trendingData.length === 0) return [];
    // Set the start and end dates for the chart
    const startDate = new Date("2024-10-01");
    const endDate = new Date("2025-09-30");
    const filtered = trendingData
      .filter(row => (row["realization"]?.toString().trim() === "1"))
      .map(row => ({
        date: parseDate(row["date_submitted"]?.trim())
      }))
      .filter(row => row.date && row.date >= startDate && row.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const salesByDate: Record<string, number> = {};
    filtered.forEach(row => {
      const key = row.date.toISOString().slice(0, 10);
      salesByDate[key] = (salesByDate[key] || 0) + 1;
    });
    let cumulative = 0;
    // Only include dates between startDate and endDate
    return Object.keys(salesByDate).sort().map(date => {
      cumulative += salesByDate[date];
      return { date, netSales: cumulative };
    });
  }, [trendingData]);

  // --- Helper: Get current and next October 1 dates based on today ---
  function getOct1Range(today = new Date()) {
    const year = today.getMonth() >= 9 ? today.getFullYear() : today.getFullYear() - 1;
    const start = new Date(year, 9, 1); // October is month 9 (0-based)
    const end = new Date(year + 1, 9, 1); // Next year's October 1
    return { start, end };
  }

  // Use getOct1Range for all date ranges in the chart
  const { start: chartStart, end: chartEnd } = getOct1Range();

  const netSalesTrend = useMemo(() => {
    return fillTimelineFullYear(netSalesTrendRaw, chartStart, chartEnd);
  }, [netSalesTrendRaw, chartStart, chartEnd]);

  const xAxisMonthTicks = useMemo(() => getMonthStartTicks(chartStart, chartEnd), [chartStart, chartEnd]);

  // --- Carry-over logic for actual series ---
  const today = new Date();
  const todayStr = formatDate(today);

  // Find the last actual data point (up to today)
  const lastActualIdx = netSalesTrend.slice().reverse().findIndex(d => d.isActual && new Date(d.date) <= today);
  const lastActualAbsIdx = lastActualIdx === -1 ? -1 : netSalesTrend.length - 1 - lastActualIdx;
  const lastActualPoint = lastActualAbsIdx !== -1 ? netSalesTrend[lastActualAbsIdx] : null;

  // Actual series: only up to and including the last actual sale date
  const actualSeries = lastActualAbsIdx !== -1 ? netSalesTrend.slice(0, lastActualAbsIdx + 1).map(d => ({ ...d, date: formatDate(d.date) })) : [];

  // --- XAxis ticks for only the 1st of each month ---
  const { start: chartStart2, end: chartEnd2 } = getOct1Range();
  const xAxisMonthTicks2 = useMemo(() => getMonthStartTicks(chartStart2, chartEnd2), [chartStart2, chartEnd2]);

  // Debug: Log trendingData and processedTrend
  useEffect(() => {
    if (trendingData && trendingData.length > 0) {
      // eslint-disable-next-line no-console
      console.log("[Analytics] trendingData sample:", trendingData.slice(0, 3));
    }
  }, [trendingData]);
  useEffect(() => {
    if (netSalesTrend && netSalesTrend.length > 0) {
      // eslint-disable-next-line no-console
      console.log("[Analytics] netSalesTrend sample:", netSalesTrend.slice(0, 3));
    }
  }, [netSalesTrend]);

  if (!user) return null;

  if (user.role === "setter") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analytics Not Available</h2>
              <p className="text-muted-foreground">Analytics are available for closers and managers only.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Monthly and Weekly Net Sales calculations
  const monthlyNetSales = useMemo(() => {
    // Always use the current Oct-to-Oct range
    const { start, end } = getOct1Range();
    // Build a list of all months in the range
    const monthsArr: { key: string, label: string }[] = [];
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d < end) {
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthsArr.push({ key, label });
      d.setMonth(d.getMonth() + 1);
    }
    // Aggregate sales by month
    const months: { [key: string]: { netSales: number; totalSales: number } } = {};
    trendingData.forEach(row => {
      const date = parseDate(row["date_submitted"]?.trim());
      if (!date || date < start || date >= end) return;
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!months[key]) months[key] = { netSales: 0, totalSales: 0 };
      months[key].totalSales += 1;
      if (row["realization"]?.toString().trim() === "1") {
        months[key].netSales += 1;
      }
    });
    // Fill in all months, even if zero sales
    return monthsArr.map(({ key, label }) => ({
      month: label,
      netSales: months[key]?.netSales || 0,
      totalSales: months[key]?.totalSales || 0
    }));
  }, [trendingData]);

  const weeklyNetSales = useMemo(() => {
    const { start, end } = getOct1Range();
    const weeks: { [key: string]: number } = {};
    netSalesTrend.forEach(d => {
      const date = new Date(d.date);
      if (date >= start && date < end) {
        // Get ISO week string
        const week = `${date.getFullYear()}-W${getISOWeek(date)}`;
        weeks[week] = (weeks[week] || 0) + (d.isActual ? 1 : 0);
      }
    });
    return Object.entries(weeks).map(([week, netSales]) => ({ week, netSales }));
  }, [netSalesTrend]);

  // Helper to get ISO week number
  function getISOWeek(date: Date) {
    const tmp = new Date(date.getTime());
    tmp.setHours(0, 0, 0, 0);
    tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
    const yearStart = new Date(tmp.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo.toString().padStart(2, '0');
  }

  // --- Compute weekly average and annual projected sales for current Oct-to-Oct range ---
  const actualsInRangeWeekly = netSalesTrend.filter(d => d.isActual && new Date(d.date) >= chartStart && new Date(d.date) < chartEnd);
  let weeklyAvg = 0;
  let annualProjectedWeekly = 0;
  if (actualsInRangeWeekly.length > 1) {
    // Get last 12 weeks of actuals
    const lastDate = new Date(actualsInRangeWeekly[actualsInRangeWeekly.length - 1].date);
    const twelveWeeksAgo = new Date(lastDate);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 7 * 12);
    const recentActuals = actualsInRangeWeekly.filter(d => new Date(d.date) > twelveWeeksAgo && new Date(d.date) <= lastDate);
    if (recentActuals.length > 1) {
      const first = recentActuals[0];
      const last = recentActuals[recentActuals.length - 1];
      const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);
      const weeks = days / 7;
      weeklyAvg = weeks > 0 ? (last.netSales - first.netSales) / weeks : 0;
      // --- Annual projection: use 365 days from most recent Oct 1 ---
      const annualDays = 365;
      annualProjectedWeekly = Math.round(weeklyAvg * (annualDays / 7));
    }
  }
  const annualProjectedSales = Math.round(annualProjectedWeekly * 52);

  return (
    <>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
              Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Performance dashboards and AI-powered insights
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Powered
          </Badge>
        </div>

        {/* Move the tab selector (Overview, Setters, Closers, Charts) to the top, remove all other selectors except this */}
        <Tabs
          defaultValue="overview"
          className="w-full"
        >
          <TabsList
            className="w-full flex flex-nowrap overflow-x-auto gap-1 mb-4 border-0 px-0 py-0 bg-gradient-to-br from-[#23243a]/80 to-[#18192a]/80 dark:from-[#23243a]/80 dark:to-[#18192a]/80 backdrop-blur-md rounded-xl shadow-lg"
            style={{ fontSize: '1rem', background: 'rgba(30,32,50,0.7)', boxShadow: '0 4px 24px 0 rgba(30,32,50,0.18)' }}
          >
            <TabsTrigger value="overview" className="flex-1 min-w-[110px] px-0 py-2 text-base sm:text-base whitespace-nowrap text-ellipsis overflow-hidden flex items-center gap-2 justify-center font-semibold rounded-none bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-none">
              Overview
            </TabsTrigger>
            <TabsTrigger value="setters" className="flex-1 min-w-[110px] px-0 py-2 text-base sm:text-base whitespace-nowrap text-ellipsis overflow-hidden flex items-center gap-2 justify-center font-semibold rounded-none bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-none">
              Setters
            </TabsTrigger>
            <TabsTrigger value="closers" className="flex-1 min-w-[110px] px-0 py-2 text-base sm:text-base whitespace-nowrap text-ellipsis overflow-hidden flex items-center gap-2 justify-center font-semibold rounded-none bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-none">
              Closers
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex-1 min-w-[110px] px-0 py-2 text-base sm:text-base whitespace-nowrap text-ellipsis overflow-hidden flex items-center gap-2 justify-center font-semibold rounded-none bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-none">
              Charts
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="flex-1 min-w-[110px] px-0 py-2 text-base sm:text-base whitespace-nowrap text-ellipsis overflow-hidden flex items-center gap-2 justify-center font-semibold rounded-none bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-none">
              AI Assistant
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card className="analytics-card shadow-2xl border-0 bg-gradient-to-br from-[#23243a]/90 to-[#18192a]/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white drop-shadow">
                  <ChartBar className="h-7 w-7 text-blue-400" />
                  Net Sales Trend (Oct 1, 2024 – Oct 1, 2025)
                </CardTitle>
                <CardDescription className="text-blue-200">
                  Weekly Average Sales (last 12 weeks): <b>{weeklyAvg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b> &nbsp;|&nbsp; Annual Projected Sales: <b>{annualProjectedWeekly.toLocaleString()}</b>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={420}>
                    <LineChart
                      data={netSalesTrend}
                    >
                      <defs>
                        <linearGradient id="colorNetSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e2e4d" />
                      <XAxis
                        dataKey="date"
                        type="category"
                        domain={[formatDate(chartStart), formatDate(chartEnd)]}
                        tick={{ fill: '#b3baff', fontSize: 13 }}
                        minTickGap={24}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                        ticks={xAxisMonthTicks}
                        tickFormatter={d => xAxisMonthTicks.includes(d) ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}
                      />
                      <YAxis yAxisId="left" orientation="left" stroke="#6366f1" label={{ value: 'Cumulative Net Accounts', angle: -90, position: 'insideLeft', fill: '#b3baff', fontSize: 13 }} tick={{ fill: '#b3baff', fontSize: 13 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#23243a', border: '1px solid #6366f1', color: '#fff', borderRadius: 8, fontSize: 13, inlineSize: 320, whiteSpace: 'pre-line' }}
                        wrapperStyle={{ zIndex: 1000, pointerEvents: 'auto' }}
                      />
                      <Legend wrapperStyle={{ color: '#b3baff' }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="netSales"
                        stroke="#6366f1"
                        strokeWidth={3}
                        name="Net Accounts"
                        data={actualSeries}
                        dot={({ cx, cy, payload, ...rest }) => {
                          if (payload.date === todayStr) {
                            return (
                              <circle
                                key={payload.date}
                                cx={cx}
                                cy={cy}
                                r={7}
                                fill="#6366f1"
                                filter="drop-shadow(0 0 8px #6366f1)"
                              />
                            );
                          }
                          return null;
                        }}
                        isAnimationActive={false}
                        strokeDasharray="0"
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Net Sales Snapshot Card */}
            <Card className="analytics-card shadow-2xl border-0 bg-gradient-to-br from-[#23243a]/90 to-[#18192a]/90 backdrop-blur-xl mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-white drop-shadow">
                  <ChartBar className="h-6 w-6 text-blue-400" />
                  Monthly Net Sales Snapshot
                </CardTitle>
                <CardDescription className="text-blue-200">
                  Total Gross, Total Net, Realization %.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyNetSales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e2e4d" />
                      <XAxis dataKey="month" tick={{ fill: '#b3baff', fontSize: 13 }} interval={0} angle={-30} textAnchor="end" />
                      <YAxis tick={{ fill: '#b3baff', fontSize: 13 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#23243a', border: '1px solid #6366f1', color: '#fff', borderRadius: 8, fontSize: 13 }} />
                      <Legend wrapperStyle={{ color: '#b3baff' }} />
                      <Bar dataKey="totalSales" fill="#6366f1" name="Total Sales" label={{ position: 'top', fill: '#b3baff', fontSize: 13 }} activeBar={{ fill: '#6366f1', stroke: 'none' }} />
                      <Bar dataKey="netSales" fill="#a5b4fc" name="Net Sales" label={{ position: 'top', fill: '#a5b4fc', fontSize: 13 }} activeBar={{ fill: '#a5b4fc', stroke: 'none' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Debug Panel (optional, can be removed) */}
            <CollapsibleDebugPanel trendingData={trendingData} netSalesTrend={netSalesTrend} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// --- Helper: Get 1st of each month between two dates as YYYY-MM-DD strings ---
function getMonthStartTicks(start: Date, end: Date) {
  const ticks: string[] = [];
  let d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    ticks.push(d.toISOString().slice(0, 10));
    d.setMonth(d.getMonth() + 1);
  }
  return ticks;
}

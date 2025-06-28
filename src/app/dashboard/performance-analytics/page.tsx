"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, TrendingUp, ChartBar, Users, Target, PieChart, Activity, Sparkles, Loader2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  if (!str) return null;
  if (str.includes("/")) {
    const [m, d, y] = str.split("/");
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  return new Date(str);
}

// --- Helper: Format date as YYYY-MM-DD consistently ---
function formatDate(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

// --- Helper: Get current and next October 1 dates based on today ---
function getOct1Range(today = new Date()) {
  const year = today.getMonth() >= 9 ? today.getFullYear() : today.getFullYear() - 1;
  const start = new Date(year, 9, 1); // October is month 9 (0-based)
  const end = new Date(year + 1, 9, 1); // Next year's October 1
  return { start, end };
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

// Helper to get ISO week number
function getISOWeek(date: Date) {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo.toString().padStart(2, '0');
}

// --- Collapsible Debug Panel ---
function CollapsibleDebugPanel({ trendingData, netSalesTrend }: { trendingData: any[]; netSalesTrend: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        className="mb-2 px-2 py-1 rounded bg-gradient-to-r from-blue-700 to-purple-700 text-white text-xs font-semibold shadow hover:opacity-90 transition"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide Debug" : "Show Debug"}
      </button>
      {open && (
        <div className="p-3 rounded-lg bg-[#18192a] border border-blue-900/40 text-xs text-left overflow-x-auto font-mono shadow-lg">
          <div className="font-bold mb-1 text-blue-300">Debug Panel</div>
          <div className="mb-1 text-blue-200"><b>Raw data (first 2):</b></div>
          <pre className="mb-2 text-blue-100 text-xs">{JSON.stringify(trendingData.slice(0,2), null, 2)}</pre>
          <div className="mb-1 text-purple-200"><b>Processed (first 2):</b></div>
          <pre className="mb-2 text-purple-100 text-xs">{JSON.stringify(netSalesTrend.slice(0,2), null, 2)}</pre>
          <div className="text-cyan-300"><b>Total:</b> {netSalesTrend.length}</div>
        </div>
      )}
    </div>
  );
}

export default function PerformanceAnalyticsPage() {
  // All hooks must be called at the top level, in the same order every time
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // All useState hooks
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

  // All useEffect hooks
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
      setRegions(["West", "East", "South", "North"]);
      setTeams(["Team A", "Team B", "Team C"]);
      setRegionData([
        { name: "West", accounts: 120, avgKW: 6.2 },
        { name: "East", accounts: 90, avgKW: 5.8 },
        { name: "South", accounts: 75, avgKW: 6.5 },
        { name: "North", accounts: 60, avgKW: 5.9 },
      ]);
    } else if (user.teamId) {
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
        console.error("Failed to fetch trending CSV", e);
      }
    }
    fetchTrendingCSV();
  }, []);

  useEffect(() => {
    if (trendingData && trendingData.length > 0) {
      console.log("[Analytics] trendingData sample:", trendingData.slice(0, 3));
    }
  }, [trendingData]);

  // All useMemo hooks
  const netSalesTrendRaw = useMemo(() => {
    if (!trendingData || trendingData.length === 0) return [];
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
    return Object.keys(salesByDate).sort().map(date => {
      cumulative += salesByDate[date];
      return { date, netSales: cumulative };
    });
  }, [trendingData]);

  const { start: chartStart, end: chartEnd } = useMemo(() => getOct1Range(), []);

  const netSalesTrend = useMemo(() => {
    return fillTimelineFullYear(netSalesTrendRaw, chartStart, chartEnd);
  }, [netSalesTrendRaw, chartStart, chartEnd]);

  const xAxisMonthTicks = useMemo(() => getMonthStartTicks(chartStart, chartEnd), [chartStart, chartEnd]);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDate(today), [today]);

  // NEW: Updated calculation with projection
  const { actualSeries, projectionSeries, fullYearSeries, weeklyAverage } = useMemo(() => {
    // Find the last actual data point (up to today)
    const lastActualIdx = netSalesTrend.slice().reverse().findIndex(d => d.isActual && new Date(d.date) <= today);
    const lastActualAbsIdx = lastActualIdx === -1 ? -1 : netSalesTrend.length - 1 - lastActualIdx;
    
    // Actual series: only up to and including the last actual sale date
    const actualSeries = lastActualAbsIdx !== -1 
      ? netSalesTrend.slice(0, lastActualAbsIdx + 1).map(d => ({ 
          ...d, 
          date: formatDate(d.date),
          netSales: d.netSales,
          projectedSales: null // No projection data for actual series
        })) 
      : [];

    // Calculate weekly average from past 12 weeks of actual data
    let weeklyAverage = 0;
    if (actualSeries.length > 0) {
      const lastActualDate = new Date(actualSeries[actualSeries.length - 1].date);
      const twelveWeeksAgo = new Date(lastActualDate);
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (7 * 12)); // 12 weeks ago
      
      const recentActuals = actualSeries.filter(d => {
        const date = new Date(d.date);
        return date >= twelveWeeksAgo && date <= lastActualDate;
      });
      
      if (recentActuals.length > 1) {
        const first = recentActuals[0];
        const last = recentActuals[recentActuals.length - 1];
        const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);
        const weeks = days / 7;
        weeklyAverage = weeks > 0 ? (last.netSales - first.netSales) / weeks : 0;
      }
    }

    // Create projection series from last actual point to end of year
    const projectionSeries = [];
    if (lastActualAbsIdx !== -1 && weeklyAverage > 0) {
      const lastActualPoint = actualSeries[actualSeries.length - 1];
      const lastActualDate = new Date(lastActualPoint.date);
      let currentValue = lastActualPoint.netSales;
      
      // Start projection from the day after last actual data
      let projectionDate = new Date(lastActualDate);
      projectionDate.setDate(projectionDate.getDate() + 1);
      
      // Project until end of chart period
      while (projectionDate <= chartEnd) {
        // Add weekly average divided by 7 for daily increment
        currentValue += weeklyAverage / 7;
        
        projectionSeries.push({
          date: formatDate(projectionDate),
          netSales: null, // No actual data for projection
          projectedSales: Math.round(currentValue),
          isActual: false
        });
        
        projectionDate.setDate(projectionDate.getDate() + 1);
      }
    }

    // Combine actual and projection data for full year view
    const fullYearSeries = [
      ...actualSeries,
      ...projectionSeries
    ];

    return { actualSeries, projectionSeries, fullYearSeries, weeklyAverage };
  }, [netSalesTrend, today, chartEnd, chartStart]);

  const monthlyNetSales = useMemo(() => {
    const { start, end } = getOct1Range();
    const monthsArr: { key: string, label: string }[] = [];
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d < end) {
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthsArr.push({ key, label });
      d.setMonth(d.getMonth() + 1);
    }
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
    return monthsArr.map(({ key, label }) => ({
      month: label,
      netSales: months[key]?.netSales || 0,
      totalSales: months[key]?.totalSales || 0
    }));
  }, [trendingData]);

  const filteredQuickActions = useMemo(() => {
    return selectedCategory === "all" 
      ? quickActions 
      : quickActions.filter(action => action.category === selectedCategory);
  }, [selectedCategory]);

  // Event handlers
  const handleSendMessage = async (messageText?: string) => {
    const question = messageText || inputValue.trim();
    
    if (!question) {
      return;
    }

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
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      const response = await callLocalAIAssistant({
        message: question,
        context: {
          userRole: (user?.role === 'admin' ? 'manager' : user?.role) as 'setter' | 'closer' | 'manager' || 'closer',
          teamId: user?.teamId || 'default',
          leadCount: 0
        }
      });
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error calling AI assistant:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `☀️ The cosmic energies are momentarily disrupted! Please try your query again, and the solar wisdom shall illuminate your path.`,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
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

  // Early returns after all hooks
  if (!user) return null;

  if (user.role === "setter") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-sm mx-auto">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2">Analytics Not Available</h2>
              <p className="text-sm text-muted-foreground">Analytics are available for closers and managers only.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-slate-950">
      <div className="container mx-auto p-3 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-3 mt-2 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Performance dashboards and AI-powered insights
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2 w-fit">
            <Sparkles className="h-3 w-3" />
            AI Powered
          </Badge>
        </div>

        {/* Mobile-optimized Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto rounded-lg mb-4 bg-gray-100 dark:bg-slate-800">
            <TabsTrigger value="overview" className="text-xs font-semibold py-2 rounded-lg data-[state=active]:shadow-md data-[state=active]:text-blue-700 data-[state=active]:bg-white dark:data-[state=active]:text-blue-400 dark:data-[state=active]:bg-slate-900">
              Overview
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="text-xs font-semibold py-2 rounded-lg data-[state=active]:shadow-md data-[state=active]:text-blue-700 data-[state=active]:bg-white dark:data-[state=active]:text-blue-400 dark:data-[state=active]:bg-slate-900">
              AI Assistant
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Net Sales Trend Chart with Projection */}
            <Card className="bg-white border border-gray-300 shadow-lg dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <ChartBar className="h-5 w-5 text-blue-400" />
                  Net Sales Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Oct 1, 2024 – Oct 1, 2025 | Weekly Avg: <b>{weeklyAverage.toLocaleString(undefined, { maximumFractionDigits: 1 })}</b> | Annual Projected: <b>{Math.round(weeklyAverage * 52).toLocaleString()}</b>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={fullYearSeries}>
                      <defs>
                        <linearGradient id="colorNetSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6}/>
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                      <XAxis
                        dataKey="date"
                        type="category"
                        domain={[formatDate(chartStart), formatDate(chartEnd)]}
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        minTickGap={20}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        ticks={xAxisMonthTicks}
                        tickFormatter={d => xAxisMonthTicks.includes(d) ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}
                      />
                      <YAxis 
                        stroke="#6366f1" 
                        tick={{ fill: '#6b7280', fontSize: 10 }} 
                        label={{ value: 'Net Accounts', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10 } }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: 8, 
                          fontSize: 12,
                          color: '#374151'
                        }}
                        formatter={(value, name) => {
                          if (name === "Net Accounts (Actual)") {
                            return [value, "Actual Sales"];
                          } else if (name === "Net Accounts (Projected)") {
                            return [value, "Projected Sales"];
                          }
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      
                      {/* Actual Sales Line */}
                      <Line
                        type="monotone"
                        dataKey="netSales"
                        stroke="#6366f1"
                        strokeWidth={3}
                        name="Net Accounts (Actual)"
                        dot={({ cx, cy, payload }) => {
                          if (payload.date === todayStr) {
                            return (
                              <circle
                                key={payload.date}
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill="#6366f1"
                                stroke="#ffffff"
                                strokeWidth={2}
                                filter="drop-shadow(0 0 8px #6366f1)"
                              />
                            );
                          }
                          return null;
                        }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                      
                      {/* Projected Sales Line (Dashed) */}
                      <Line
                        type="monotone"
                        dataKey="projectedSales"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        name="Net Accounts (Projected)"
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Snapshot Chart */}
            <Card className="bg-white border border-gray-300 shadow-lg dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <ChartBar className="h-5 w-5 text-blue-400" />
                  Monthly Snapshot
                </CardTitle>
                <CardDescription className="text-xs">
                  Total Gross vs Net Sales by Month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyNetSales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#6b7280', fontSize: 10 }} 
                        interval={0} 
                        angle={-45} 
                        textAnchor="end" 
                        height={50}
                      />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: 8, 
                          fontSize: 12 
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar 
                        dataKey="totalSales" 
                        fill="#6366f1" 
                        name="Total Sales" 
                        label={{ position: 'top', fontSize: 10 }} 
                      />
                      <Bar 
                        dataKey="netSales" 
                        fill="#a5b4fc" 
                        name="Net Sales" 
                        label={{ position: 'top', fontSize: 10 }} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Debug Panel (collapsible) */}
            <CollapsibleDebugPanel trendingData={trendingData} netSalesTrend={netSalesTrend} />
          </TabsContent>

          {/* AI Assistant Tab Content */}
          <TabsContent value="ai-assistant" className="mt-4 space-y-4">
            <Card className="bg-white border border-gray-300 shadow-lg dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg">AI Sales Assistant</CardTitle>
                <CardDescription className="text-sm">
                  Ask questions about your performance data and get AI-powered insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {filteredQuickActions.slice(0, 4).map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="p-3 h-auto text-left flex items-start gap-3"
                      onClick={() => handleSendMessage(action.query)}
                      disabled={isLoading}
                    >
                      <div className="text-blue-500 mt-1">{action.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Chat Messages */}
                <div className="border rounded-lg p-3 h-64 overflow-y-auto mb-3 bg-gray-50 dark:bg-slate-800">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-3 flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-2 rounded-lg text-sm ${
                          message.isBot
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-900 border'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-blue-500 text-white p-2 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your sales performance..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !inputValue.trim()}
                    size="sm"
                  >
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
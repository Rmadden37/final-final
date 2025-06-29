"use client";

import {useState, useEffect, useMemo} from "react";
import type {Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, limit, Timestamp} from "firebase/firestore";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
  History,
  Search,
  Filter,
  Users,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Clock,
  Loader2,
  Download,
  FileText,
  BarChart3,
  Target,
  Award
} from "lucide-react";
import {format, startOfDay, endOfDay, subDays, subMonths} from "date-fns";
import {useIsMobile} from "@/hooks/use-mobile";
import {ScrollArea} from "@/components/ui/scroll-area";
import VerifiedCheckbox from "@/components/dashboard/verified-checkbox";
import {useRouter} from "next/navigation";

// Rest of the file content - keeping the same logic but just fixing the import
const LEADS_PER_PAGE = 50;

interface FilterState {
  search: string;
  status: string;
  dispatchType: string;
  setterId: string;
  closerId: string;
  dateRange: string;
  startDate?: Date;
  endDate?: Date;
}

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case "sold":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "no_sale":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    case "canceled":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    case "credit_fail":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
    case "scheduled":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "waiting_assignment":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

// Lead card component
function LeadCard({lead, isMobile}: {lead: Lead; isMobile: boolean}) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with status */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{lead.customerName}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3"/>
                {lead.customerPhone}
              </p>
            </div>
            <Badge className={getStatusColor(lead.status)}>
              {lead.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>

          {/* Address */}
          {lead.address && (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0"/>
              {lead.address}
            </p>
          )}

          {/* Metadata grid */}
          <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-2 text-xs`}>
            <div>
              <span className="font-medium">Setter:</span> {lead.setterName}
            </div>
            {lead.assignedCloserName && (
              <div>
                <span className="font-medium">Closer:</span> {lead.assignedCloserName}
              </div>
            )}
            <div>
              <span className="font-medium">Type:</span>{" "}
              <Badge variant="outline" className="text-xs">
                {lead.dispatchType}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3"/>
              <span className="font-medium">Created:</span> {formatDate(lead.createdAt)}
            </div>
          </div>

          {/* Scheduled appointment */}
          {lead.scheduledAppointmentTime && (
            <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded flex items-center gap-1">
              <Calendar className="h-3 w-3 text-blue-600"/>
              <span className="font-medium">Scheduled:</span> {formatDate(lead.scheduledAppointmentTime)}
            </div>
          )}

          {/* Disposition notes */}
          {lead.dispositionNotes && (
            <div className="text-xs bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
              <span className="font-medium">Notes:</span> {lead.dispositionNotes}
            </div>
          )}

          {/* Verification status for managers */}
          <div className="flex items-center justify-between">
         <VerifiedCheckbox lead={lead} size="sm" />
            <span className="text-xs text-muted-foreground">
              ID: {lead.id.slice(-8)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadHistoryPage() {
  const {user, loading: authLoading} = useAuth();
  const {toast} = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    dispatchType: "all",
    setterId: "all",
    closerId: "all",
    dateRange: "30d",
  });

  // Derived filter values
  const dateRangeFilter = useMemo(() => {
    const now = new Date();
    switch (filters.dateRange) {
      case "7d":
        return {start: startOfDay(subDays(now, 7)), end: endOfDay(now)};
      case "30d":
        return {start: startOfDay(subDays(now, 30)), end: endOfDay(now)};
      case "90d":
        return {start: startOfDay(subDays(now, 90)), end: endOfDay(now)};
      case "6m":
        return {start: startOfDay(subMonths(now, 6)), end: endOfDay(now)};
      case "1y":
        return {start: startOfDay(subMonths(now, 12)), end: endOfDay(now)};
      case "custom":
        return filters.startDate && filters.endDate
          ? {start: startOfDay(filters.startDate), end: endOfDay(filters.endDate)}
          : null;
      default:
        return {start: startOfDay(subDays(now, 30)), end: endOfDay(now)};
    }
  }, [filters.dateRange, filters.startDate, filters.endDate]);

  // Auth and permission check
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "manager" && user.role !== "admin"))) {
      router.replace(user ? "/dashboard" : "/login");
      return;
    }
  }, [user, authLoading, router]);

  // Load leads from Firestore
  useEffect(() => {
    if (!user?.teamId || !dateRangeFilter) return;

    setLeadsLoading(true);
    setLeads([]);
    setCurrentPage(1);
    setHasMore(true);

    const baseQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("createdAt", ">=", Timestamp.fromDate(dateRangeFilter.start)),
      where("createdAt", "<=", Timestamp.fromDate(dateRangeFilter.end)),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      baseQuery,
      (querySnapshot) => {
        const leadsData = querySnapshot.docs.map(
          (doc) => ({id: doc.id, ...doc.data()} as Lead)
        );
        setAllLeads(leadsData);
        setLeadsLoading(false);
      },
      (error) => {
        console.error("Error fetching leads:", error);
        toast({
          title: "Error",
          description: "Failed to load leads. Please refresh the page.",
          variant: "destructive",
        });
        setLeadsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.teamId, dateRangeFilter, toast]);

  // Apply filters and pagination
  const filteredAndPaginatedLeads = useMemo(() => {
    let filtered = allLeads;

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.customerName?.toLowerCase().includes(searchLower) ||
          lead.customerPhone?.includes(searchLower) ||
          lead.address?.toLowerCase().includes(searchLower) ||
          lead.setterName?.toLowerCase().includes(searchLower) ||
          lead.assignedCloserName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((lead) => lead.status === filters.status);
    }

    // Apply dispatch type filter
    if (filters.dispatchType !== "all") {
      filtered = filtered.filter((lead) => lead.dispatchType === filters.dispatchType);
    }

    // Apply setter filter
    if (filters.setterId !== "all") {
      filtered = filtered.filter((lead) => lead.setterId === filters.setterId);
    }

    // Apply closer filter
    if (filters.closerId !== "all") {
      filtered = filtered.filter((lead) => lead.assignedCloserId === filters.closerId);
    }

    // Pagination
    const startIndex = 0;
    const endIndex = currentPage * LEADS_PER_PAGE;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    // Update hasMore state
    setHasMore(endIndex < filtered.length);

    return {
      leads: paginatedResults,
      totalCount: filtered.length,
      filteredCount: paginatedResults.length,
    };
  }, [allLeads, filters, currentPage]);

  // Get unique setters and closers for filter dropdowns
  const {uniqueSetters, uniqueClosers} = useMemo(() => {
    const setters = new Map<string, string>();
    const closers = new Map<string, string>();

    allLeads.forEach((lead) => {
      if (lead.setterId && lead.setterName) {
        setters.set(lead.setterId, lead.setterName);
      }
      if (lead.assignedCloserId && lead.assignedCloserName) {
        closers.set(lead.assignedCloserId, lead.assignedCloserName);
      }
    });

    return {
      uniqueSetters: Array.from(setters.entries()).map(([id, name]) => ({id, name})),
      uniqueClosers: Array.from(closers.entries()).map(([id, name]) => ({id, name})),
    };
  }, [allLeads]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredAndPaginatedLeads.totalCount;
    const sold = allLeads.filter((lead) => lead.status === "sold").length;
    const scheduled = allLeads.filter((lead) => lead.status === "scheduled").length;
    const pending = allLeads.filter((lead) => lead.status === "waiting_assignment").length;

    return {
      total,
      sold,
      scheduled,
      pending,
      conversionRate: total > 0 ? ((sold / total) * 100).toFixed(1) : "0.0",
    };
  }, [allLeads, filteredAndPaginatedLeads.totalCount]);

  // Load more functionality
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setCurrentPage((prev) => prev + 1);
      setLoadingMore(false);
    }, 500);
  };

  if (authLoading || leadsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary"/>
      </div>
    );
  }

  if (user?.role !== "manager" && user?.role !== "admin") {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <p className="text-destructive">Access Denied. You must be a manager to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
              <History className="h-8 w-8 text-primary"/>
              Lead History
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive view of all team leads with advanced filtering
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-5"} gap-4`}>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <FileText className="h-3 w-3"/>
                Total Leads
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.sold}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Award className="h-3 w-3"/>
                Sold
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Calendar className="h-3 w-3"/>
                Scheduled
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3"/>
                Pending
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.conversionRate}%</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3"/>
                Conversion
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5"/>
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input
              placeholder="Search by customer name, phone, address, setter, or closer..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({...prev, search: e.target.value}))}
              className="pl-10"
            />
          </div>

          {/* Filter dropdowns */}
          <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3 lg:grid-cols-6"} gap-4`}>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters((prev) => ({...prev, dateRange: value}))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Date Range"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters((prev) => ({...prev, status: value}))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="no_sale">No Sale</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="credit_fail">Credit Failed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="waiting_assignment">Waiting Assignment</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.dispatchType}
              onValueChange={(value) => setFilters((prev) => ({...prev, dispatchType: value}))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Dispatch Type"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.setterId}
              onValueChange={(value) => setFilters((prev) => ({...prev, setterId: value}))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Setter"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Setters</SelectItem>
                {uniqueSetters.map((setter) => (
                  <SelectItem key={setter.id} value={setter.id}>
                    {setter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.closerId}
              onValueChange={(value) => setFilters((prev) => ({...prev, closerId: value}))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Closer"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Closers</SelectItem>
                {uniqueClosers.map((closer) => (
                  <SelectItem key={closer.id} value={closer.id}>
                    {closer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() =>
                setFilters({
                  search: "",
                  status: "all",
                  dispatchType: "all",
                  setterId: "all",
                  closerId: "all",
                  dateRange: "30d",
                })
              }
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5"/>
              Leads ({filteredAndPaginatedLeads.totalCount})
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2"/>
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndPaginatedLeads.leads.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search criteria.
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[600px]">
                <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"}`}>
                  {filteredAndPaginatedLeads.leads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} isMobile={isMobile}/>
                  ))}
                </div>
              </ScrollArea>

              {/* Load more */}
              {hasMore && (
                <div className="text-center mt-6">
                  <Button
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
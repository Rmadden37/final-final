"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import type { Lead } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VerifiedCheckbox from "@/components/performance-dashboard.tsx/verified-checkbox";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Ban,
  CalendarClock,
  CreditCard,
  ClipboardList,
  Search,
  Download,
  Filter,
  Loader2,
  Zap,
  Phone,
  MapPin,
  User,
  Clock,
  ChevronDown,
  Users,
} from "lucide-react";
import { formatDistanceToNow, format as formatDate } from "date-fns";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

const getStatusIcon = (status: Lead["status"]) => {
  switch (status) {
    case "in_process":
      return <Activity className="h-4 w-4 text-blue-500" />;
    case "accepted":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "sold":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "no_sale":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "canceled":
      return <Ban className="h-4 w-4 text-yellow-500" />;
    case "rescheduled":
    case "scheduled":
      return <CalendarClock className="h-4 w-4 text-blue-500" />;
    case "credit_fail":
      return <CreditCard className="h-4 w-4 text-blue-500" />;
    case "waiting_assignment":
      return <ClipboardList className="h-4 w-4 text-gray-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusVariant = (status: Lead["status"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "sold": return "default";
    case "accepted": 
    case "in_process": return "secondary";
    case "no_sale":
    case "credit_fail":
    case "canceled":
      return "destructive";
    case "waiting_assignment":
    case "rescheduled":
    case "scheduled":
      return "outline";
    default: return "outline";
  }
};

export default function LeadManagementSpreadsheet() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dispatchTypeFilter, setDispatchTypeFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string[]>([]);

  useEffect(() => {
    // Allow access to managers and admins with a teamId
    const hasAccess = user?.teamId && (user.role === "manager" || user.role === "admin");
    
    if (!user || !hasAccess) {
      setLoading(false);
      setLeads([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      orderBy("createdAt", "desc"),
      limit(500) // Limit to prevent performance issues
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address || "N/A",
          status: data.status,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: data.createdAt || data.submissionTime,
          updatedAt: data.updatedAt,
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: data.scheduledAppointmentTime || null,
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          photoUrls: data.photoUrls || [],
        } as Lead;
      });
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leads:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch teams data
  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      setTeamsLoading(false);
      return;
    }

    setTeamsLoading(true);
    const teamsQuery = query(
      collection(db, "teams"),
      where("isActive", "==", true)
    );
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Team))
        .filter(team => team.isActive !== false); // Only exclude explicitly inactive teams
      
      setTeams(teamsData);
      setTeamsLoading(false);
    }, (error) => {
      console.error("Error fetching teams:", error);
      setTeamsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter leads based on search and filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customerPhone.includes(searchTerm) ||
      (lead.address && lead.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.assignedCloserName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.setterName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesDispatchType = dispatchTypeFilter === "all" || lead.dispatchType === dispatchTypeFilter;
    const matchesTeam = teamFilter.length === 0 || teamFilter.includes(lead.teamId);

    return matchesSearch && matchesStatus && matchesDispatchType && matchesTeam;
  });

  // Helper functions for team filter
  const handleTeamToggle = (teamId: string) => {
    setTeamFilter(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const clearTeamFilters = () => {
    setTeamFilter([]);
  };

  const selectAllTeams = () => {
    setTeamFilter(teams.map(team => team.id));
  };

  const exportToCSV = () => {
    const headers = [
      "Customer Name",
      "Phone",
      "Address", 
      "Status",
      "Team",
      "Dispatch Type",
      "Assigned Closer",
      "Setter",
      "Created",
      "Updated",
      "Scheduled Time",
      "Disposition Notes"
    ];

    const csvContent = [
      headers.join(","),
      ...filteredLeads.map(lead => [
        `"${lead.customerName}"`,
        `"${lead.customerPhone}"`,
        `"${lead.address}"`,
        `"${lead.status}"`,
        `"${teams.find(t => t.id === lead.teamId)?.name || lead.teamId}"`,
        `"${lead.dispatchType}"`,
        `"${lead.assignedCloserName || 'Unassigned'}"`,
        `"${lead.setterName || 'Unknown'}"`,
        `"${lead.createdAt ? formatDate(lead.createdAt.toDate(), "MM/dd/yyyy HH:mm") : 'N/A'}"`,
        `"${lead.updatedAt ? formatDate(lead.updatedAt.toDate(), "MM/dd/yyyy HH:mm") : 'N/A'}"`,
        `"${lead.scheduledAppointmentTime ? formatDate(lead.scheduledAppointmentTime.toDate(), "MM/dd/yyyy HH:mm") : 'N/A'}"`,
        `"${lead.dispositionNotes || 'None'}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `leads-export-${formatDate(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Allow access to managers and admins with a teamId
  if (!user || !(user.teamId && (user.role === "manager" || user.role === "admin"))) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Access denied. Manager or admin access required.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <ClipboardList className="mr-2 h-5 w-5" />
            Lead History Spreadsheet
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{filteredLeads.length} leads</Badge>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, phone, address, closer, or setter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Teams Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-between">
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {teamsLoading 
                    ? "Loading..." 
                    : teamFilter.length === 0 
                      ? "All Teams" 
                      : teamFilter.length === 1 
                        ? teams.find(t => t.id === teamFilter[0])?.name || "Team"
                        : `${teamFilter.length} Teams`
                  }
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Filter by Teams</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllTeams}
                      className="h-6 px-2 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTeamFilters}
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="p-2">
                  {teamsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading teams...</span>
                    </div>
                  ) : teams.length > 0 ? (
                    teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                        onClick={() => handleTeamToggle(team.id)}
                      >
                        <Checkbox
                          checked={teamFilter.includes(team.id)}
                          onCheckedChange={() => handleTeamToggle(team.id)}
                        />
                        <label className="text-sm cursor-pointer flex-1">
                          {team.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground p-2">
                      No teams available
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="waiting_assignment">Waiting Assignment</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="in_process">In Process</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="no_sale">No Sale</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="rescheduled">Rescheduled</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="credit_fail">Credit Fail</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dispatchTypeFilter} onValueChange={setDispatchTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Dispatch type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Customer</TableHead>
                  <TableHead className="w-[120px]">Phone</TableHead>
                  <TableHead className="w-[200px]">Address</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Verified</TableHead>
                  <TableHead className="w-[100px]">Team</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[120px]">Assigned To</TableHead>
                  <TableHead className="w-[100px]">Setter</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[150px]">Scheduled</TableHead>
                  <TableHead className="w-[200px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2 text-muted-foreground">Loading leads...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">No leads found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          {lead.customerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                          {lead.customerPhone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[180px]" title={lead.address}>
                            {lead.address}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(lead.status)} className="flex items-center gap-1">
                          {getStatusIcon(lead.status)}
                          {lead.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <VerifiedCheckbox 
                          leadId={lead.id} 
                          className="flex justify-center"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[80px]" title={teams.find(t => t.id === lead.teamId)?.name || lead.teamId}>
                            {teams.find(t => t.id === lead.teamId)?.name || lead.teamId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Zap className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{lead.dispatchType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.assignedCloserName || (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.setterName || (
                          <span className="text-muted-foreground italic">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          {lead.createdAt ? (
                            <span className="text-xs">
                              {formatDistanceToNow(lead.createdAt.toDate(), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.scheduledAppointmentTime ? (
                          <span className="text-xs text-blue-600 font-medium">
                            {formatDate(lead.scheduledAppointmentTime.toDate(), "MMM d, p")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs max-w-[180px] truncate block" title={lead.dispositionNotes}>
                          {lead.dispositionNotes || (
                            <span className="text-muted-foreground italic">No notes</span>
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

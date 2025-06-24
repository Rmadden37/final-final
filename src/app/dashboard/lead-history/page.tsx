"use client";

import {useState, useEffect, useMemo} from "react";
import type {Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp} from "firebase/firestore";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Calendar,
  Phone,
  MapPin,
  User,
  Clock,
  Check,
  X,
  Edit,
} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useRouter} from "next/navigation";
import {format} from "date-fns";
import VerifiedCheckbox from "@/components/dashboard/verified-checkbox";

export default function LeadManagementPage() {
  const {user, loading: authLoading} = useAuth();
  const {toast} = useToast();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dispatchFilter, setDispatchFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  
  // Inline editing state
  const [editingLead, setEditingLead] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: string | number}>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "manager" && user.role !== "admin"))) {
      router.replace(user ? "/dashboard" : "/login");
      return;
    }

    if (user && user.teamId && (user.role === "manager" || user.role === "admin")) {
      setLeadsLoading(true);
      const q = query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const leadsData = querySnapshot.docs.map(
            (doc) => ({id: doc.id, ...doc.data()} as Lead)
          );
          setLeads(leadsData);
          setLeadsLoading(false);
        },
        (_error) => {
          toast({
            title: "Error",
            description: "Failed to load leads. Please refresh the page.",
            variant: "destructive",
          });
          setLeadsLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, authLoading, router, toast]);

  // Filtered and searched leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customerPhone.includes(searchTerm) ||
        (lead.address && lead.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.assignedCloserName && lead.assignedCloserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.setterName && lead.setterName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

      // Dispatch type filter
      const matchesDispatch = dispatchFilter === "all" || lead.dispatchType === dispatchFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== "all") {
        const leadDate = lead.createdAt.toDate();
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            matchesDate = leadDate.toDateString() === now.toDateString();
            break;
          case "week": {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = leadDate >= weekAgo;
            break;
          }
          case "month": {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = leadDate >= monthAgo;
            break;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDispatch && matchesDate;
    });
  }, [leads, searchTerm, statusFilter, dispatchFilter, dateFilter]);

  const getStatusBadgeVariant = (status: string, dispatchType?: string) => {
    // For immediate dispatch leads, show neutral variant for N/A status
    if (dispatchType === "immediate") {
      return "secondary";
    }
    
    switch (status) {
      case "sold":
        return "default";
      case "accepted":
      case "in_process":
        return "secondary";
      case "waiting_assignment":
        return "outline";
      case "scheduled":
        return "outline";
      case "no_sale":
      case "canceled":
        return "destructive";
      case "rescheduled":
        return "secondary";
      default:
        return "outline";
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Customer Name",
      "Phone",
      "Address",
      "Status",
      "Dispatch Type",
      "Assigned Closer",
      "Setter",
      "Created At",
      "Updated At",
      "Scheduled Time"
    ];

    const csvData = filteredLeads.map(lead => [
      lead.customerName,
      lead.customerPhone,
      lead.address || "",
      lead.status,
      lead.dispatchType,
      lead.assignedCloserName || "",
      lead.setterName || "",
      format(lead.createdAt.toDate(), "yyyy-MM-dd HH:mm:ss"),
      format(lead.updatedAt.toDate(), "yyyy-MM-dd HH:mm:ss"),
      lead.scheduledAppointmentTime ? format(lead.scheduledAppointmentTime.toDate(), "yyyy-MM-dd HH:mm:ss") : ""
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    if (typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Start editing a lead
  const startEditing = (lead: Lead) => {
    setEditingLead(lead.id);
    setEditValues({
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      address: lead.address || "",
      status: lead.status,
      dispatchType: lead.dispatchType,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingLead(null);
    setEditValues({});
  };

  // Save changes to Firestore
  const saveChanges = async (leadId: string) => {
    if (!editValues || saving) return;
    
    setSaving(true);
    try {
      const leadRef = doc(db, "leads", leadId);
      await updateDoc(leadRef, {
        ...editValues,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Success",
        description: "Lead information updated successfully.",
      });
      
      setEditingLead(null);
      setEditValues({});
    } catch (error) {
      if (typeof window !== 'undefined') {
        console.error("Error updating lead:", error);
      }
      toast({
        title: "Error",
        description: "Failed to update lead information.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update edit value
  const updateEditValue = (field: string, value: string | number) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (authLoading || leadsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
    <div className="container mx-auto py-6">
      <Card className="shadow-xl">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold font-headline flex items-center">
              <Filter className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {filteredLeads.length} leads
              </Badge>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="waiting_assignment">Waiting Assignment</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="in_process">In Process</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="no_sale">No Sale</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by dispatch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6">
          {filteredLeads.length === 0 && !leadsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || dispatchFilter !== "all" || dateFilter !== "all"
                  ? "No leads match your current filters."
                  : "No leads found for your team."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Customer</TableHead>
                    <TableHead className="w-32">Phone</TableHead>
                    <TableHead className="w-64">Address</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-32">Verified</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead className="w-48">Assigned Closer</TableHead>
                    <TableHead className="w-48">Setter</TableHead>
                    <TableHead className="w-48">Created</TableHead>
                    <TableHead className="w-48">Scheduled</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/50">
                      {/* Customer Name */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {editingLead === lead.id ? (
                            <Input
                              value={editValues.customerName || ""}
                              onChange={(e) => updateEditValue("customerName", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Customer name"
                            />
                          ) : (
                            <span className="font-medium">{lead.customerName}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {editingLead === lead.id ? (
                            <Input
                              value={editValues.customerPhone || ""}
                              onChange={(e) => updateEditValue("customerPhone", e.target.value)}
                              className="h-8 text-sm font-mono"
                              placeholder="Phone number"
                            />
                          ) : (
                            <span className="font-mono text-sm">{lead.customerPhone}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Address */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={editValues.address || ""}
                              onChange={(e) => updateEditValue("address", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Address"
                            />
                          </div>
                        ) : lead.address ? (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-64" title={lead.address}>
                              {lead.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No address</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <Select 
                            value={String(editValues.status || "")} 
                            onValueChange={(value) => updateEditValue("status", value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="waiting_assignment">Waiting Assignment</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="in_process">In Process</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                              <SelectItem value="no_sale">No Sale</SelectItem>
                              <SelectItem value="canceled">Canceled</SelectItem>
                              <SelectItem value="rescheduled">Rescheduled</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getStatusBadgeVariant(lead.status, lead.dispatchType)}>
                            {lead.dispatchType === "immediate" ? "N/A" : lead.status.replace("_", " ")}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Verification */}
                      <TableCell>
                        <VerifiedCheckbox 
                          leadId={lead.id} 
                          disabled={editingLead === lead.id}
                          className="flex justify-center"
                        />
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <Select 
                            value={String(editValues.dispatchType || "")} 
                            onValueChange={(value) => updateEditValue("dispatchType", value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Immediate</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">
                            {lead.dispatchType}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Assigned Closer (Read-only) */}
                      <TableCell>
                        {lead.assignedCloserName ? (
                          <span className="text-sm">{lead.assignedCloserName}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Setter (Read-only) */}
                      <TableCell>
                        {lead.setterName ? (
                          <span className="text-sm">{lead.setterName}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unknown</span>
                        )}
                      </TableCell>

                      {/* Created (Read-only) */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(lead.createdAt.toDate(), "MMM dd, HH:mm")}
                          </span>
                        </div>
                      </TableCell>

                      {/* Scheduled (Read-only) */}
                      <TableCell>
                        {lead.scheduledAppointmentTime ? (
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(lead.scheduledAppointmentTime.toDate(), "MMM dd, HH:mm")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not scheduled</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveChanges(lead.id)}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditing(lead)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, Users, Target, BarChart3 } from "lucide-react";
import type { Lead } from "@/types";

interface AnalyticsDashboardProps {
  leads: Lead[];
  loading: boolean;
}

export default function AnalyticsDashboard({ leads, loading }: AnalyticsDashboardProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate basic metrics
  const totalLeads = leads.length;
  const soldLeads = leads.filter(lead => lead.status === 'sold').length;
  const scheduledLeads = leads.filter(lead => lead.status === 'scheduled').length;
  const pendingLeads = leads.filter(lead => lead.status === 'waiting_assignment').length;
  const conversionRate = totalLeads > 0 ? ((soldLeads / totalLeads) * 100).toFixed(1) : '0.0';

  // Get unique setters and closers
  const uniqueSetters = new Set(leads.map(lead => lead.setterId)).size;
  const uniqueClosers = new Set(leads.map(lead => lead.assignedCloserId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of your team's performance and metrics
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              All leads in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{soldLeads}</div>
            <p className="text-xs text-muted-foreground">
              Successfully closed deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Leads to sales conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{uniqueSetters + uniqueClosers}</div>
            <p className="text-xs text-muted-foreground">
              {uniqueSetters} setters, {uniqueClosers} closers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{soldLeads}</div>
              <div className="text-sm text-muted-foreground">Sold</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{scheduledLeads}</div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pendingLeads}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{totalLeads - soldLeads - scheduledLeads - pendingLeads}</div>
              <div className="text-sm text-muted-foreground">Other</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent activity to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{lead.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.setterName} • {lead.dispatchType}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'sold' ? 'bg-green-100 text-green-800' :
                      lead.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'waiting_assignment' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
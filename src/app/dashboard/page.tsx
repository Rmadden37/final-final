// src/app/dashboard/page.tsx - Clean dashboard without AI components
"use client";

import { useAuth } from "@/hooks/use-auth";
import { redirect } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Users, TrendingUp, Clock, Zap, BarChart3, Target, ArrowUp, ArrowDown, Settings } from "lucide-react";
import InProcessLeads from "@/components/dashboard/in-process-leads";
import LeadQueue from "@/components/dashboard/lead-queue";
import CloserLineup from "@/components/dashboard/closer-lineup";

// Enhanced Quick Stats with real-time data
function QuickStats() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeClosers: 0,
    conversionRate: 0,
    avgResponseTime: '0 min',
    todayLeads: 0,
    loading: true
  });
  const [trends, setTrends] = useState({
    leadsChange: 0,
    closersChange: 0,
    conversionChange: 0,
    responseChange: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        // In a real app, this would fetch from your API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          totalLeads: 156,
          activeClosers: 8,
          conversionRate: 73.2,
          avgResponseTime: '2.3 min',
          todayLeads: 24,
          loading: false
        });

        setTrends({
          leadsChange: 12.5,
          closersChange: 0,
          conversionChange: 3.8,
          responseChange: -0.7
        });
      } catch (error) {
        console.error('Error loading stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTrend = (value: number) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : null;
    
    if (!Icon) return null;
    
    return (
      <div className={`flex items-center text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <Icon className="h-3 w-3 mr-1" />
        {Math.abs(value)}%
      </div>
    );
  };

  if (stats.loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Total Leads</span>
            </div>
            {formatTrend(trends.leadsChange)}
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{stats.totalLeads}</div>
          <div className="text-xs text-blue-600 mt-1">+{stats.todayLeads} today</div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Active Closers</span>
            </div>
            {formatTrend(trends.closersChange)}
          </div>
          <div className="text-2xl font-bold text-green-900 mt-1">{stats.activeClosers}</div>
          <div className="text-xs text-green-600 mt-1">Online now</div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Conversion</span>
            </div>
            {formatTrend(trends.conversionChange)}
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{stats.conversionRate}%</div>
          <div className="text-xs text-purple-600 mt-1">Above target</div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Avg Response</span>
            </div>
            {formatTrend(trends.responseChange)}
          </div>
          <div className="text-2xl font-bold text-orange-900 mt-1">{stats.avgResponseTime}</div>
          <div className="text-xs text-orange-600 mt-1">Improving</div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading component for Suspense fallback
function DashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

// Component to wrap content in Suspense
function DashboardContent() {
  const { user, loading } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show loading state while auth is loading
  if (loading) {
    return <DashboardLoading />;
  }

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth");
  }

  console.log('🏠 Dashboard - User role:', user.role, 'Mobile:', isMobile);

  return (
    <div className="dashboard-page min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile optimized layout */}
      <div className={`${isMobile ? 'dashboard-mobile-grid' : 'dashboard-grid max-w-7xl mx-auto'}`}>
        
        {/* Quick Stats - Always on top */}
        <div className={`${isMobile ? 'order-1' : 'col-span-2'} mb-6 slide-in-up`}>
          <QuickStats />
        </div>
        
        {/* Main content grid */}
        <div className={`${isMobile ? 'order-2 space-y-6' : 'col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6'}`}>
          
          {/* Left Column: Lead Management */}
          <div className={`${isMobile ? 'mobile-card-container' : 'flex flex-col space-y-6 min-h-0'} slide-in-up`} style={{ animationDelay: '0.1s' }}>
            
            {/* In-Process Leads */}
            <div className={`${isMobile ? 'mobile-scroll-container' : 'flex-1 min-h-0'}`}>
              <Suspense fallback={
                <Card className="h-full">
                  <CardContent className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </CardContent>
                </Card>
              }>
                <InProcessLeads />
              </Suspense>
            </div>
            
            {/* Lead Queue - Only for managers/admins */}
            {(user.role === "manager" || user.role === "admin") && (
              <div className={`${isMobile ? 'mobile-card-container mt-4' : 'flex-1 min-h-0'}`}>
                <Suspense fallback={
                  <Card className="h-full">
                    <CardContent className="flex items-center justify-center h-64">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </CardContent>
                  </Card>
                }>
                  <LeadQueue />
                </Suspense>
              </div>
            )}
          </div>

          {/* Right Column: Team Management */}
          <div className={`${isMobile ? 'mobile-card-container' : 'flex flex-col space-y-6 min-h-0'} slide-in-up`} style={{ animationDelay: '0.2s' }}>
            
            {/* Closer Lineup */}
            <div className={`${isMobile ? 'mobile-scroll-container' : 'flex-1 min-h-0'}`}>
              <Suspense fallback={
                <Card className="h-full">
                  <CardContent className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </CardContent>
                </Card>
              }>
                <CloserLineup />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Mobile-specific quick actions */}
        {isMobile && (user.role === "manager" || user.role === "admin") && (
          <div className="order-3 mt-6 slide-in-up" style={{ animationDelay: '0.3s' }}>
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="flex-col h-auto py-3 bg-white hover:bg-blue-50 transition-all duration-200"
                  onClick={() => window.location.href = '/dashboard/lead-history'}
                >
                  <BarChart3 className="h-5 w-5 mb-1 text-blue-600" />
                  <span className="text-sm">Lead History</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-col h-auto py-3 bg-white hover:bg-purple-50 transition-all duration-200"
                  onClick={() => window.location.href = '/dashboard/performance-analytics'}
                >
                  <Target className="h-5 w-5 mb-1 text-purple-600" />
                  <span className="text-sm">Analytics</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-col h-auto py-3 bg-white hover:bg-green-50 transition-all duration-200"
                  onClick={() => window.location.href = '/dashboard/manage-teams'}
                >
                  <Users className="h-5 w-5 mb-1 text-green-600" />
                  <span className="text-sm">Teams</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-col h-auto py-3 bg-white hover:bg-orange-50 transition-all duration-200"
                  onClick={() => window.location.href = '/dashboard/admin-tools'}
                >
                  <Settings className="h-5 w-5 mb-1 text-orange-600" />
                  <span className="text-sm">Settings</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Summary for Desktop */}
        {!isMobile && (user.role === "manager" || user.role === "admin") && (
          <div className="col-span-2 mt-6 slide-in-up" style={{ animationDelay: '0.4s' }}>
            <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-700" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">↗ 23%</div>
                    <div className="text-sm text-gray-600">Conversion Rate Improvement</div>
                    <div className="text-xs text-gray-500 mt-1">vs last month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">2.1m</div>
                    <div className="text-sm text-gray-600">Average Response Time</div>
                    <div className="text-xs text-gray-500 mt-1">28% faster than target</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">94%</div>
                    <div className="text-sm text-gray-600">Team Satisfaction</div>
                    <div className="text-xs text-gray-500 mt-1">based on workload balance</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
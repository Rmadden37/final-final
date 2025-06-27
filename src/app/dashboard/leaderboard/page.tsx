'use client'

import '../../../styles/leaderboard.css'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Trophy, TrendingUp, Users, Target, RefreshCw, Award, Medal, ChevronDown, Calendar } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

interface CloserData {
  name: string
  sales: number
  revenue: number
  totalKW: number
  avgDealSize: number
  matchedProfile?: {
    displayName: string
    photoURL?: string
    email: string
  }
}

interface SetterData {
  name: string
  totalLeads: number
  grossKW: number
  matchedProfile?: {
    displayName: string
    photoURL?: string
    email: string
  }
}

// Helper component for rank badges
const LeaderboardRankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <Badge className="rank-badge gold">
        <Trophy className="rank-icon gold" />
        <span>1st</span>
      </Badge>
    )
  }
  if (rank === 2) {
    return (
      <Badge className="rank-badge silver">
        <Medal className="rank-icon silver" />
        <span>2nd</span>
      </Badge>
    )
  }
  if (rank === 3) {
    return (
      <Badge className="rank-badge bronze">
        <Medal className="rank-icon bronze" />
        <span>3rd</span>
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="rank-badge other">
      #{rank}
    </Badge>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  const [closers, setClosers] = useState<CloserData[]>([])
  const [setters, setSetters] = useState<SetterData[]>([])
  const [selfGen, setSelfGen] = useState<CloserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])

  const [dateFilter, setDateFilter] = useState('ytd')

  // Date filter options
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  
  const startOfYTD = new Date(today.getFullYear() - (today.getMonth() < 9 ? 1 : 0), 9, 1)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfWeek.getDate() - 7)
  
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const dateFilters = [
    { label: 'Today', value: 'today', start: startOfToday },
    { label: 'Yesterday', value: 'yesterday', start: yesterday, end: yesterday },
    { label: 'LW (Last Week)', value: 'lw', start: startOfLastWeek, end: new Date(startOfWeek.getTime() - 1) },
    { label: 'WTD', value: 'wtd', start: startOfWeek },
    { label: 'MTD', value: 'mtd', start: startOfMonth },
    { label: 'YTD', value: 'ytd', start: startOfYTD },
  ]

  // Fetch users for photo matching
  useEffect(() => {
    async function fetchUsers() {
      try {
        console.log('🔄 Fetching users from simple-users API...')
        const response = await fetch('/api/simple-users')
        const data = await response.json()
        console.log('✅ Users fetched:', data.users)
        setAllUsers(data.users || [])
      } catch (e) {
        console.error('❌ Error fetching users:', e)
        setAllUsers([])
      }
    }
    fetchUsers()
  }, [])

  // Memoize dateFilters to prevent unnecessary re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedDateFilters = useMemo(() => dateFilters, [])

  // Simple name matching - find user photo by matching names
  const findUserPhoto = useCallback((leaderboardName: string): { displayName: string; photoURL?: string } | undefined => {
    if (!leaderboardName || !allUsers.length) return undefined
    
    const name = leaderboardName.trim()
    console.log(`🔍 Trying to match: "${name}"`)
    console.log(`📋 Available users:`, allUsers.map(u => u.displayName))
    
    // Try exact match first
    let user = allUsers.find(u => u.displayName?.trim().toLowerCase() === name.toLowerCase())
    if (user) {
      console.log(`✅ Exact match found: "${name}" -> "${user.displayName}" with photo: ${user.photoURL}`)
      return user
    }
    
    // Try matching without middle names/initials
    const nameParts = name.split(' ').filter(p => p.length > 1) // ignore initials
    if (nameParts.length >= 2) {
      const firstName = nameParts[0]
      const lastName = nameParts[nameParts.length - 1]
      
      user = allUsers.find(u => {
        if (!u.displayName) return false
        const userParts = u.displayName.trim().split(' ').filter(p => p.length > 1)
        if (userParts.length < 2) return false
        
        return firstName.toLowerCase() === userParts[0].toLowerCase() && 
               lastName.toLowerCase() === userParts[userParts.length - 1].toLowerCase()
      })
      if (user) {
        console.log(`✅ Fuzzy match found: "${name}" -> "${user.displayName}" with photo: ${user.photoURL}`)
        return user
      }
    }
    
    console.log(`❌ No match found for: "${name}"`)
    return undefined
  }, [allUsers])

  // Check if a date is in the selected range
  const isInDateRange = useCallback((dateStr: string): boolean => {
    const filter = memoizedDateFilters.find(f => f.value === dateFilter)
    if (!filter) return true
    
    if (!dateStr || dateStr.trim() === '') return false
    
    let date: Date | null = null
    const trimmedDate = dateStr.trim()
    
    // Try multiple date formats that Google Sheets commonly uses
    try {
      // Format 1: M/D/YYYY or MM/DD/YYYY
      if (trimmedDate.includes('/')) {
        const parts = trimmedDate.split('/')
        if (parts.length === 3) {
          const [month, day, year] = parts
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
      }
      // Format 2: YYYY-MM-DD
      else if (trimmedDate.includes('-') && trimmedDate.length >= 8) {
        date = new Date(trimmedDate)
      }
      // Format 3: MM-DD-YYYY
      else if (trimmedDate.includes('-')) {
        const parts = trimmedDate.split('-')
        if (parts.length === 3) {
          const [month, day, year] = parts
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
      }
      // Format 4: Try direct parsing (handles many formats automatically)
      else {
        date = new Date(trimmedDate)
      }
      
      // Validate the parsed date
      if (!date || isNaN(date.getTime())) {
        console.warn('❌ Could not parse date:', trimmedDate)
        return false
      }
      
      // Handle specific date ranges with end dates
      if (filter.end) {
        return date >= filter.start && date <= filter.end
      }
      
      // Handle ranges that go until today
      return date >= filter.start
      
    } catch (error) {
      console.error('❌ Date parsing error for:', trimmedDate, error)
      return false
    }
  }, [dateFilter, memoizedDateFilters])

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/leaderboard-data')
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const { data } = await response.json()
      
      // Process closers - group by name and aggregate
      const closerStats = new Map<string, CloserData>()
      const setterStats = new Map<string, SetterData>()
      const selfGenStats = new Map<string, CloserData>()
      
      data.forEach((row: any) => {
        const closer = row.closer_name?.trim()
        const setter = row.setter_name?.trim()
        const isRealized = row.realization === '1'
        const kw = parseFloat(row.kw || '0')
        const ppw = parseFloat(row.net_ppw || '0')
        const revenue = kw * ppw
        const date = row.date_submitted
        
        // Apply date filter
        if (date && !isInDateRange(date)) return
        
        // Process closer data (only Net Deals where realization = 1)
        if (closer && isRealized) {
          if (!closerStats.has(closer)) {
            const userMatch = findUserPhoto(closer)
            
            closerStats.set(closer, {
              name: closer,
              sales: 0,
              revenue: 0, // Keep for interface compatibility but not displayed
              totalKW: 0,
              avgDealSize: 0, // Keep for interface compatibility but not displayed
              matchedProfile: userMatch ? {
                displayName: userMatch.displayName,
                photoURL: userMatch.photoURL,
                email: userMatch.displayName + '@company.com' // Placeholder email
              } : undefined
            })
          }
          const stats = closerStats.get(closer)!
          stats.sales += 1  // Count of Net Deals
          stats.totalKW += kw  // Sum of kW for Net Deals
        }
        
        // Process setter data (all leads - gross deals and gross kW)
        if (setter) {
          if (!setterStats.has(setter)) {
            const userMatch = findUserPhoto(setter)
            
            setterStats.set(setter, {
              name: setter,
              totalLeads: 0,
              grossKW: 0,
              matchedProfile: userMatch ? {
                displayName: userMatch.displayName,
                photoURL: userMatch.photoURL,
                email: userMatch.displayName + '@company.com' // Placeholder email
              } : undefined
            })
          }
          const stats = setterStats.get(setter)!
          stats.totalLeads += 1
          stats.grossKW += kw  // Add all kW regardless of realization
        }
        
        // Process self-gen data (setter === closer and net account)
        if (setter && closer && setter === closer && isRealized) {
          if (!selfGenStats.has(setter)) {
            const userMatch = findUserPhoto(setter)
            
            selfGenStats.set(setter, {
              name: setter,
              sales: 0,
              revenue: 0,
              totalKW: 0,
              avgDealSize: 0,
              matchedProfile: userMatch ? {
                displayName: userMatch.displayName,
                photoURL: userMatch.photoURL,
                email: userMatch.displayName + '@company.com'
              } : undefined
            })
          }
          const stats = selfGenStats.get(setter)!
          stats.sales += 1
          stats.totalKW += kw
        }
      })
      
      // Convert to arrays and sort
      const closersArray = Array.from(closerStats.values())
        .sort((a, b) => b.totalKW - a.totalKW)  // Rank by total kW (highest first)
      
      const settersArray = Array.from(setterStats.values())
        .sort((a, b) => b.grossKW - a.grossKW)  // Rank by gross kW (highest first)
      
      const selfGenArray = Array.from(selfGenStats.values())
        .sort((a, b) => b.totalKW - a.totalKW)
      
      setClosers(closersArray)
      setSetters(settersArray)
      setSelfGen(selfGenArray)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [findUserPhoto, isInDateRange]) // Dependencies: functions used

  // Load leaderboard data initially and whenever users change
  useEffect(() => {
    loadData()
  }, [loadData]) // Re-run when loadData changes

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatKW = (kw: number) => {
    return kw.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  }

  // Detect premium mode (body or root has .premium class)
  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsPremium(document.body.classList.contains('premium') || document.documentElement.classList.contains('premium'));
    }
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-center h-32 sm:h-64">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-2" />
            <span className="text-sm sm:text-base">Loading leaderboard...</span>
          </div>
        </div>
      </div>
    )
  }

  // Premium card class helpers
  const premiumCard = 'premium card-glass shadow-premium-purple border-premium-glow bg-premium-glass';
  const premiumStat = 'stat-glow';
  const premiumTab = 'bg-gradient-to-r from-premium-purple/20 to-premium-teal/10 border border-premium-glow glow-premium';

  return (
    <div className={`min-h-screen w-full ${isPremium ? 'premium bg-premium-glass' : 'bg-[#f8fafc] dark:bg-slate-950'}`}>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-2 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className={`text-3xl sm:text-4xl font-extrabold mb-1 tracking-tight ${isPremium ? 'text-glow text-white' : 'text-gray-900 dark:text-white'}`}>Performance Leaderboard</h1>
            <p className={`text-base ${isPremium ? 'text-muted-foreground' : 'text-gray-500 dark:text-gray-300'}`}>Track top performers across setters and closers</p>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
          <Button
            onClick={loadData}
            variant="default"
            className={`font-semibold shadow-md px-6 py-2 rounded-lg transition-all ${isPremium ? 'bg-premium-glass border border-premium-glow text-premium-purple hover:bg-premium-glass/80' : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'}`}
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} mr-2 ${isPremium ? 'text-premium-purple' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Date Filter */}
        <Card className={`mb-6 ${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-lg dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <Calendar className={`h-5 w-5 ${isPremium ? 'text-premium-purple' : 'text-gray-400 dark:text-gray-300'}`} />
                <span className={`text-base font-medium ${isPremium ? 'text-premium-purple' : 'text-gray-700 dark:text-white'}`}>Date Range:</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`min-w-[140px] font-medium shadow-none ${isPremium ? 'bg-premium-glass border-premium-glow text-premium-purple' : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700'}`}>
                    <span className="truncate">{dateFilters.find(f => f.value === dateFilter)?.label || 'Select Range'}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                  {dateFilters.map(filter => (
                    <DropdownMenuItem
                      key={filter.value}
                      onClick={() => setDateFilter(filter.value)}
                      className={dateFilter === filter.value ? (isPremium ? 'bg-premium-glass text-premium-purple font-semibold' : 'bg-blue-50 text-blue-700 font-semibold dark:bg-slate-800 dark:text-blue-400') : ''}
                    >
                      {filter.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-lg dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-base font-semibold ${isPremium ? 'text-premium-purple' : 'text-gray-700 dark:text-white'}`}>Total Setters</CardTitle>
              <Users className={`h-5 w-5 ${isPremium ? 'text-premium-teal' : 'text-gray-400 dark:text-gray-300'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isPremium ? premiumStat : 'text-gray-900 dark:text-white'}`}>{setters.length}</div>
            </CardContent>
          </Card>
          <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-lg dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-base font-semibold ${isPremium ? 'text-premium-purple' : 'text-gray-700 dark:text-white'}`}>Total Closers</CardTitle>
              <Target className={`h-5 w-5 ${isPremium ? 'text-premium-teal' : 'text-gray-400 dark:text-gray-300'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isPremium ? premiumStat : 'text-gray-900 dark:text-white'}`}>{closers.length}</div>
            </CardContent>
          </Card>
          <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-lg dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-base font-semibold ${isPremium ? 'text-premium-purple' : 'text-gray-700 dark:text-white'}`}>Total kW (Net Deals)</CardTitle>
              <TrendingUp className={`h-5 w-5 ${isPremium ? 'text-premium-teal' : 'text-gray-400 dark:text-gray-300'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isPremium ? premiumStat : 'text-gray-900 dark:text-white'}`}>{formatKW(closers.reduce((sum, c) => sum + c.totalKW, 0))} kW</div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="closers" className="w-full">
          <TabsList className={`grid w-full grid-cols-3 h-auto rounded-lg mb-4 ${isPremium ? premiumTab : 'bg-gray-100 dark:bg-slate-800'}`}>
            <TabsTrigger value="closers" className={`text-base font-semibold py-2 rounded-lg data-[state=active]:shadow-md data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 ${isPremium ? 'data-[state=active]:bg-premium-glass data-[state=active]:text-premium-purple' : 'data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900'}`}>Top Closers</TabsTrigger>
            <TabsTrigger value="setters" className={`text-base font-semibold py-2 rounded-lg data-[state=active]:shadow-md data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 ${isPremium ? 'data-[state=active]:bg-premium-glass data-[state=active]:text-premium-purple' : 'data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900'}`}>Top Setters</TabsTrigger>
            <TabsTrigger value="selfgen" className={`text-base font-semibold py-2 rounded-lg data-[state=active]:shadow-md data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 ${isPremium ? 'data-[state=active]:bg-premium-glass data-[state=active]:text-premium-purple' : 'data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900'}`}>Top Self-Gen</TabsTrigger>
          </TabsList>

          {/* Top Closers Tab Content */}
          <TabsContent value="closers" className="leaderboard-container">
            <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
              <CardHeader className="leaderboard-card-header">
                <CardTitle className={`leaderboard-card-title ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                  Top Closers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="leaderboard-container">
                  {closers.slice(0, 10).map((closer, index) => {
                    const displayName = closer.matchedProfile?.displayName || closer.name;
                    const avatarUrl = closer.matchedProfile?.photoURL;
                    const isTopRank = index === 0;
                    
                    return (
                      <div
                        key={closer.name}
                        className={`leaderboard-card ${isTopRank ? 'rank-1' : 'rank-other'} ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}
                        style={isTopRank ? { zIndex: 2 } : {}}
                      >
                        <div className="leaderboard-content">
                          <div className="leaderboard-left-section">
                            <div className="shrink-0">
                              <LeaderboardRankBadge rank={index + 1} />
                            </div>
                            
                            <Avatar className={`leaderboard-avatar ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              <AvatarImage 
                                src={avatarUrl || undefined} 
                                alt={displayName} 
                                className="leaderboard-avatar-image" 
                              />
                              <AvatarFallback className={`leaderboard-avatar-fallback ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`leaderboard-name ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                {displayName}
                              </p>
                              <div className="leaderboard-metric-container">
                                <p className={`leaderboard-metric-label ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                  Net Deals:
                                </p>
                                <p className={`leaderboard-metric-value ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                  {closer.sales}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="leaderboard-right-section">
                            <p className={`leaderboard-kw-label ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              Total kW
                            </p>
                            <p className={`leaderboard-kw-value ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              {formatKW(closer.totalKW)}
                            </p>
                            <p className={`leaderboard-kw-unit ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              kW
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {closers.length === 0 && (
                    <div className={`leaderboard-empty ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                      No closer data available for the selected date range.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Setters Tab Content */}
          <TabsContent value="setters" className="leaderboard-container">
            <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
              <CardHeader className="leaderboard-card-header">
                <CardTitle className={`leaderboard-card-title ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                  Top Setters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="leaderboard-container">
                  {setters.slice(0, 10).map((setter, index) => {
                    const displayName = setter.matchedProfile?.displayName || setter.name;
                    const avatarUrl = setter.matchedProfile?.photoURL;
                    const isTopRank = index === 0;
                    
                    return (
                      <div
                        key={setter.name}
                        className={`leaderboard-card ${isTopRank ? 'rank-1' : 'rank-other'} ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}
                        style={isTopRank ? { zIndex: 2 } : {}}
                      >
                        <div className="leaderboard-content">
                          <div className="leaderboard-left-section">
                            <div className="shrink-0">
                              <LeaderboardRankBadge rank={index + 1} />
                            </div>
                            
                            <Avatar className={`leaderboard-avatar ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              <AvatarImage 
                                src={avatarUrl || undefined} 
                                alt={displayName} 
                                className="leaderboard-avatar-image" 
                              />
                              <AvatarFallback className={`leaderboard-avatar-fallback ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`leaderboard-name ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                {displayName}
                              </p>
                              <div className="leaderboard-metric-container">
                                <p className={`leaderboard-metric-label ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                  Gross Deals:
                                </p>
                                <p className={`leaderboard-metric-value ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                  {setter.totalLeads}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="leaderboard-right-section">
                            <p className={`leaderboard-kw-label ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              Gross kW
                            </p>
                            <p className={`leaderboard-kw-value ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              {formatKW(setter.grossKW)}
                            </p>
                            <p className={`leaderboard-kw-unit ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              kW
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {setters.length === 0 && (
                    <div className={`leaderboard-empty ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                      No setter data available for the selected date range.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Self-Gen Tab Content */}
          <TabsContent value="selfgen" className="leaderboard-container">
            <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
              <CardHeader className="leaderboard-card-header">
                <CardTitle className={`leaderboard-card-title ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                  Top Self-Gen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="leaderboard-container">
                  {selfGen.slice(0, 10).map((person, index) => {
                    const displayName = person.matchedProfile?.displayName || person.name;
                    const avatarUrl = person.matchedProfile?.photoURL;
                    const isTopRank = index === 0;
                    
                    return (
                      <div
                        key={person.name}
                        className={`leaderboard-card ${isTopRank ? 'rank-1' : 'rank-other'} ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}
                        style={isTopRank ? { zIndex: 2 } : {}}
                      >
                        <div className="leaderboard-content">
                          <div className="leaderboard-left-section">
                            <div className="shrink-0">
                              <LeaderboardRankBadge rank={index + 1} />
                            </div>
                            
                            <Avatar className={`leaderboard-avatar ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              <AvatarImage 
                                src={avatarUrl || undefined} 
                                alt={displayName} 
                                className="leaderboard-avatar-image" 
                              />
                              <AvatarFallback className={`leaderboard-avatar-fallback ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`leaderboard-name ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                {displayName}
                              </p>
                              <div className="leaderboard-metric-container">
                                <p className={`leaderboard-metric-label ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                  Net Self-Gen Deals:
                                </p>
                                <p className={`leaderboard-metric-value ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                                  {person.sales}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="leaderboard-right-section">
                            <p className={`leaderboard-kw-label ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              Total kW
                            </p>
                            <p className={`leaderboard-kw-value ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              {formatKW(person.totalKW)}
                            </p>
                            <p className={`leaderboard-kw-unit ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                              kW
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {selfGen.length === 0 && (
                    <div className={`leaderboard-empty ${isPremium ? 'premium' : 'default'} ${isPremium ? '' : 'dark'}`}>
                      No self-gen data available for the selected date range.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
'use client'

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
    { label: 'YTD', value: 'ytd', start: startOfYTD },  ]

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
    
    const [month, day, year] = dateStr.split('/')
    if (!month || !day || !year) return false
    
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    // Handle specific date ranges with end dates
    if (filter.end) {
      return date >= filter.start && date <= filter.end
    }
    
    // Handle ranges that go until today
    return date >= filter.start
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

  // Check if a date is in the selected range (formatting functions)

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

  const getRankBadge = (rank: number) => {
    if (rank === 1) return (
      <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 font-bold border-yellow-300 shadow-lg px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-lg">
        <Trophy className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2 text-yellow-700" />
        <span className="hidden sm:inline">1st</span>
        <span className="sm:hidden">1</span>
      </Badge>
    )
    if (rank === 2) return (
      <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-gray-800 font-bold border-gray-400 shadow-lg px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-lg">
        <Medal className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2 text-gray-600" />
        <span className="hidden sm:inline">2nd</span>
        <span className="sm:hidden">2</span>
      </Badge>
    )
    if (rank === 3) return (
      <Badge className="bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 font-bold border-amber-500 shadow-lg px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-lg">
        <Medal className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2 text-amber-200" />
        <span className="hidden sm:inline">3rd</span>
        <span className="sm:hidden">3</span>
      </Badge>
    )
    return <Badge variant="outline" className="font-semibold px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-lg">#{rank}</Badge>
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
  const premiumTop = 'ring-4 ring-premium-purple scale-[1.06] shadow-premium-purple';

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
          <TabsContent value="closers" className="space-y-4">
            <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
              <CardHeader>
                <CardTitle className={`text-xl font-bold ${isPremium ? 'text-premium-purple' : 'text-gray-800 dark:text-white'}`}>Top Closers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {closers.slice(0, 10).map((closer, index) => {
                    const displayName = closer.matchedProfile?.displayName || closer.name;
                    const avatarUrl = closer.matchedProfile?.photoURL;
                    return (
                      <div
                        key={closer.name}
                        className={`flex items-center justify-between p-4 sm:p-6 border rounded-xl bg-gradient-to-r relative overflow-hidden ${isPremium ? (index === 0 ? 'from-premium-purple/40 to-premium-teal/20 ring-4 ring-premium-purple shadow-premium-purple scale-[1.06]' : 'from-premium-purple/10 to-premium-teal/5 border-premium-glow shadow-premium-purple') : (index === 0 ? 'from-blue-100 to-white ring-2 ring-blue-500 shadow-2xl scale-[1.04]' : 'from-white to-gray-50 shadow-lg dark:from-slate-900 dark:to-slate-800')} hover:shadow-2xl active:scale-[0.98] transition-all duration-200 cursor-pointer touch-manipulation`}
                        style={index === 0 ? { zIndex: 2 } : { }}
                      >
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="shrink-0">
                            {getRankBadge(index + 1)}
                          </div>
                          <Avatar className={`h-14 w-14 sm:h-16 sm:w-16 ring-2 ${isPremium ? 'ring-premium-teal' : 'ring-blue-300 dark:ring-blue-900'} bg-white shadow-lg`}>
                            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                            <AvatarFallback className={`text-lg font-bold ${isPremium ? 'text-premium-teal bg-premium-glass' : 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-slate-800'}`}>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-lg sm:text-2xl mb-1 truncate ${isPremium ? 'text-glow' : 'text-gray-900 dark:text-white'}`}>{displayName}</p>
                            <div className="hidden sm:block">
                              <p className={`text-sm font-medium mb-1 ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Net Deals</p>
                              <p className={`font-bold text-xl ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{closer.sales}</p>
                            </div>
                            <div className="sm:hidden">
                              <p className={`text-xs ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Net Deals: <span className={`font-bold ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{closer.sales}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className={`text-xs sm:text-sm font-medium mb-1 ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Total kW</p>
                          <p className={`font-bold text-lg sm:text-2xl ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{formatKW(closer.totalKW)}</p>
                          <p className={`text-xs sm:text-sm ${isPremium ? 'text-premium-purple' : 'text-gray-400 dark:text-gray-500'}`}>kW</p>
                        </div>
                      </div>
                    )
                  })}
                  {closers.length === 0 && (
                    <div className="text-center p-8 text-gray-400 dark:text-gray-500">
                      No closer data available for the selected date range.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Setters Tab Content */}
          <TabsContent value="setters" className="space-y-4">
            <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
              <CardHeader>
                <CardTitle className={`text-xl font-bold ${isPremium ? 'text-premium-purple' : 'text-gray-800 dark:text-white'}`}>Top Setters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {setters.slice(0, 10).map((setter, index) => {
                    const displayName = setter.matchedProfile?.displayName || setter.name;
                    const avatarUrl = setter.matchedProfile?.photoURL;
                    return (
                      <div key={setter.name} className={`flex items-center justify-between p-4 sm:p-6 border rounded-xl bg-gradient-to-r relative overflow-hidden ${isPremium ? (index === 0 ? 'from-premium-purple/40 to-premium-teal/20 ring-4 ring-premium-purple shadow-premium-purple scale-[1.06]' : 'from-premium-purple/10 to-premium-teal/5 border-premium-glow shadow-premium-purple') : (index === 0 ? 'from-blue-100 to-white ring-2 ring-blue-500 shadow-2xl scale-[1.04]' : 'from-white to-gray-50 shadow-lg dark:from-slate-900 dark:to-slate-800')} hover:shadow-2xl active:scale-[0.98] transition-all duration-200 cursor-pointer touch-manipulation`} style={index === 0 ? { zIndex: 2 } : {}}>
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="shrink-0">
                            {getRankBadge(index + 1)}
                          </div>
                          <Avatar className={`h-14 w-14 sm:h-16 sm:w-16 ring-2 ${isPremium ? 'ring-premium-teal' : 'ring-blue-300 dark:ring-blue-900'} bg-white shadow-lg`}>
                            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                            <AvatarFallback className={`text-lg font-bold ${isPremium ? 'text-premium-teal bg-premium-glass' : 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-slate-800'}`}>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-lg sm:text-2xl mb-1 truncate ${isPremium ? 'text-glow' : 'text-gray-900 dark:text-white'}`}>{displayName}</p>
                            <div className="hidden sm:block">
                              <p className={`text-sm font-medium mb-1 ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Gross Deals</p>
                              <p className={`font-bold text-xl ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{setter.totalLeads}</p>
                            </div>
                            <div className="sm:hidden">
                              <p className={`text-xs ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Gross Deals: <span className={`font-bold ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{setter.totalLeads}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className={`text-xs sm:text-sm font-medium mb-1 ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Gross kW</p>
                          <p className={`font-bold text-lg sm:text-2xl ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{formatKW(setter.grossKW)}</p>
                          <p className={`text-xs sm:text-sm ${isPremium ? 'text-premium-purple' : 'text-gray-400 dark:text-gray-500'}`}>kW</p>
                        </div>
                      </div>
                    )
                  })}
                  {setters.length === 0 && (
                    <div className="text-center p-8 text-gray-400 dark:text-gray-500">
                      No setter data available for the selected date range.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Self-Gen Tab Content */}
          <TabsContent value="selfgen" className="space-y-4">
            <Card className={`${isPremium ? premiumCard : 'bg-white border border-gray-300 shadow-xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-lg'}`} data-card>
              <CardHeader>
                <CardTitle className={`text-xl font-bold ${isPremium ? 'text-premium-purple' : 'text-gray-800 dark:text-white'}`}>Top Self-Gen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selfGen.slice(0, 10).map((person, index) => {
                    const displayName = person.matchedProfile?.displayName || person.name;
                    const avatarUrl = person.matchedProfile?.photoURL;
                    return (
                      <div key={person.name} className={`flex items-center justify-between p-4 sm:p-6 border rounded-xl bg-gradient-to-r relative overflow-hidden ${isPremium ? (index === 0 ? 'from-premium-purple/40 to-premium-teal/20 ring-4 ring-premium-purple shadow-premium-purple scale-[1.06]' : 'from-premium-purple/10 to-premium-teal/5 border-premium-glow shadow-premium-purple') : (index === 0 ? 'from-blue-100 to-white ring-2 ring-blue-500 shadow-2xl scale-[1.04]' : 'from-white to-gray-50 shadow-lg dark:from-slate-900 dark:to-slate-800')} hover:shadow-2xl active:scale-[0.98] transition-all duration-200 cursor-pointer touch-manipulation`} style={index === 0 ? { zIndex: 2 } : {}}>
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="shrink-0">
                            {getRankBadge(index + 1)}
                          </div>
                          <Avatar className={`h-14 w-14 sm:h-16 sm:w-16 ring-2 ${isPremium ? 'ring-premium-teal' : 'ring-blue-300 dark:ring-blue-900'} bg-white shadow-lg`}>
                            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                            <AvatarFallback className={`text-lg font-bold ${isPremium ? 'text-premium-teal bg-premium-glass' : 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-slate-800'}`}>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-lg sm:text-2xl mb-1 truncate ${isPremium ? 'text-glow' : 'text-gray-900 dark:text-white'}`}>{displayName}</p>
                            <div className="hidden sm:block">
                              <p className={`text-sm font-medium mb-1 ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Net Self-Gen Deals</p>
                              <p className={`font-bold text-xl ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{person.sales}</p>
                            </div>
                            <div className="sm:hidden">
                              <p className={`text-xs ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Net Self-Gen Deals: <span className={`font-bold ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{person.sales}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className={`text-xs sm:text-sm font-medium mb-1 ${isPremium ? 'text-premium-purple' : 'text-gray-500 dark:text-gray-300'}`}>Total kW</p>
                          <p className={`font-bold text-lg sm:text-2xl ${isPremium ? 'text-premium-teal' : 'text-blue-700 dark:text-blue-300'}`}>{formatKW(person.totalKW)}</p>
                          <p className={`text-xs sm:text-sm ${isPremium ? 'text-premium-purple' : 'text-gray-400 dark:text-gray-500'}`}>kW</p>
                        </div>
                      </div>
                    )
                  })}
                  {selfGen.length === 0 && (
                    <div className="text-center p-8 text-gray-400 dark:text-gray-500">
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

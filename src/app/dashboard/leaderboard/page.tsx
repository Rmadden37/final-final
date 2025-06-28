// Mobile-Optimized Performance Leaderboard Page
// src/app/dashboard/leaderboard/page.tsx

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
      <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-300 font-bold shadow-lg px-3 py-2 text-sm">
        <Trophy className="w-4 h-4 mr-1 text-yellow-700" />
        <span>1st</span>
      </Badge>
    )
  }
  if (rank === 2) {
    return (
      <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-gray-800 border-gray-400 font-bold shadow-lg px-3 py-2 text-sm">
        <Medal className="w-4 h-4 mr-1 text-gray-600" />
        <span>2nd</span>
      </Badge>
    )
  }
  if (rank === 3) {
    return (
      <Badge className="bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border-amber-500 font-bold shadow-lg px-3 py-2 text-sm">
        <Medal className="w-4 h-4 mr-1 text-amber-200" />
        <span>3rd</span>
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="font-semibold px-3 py-2 text-sm border-2">
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
  const endOfLastWeek = new Date(startOfWeek.getTime() - 1) // End of last week
  
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const dateFilters = [
    { label: 'Today', value: 'today', start: startOfToday },
    { label: 'Yesterday', value: 'yesterday', start: yesterday, end: yesterday },
    { label: 'Last Week', value: 'last_week', start: startOfLastWeek, end: endOfLastWeek },
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
      <div className="container mx-auto p-3">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span className="text-sm">Loading leaderboard...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-slate-950">
      <div className="container mx-auto p-3 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-3 mt-2 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 tracking-tight text-gray-900 dark:text-white">Performance Leaderboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-300">Track top performers across setters and closers</p>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
          <Button
            onClick={loadData}
            variant="default"
            className="w-full font-semibold shadow-md px-4 py-3 rounded-lg transition-all bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} mr-2`} />
            Refresh
          </Button>
        </div>

        {/* Date Filter */}
        <Card className="mb-4 bg-white border border-gray-300 shadow-lg">
          <CardContent className="py-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-medium shadow-none bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100">
                    <span className="truncate">{dateFilters.find(f => f.value === dateFilter)?.label || 'Select Range'}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  {dateFilters.map(filter => (
                    <DropdownMenuItem
                      key={filter.value}
                      onClick={() => setDateFilter(filter.value)}
                      className={dateFilter === filter.value ? 'bg-blue-50 text-blue-700 font-semibold' : ''}
                    >
                      {filter.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="closers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto rounded-lg mb-4 bg-gray-100">
            <TabsTrigger value="closers" className="text-sm font-semibold py-2 rounded-lg data-[state=active]:shadow-md data-[state=active]:text-blue-700 data-[state=active]:bg-white">Top Closers</TabsTrigger>
            <TabsTrigger value="setters" className="text-sm font-semibold py-2 rounded-lg data-[state=active]:shadow-md data-[state=active]:text-blue-700 data-[state=active]:bg-white">Top Setters</TabsTrigger>
            <TabsTrigger value="selfgen" className="text-sm font-semibold py-2 rounded-lg data-[state=active]:shadow-md data-[state=active]:text-blue-700 data-[state=active]:bg-white">Top Self-Gen</TabsTrigger>
          </TabsList>

          {/* Top Closers Tab Content */}
          <TabsContent value="closers">
            <Card className="bg-white border border-gray-300 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-800">Top Closers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {closers.slice(0, 10).map((closer, index) => {
                    const displayName = closer.matchedProfile?.displayName || closer.name;
                    const avatarUrl = closer.matchedProfile?.photoURL;
                    
                    return (
                      <div
                        key={closer.name}
                        className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                          index === 0 
                            ? 'bg-gradient-to-r from-blue-100 to-white border-blue-300 shadow-lg' 
                            : 'bg-gradient-to-r from-blue-50 to-white border-blue-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="shrink-0">
                              <LeaderboardRankBadge rank={index + 1} />
                            </div>
                            
                            <Avatar className={`ring-2 ring-blue-300 bg-white shadow-lg ${index === 0 ? 'h-20 w-20' : 'h-14 w-14'}`}>
                              <AvatarImage 
                                src={avatarUrl} 
                                alt={displayName} 
                                className="object-cover" 
                              />
                              <AvatarFallback className={`font-bold text-blue-700 bg-blue-50 ${index === 0 ? 'text-lg' : 'text-sm'}`}>
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-gray-900 truncate ${index === 0 ? 'text-xl' : 'text-base'}`}>
                                {displayName}
                              </p>
                              <div className={`flex items-center gap-1 ${index === 0 ? 'text-sm' : 'text-xs'}`}>
                                <span className="text-gray-500">Net Deals:</span>
                                <span className="font-bold text-blue-700">{closer.sales}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0 ml-3">
                            <p className={`text-gray-500 mb-1 ${index === 0 ? 'text-sm' : 'text-xs'}`}>Total kW</p>
                            <p className={`font-bold text-blue-700 ${index === 0 ? 'text-2xl' : 'text-lg'}`}>
                              {formatKW(closer.totalKW)}
                            </p>
                            <p className={`text-gray-400 ${index === 0 ? 'text-sm' : 'text-xs'}`}>kW</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {closers.length === 0 && (
                    <div className="text-center p-8 text-gray-400">
                      No closer data available for the selected date range.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Setters Tab Content */}
          <TabsContent value="setters">
            <Card className="bg-white border border-gray-300 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-800">Top Setters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {setters.slice(0, 10).map((setter, index) => {
                    const displayName = setter.matchedProfile?.displayName || setter.name;
                    const avatarUrl = setter.matchedProfile?.photoURL;
                    
                    return (
                      <div
                        key={setter.name}
                        className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                          index === 0 
                            ? 'bg-gradient-to-r from-green-100 to-white border-green-300 shadow-lg' 
                            : 'bg-gradient-to-r from-green-50 to-white border-green-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="shrink-0">
                              <LeaderboardRankBadge rank={index + 1} />
                            </div>
                            
                            <Avatar className={`ring-2 ring-green-300 bg-white shadow-lg ${index === 0 ? 'h-20 w-20' : 'h-14 w-14'}`}>
                              <AvatarImage 
                                src={avatarUrl} 
                                alt={displayName} 
                                className="object-cover" 
                              />
                              <AvatarFallback className={`font-bold text-green-700 bg-green-50 ${index === 0 ? 'text-lg' : 'text-sm'}`}>
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-gray-900 truncate ${index === 0 ? 'text-xl' : 'text-base'}`}>
                                {displayName}
                              </p>
                              <div className={`flex items-center gap-1 ${index === 0 ? 'text-sm' : 'text-xs'}`}>
                                <span className="text-gray-500">Gross Deals:</span>
                                <span className="font-bold text-green-700">{setter.totalLeads}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0 ml-3">
                            <p className={`text-gray-500 mb-1 ${index === 0 ? 'text-sm' : 'text-xs'}`}>Gross kW</p>
                            <p className={`font-bold text-green-700 ${index === 0 ? 'text-2xl' : 'text-lg'}`}>
                              {formatKW(setter.grossKW)}
                            </p>
                            <p className={`text-gray-400 ${index === 0 ? 'text-sm' : 'text-xs'}`}>kW</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {setters.length === 0 && (
                    <div className="text-center p-8 text-gray-400">
                      No setter data available for the selected date range.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Self-Gen Tab Content */}
          <TabsContent value="selfgen">
            <Card className="bg-white border border-gray-300 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-800">Top Self-Gen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selfGen.slice(0, 10).map((person, index) => {
                    const displayName = person.matchedProfile?.displayName || person.name;
                    const avatarUrl = person.matchedProfile?.photoURL;
                    
                    return (
                      <div
                        key={person.name}
                        className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                          index === 0 
                            ? 'bg-gradient-to-r from-purple-100 to-white border-purple-300 shadow-lg' 
                            : 'bg-gradient-to-r from-purple-50 to-white border-purple-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="shrink-0">
                              <LeaderboardRankBadge rank={index + 1} />
                            </div>
                            
                            <Avatar className={`ring-2 ring-purple-300 bg-white shadow-lg ${index === 0 ? 'h-20 w-20' : 'h-14 w-14'}`}>
                              <AvatarImage 
                                src={avatarUrl} 
                                alt={displayName} 
                                className="object-cover" 
                              />
                              <AvatarFallback className={`font-bold text-purple-700 bg-purple-50 ${index === 0 ? 'text-lg' : 'text-sm'}`}>
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-gray-900 truncate ${index === 0 ? 'text-xl' : 'text-base'}`}>
                                {displayName}
                              </p>
                              <div className={`flex items-center gap-1 ${index === 0 ? 'text-sm' : 'text-xs'}`}>
                                <span className="text-gray-500">Net Self-Gen:</span>
                                <span className="font-bold text-purple-700">{person.sales}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0 ml-3">
                            <p className={`text-gray-500 mb-1 ${index === 0 ? 'text-sm' : 'text-xs'}`}>Total kW</p>
                            <p className={`font-bold text-purple-700 ${index === 0 ? 'text-2xl' : 'text-lg'}`}>
                              {formatKW(person.totalKW)}
                            </p>
                            <p className={`text-gray-400 ${index === 0 ? 'text-sm' : 'text-xs'}`}>kW</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {selfGen.length === 0 && (
                    <div className="text-center p-8 text-gray-400">
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
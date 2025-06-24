'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const { user } = useAuth()
  const [closers, setClosers] = useState<CloserData[]>([])
  const [setters, setSetters] = useState<SetterData[]>([])
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
      })
      
      // Convert to arrays and sort
      const closersArray = Array.from(closerStats.values())
        .sort((a, b) => b.totalKW - a.totalKW)  // Rank by total kW (highest first)
      
      const settersArray = Array.from(setterStats.values())
        .sort((a, b) => b.grossKW - a.grossKW)  // Rank by gross kW (highest first)
      
      setClosers(closersArray)
      setSetters(settersArray)
      
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

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Performance Leaderboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track top performers across setters and closers</p>
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} sm:mr-2`} />
          <span className="sm:inline hidden ml-2 sm:ml-0">Refresh</span>
        </Button>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Date Range:</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto sm:min-w-[140px] justify-between">
                  <span className="truncate">{dateFilters.find(f => f.value === dateFilter)?.label || 'Select Range'}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                {dateFilters.map(filter => (
                  <DropdownMenuItem
                    key={filter.value}
                    onClick={() => setDateFilter(filter.value)}
                    className={dateFilter === filter.value ? 'bg-accent' : ''}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Setters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{setters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Closers</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{closers.length}</div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total kW (Net Deals)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatKW(closers.reduce((sum, c) => sum + c.totalKW, 0))} kW
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="closers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="closers" className="text-sm sm:text-base py-2 sm:py-3">Top Closers</TabsTrigger>
          <TabsTrigger value="setters" className="text-sm sm:text-base py-2 sm:py-3">Top Setters</TabsTrigger>
        </TabsList>

        <TabsContent value="closers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Closers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {closers.slice(0, 10).map((closer, index) => {
                  const displayName = closer.matchedProfile?.displayName || closer.name
                  const avatarUrl = closer.matchedProfile?.photoURL
                  
                  // Debug log
                  console.log(`Closer: ${closer.name}`, {
                    hasMatchedProfile: !!closer.matchedProfile,
                    displayName,
                    avatarUrl,
                    matchedProfile: closer.matchedProfile
                  })
                  
                  return (
                    <div key={closer.name} className="flex items-center justify-between p-4 sm:p-6 border rounded-xl bg-gradient-to-r from-background to-muted/20 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer touch-manipulation">
                      <div className="flex items-center space-x-3 sm:space-x-6 flex-1 min-w-0">
                        <div className="shrink-0">
                          {getRankBadge(index + 1)}
                        </div>
                        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 ring-border shrink-0">
                          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                          <AvatarFallback className="text-sm sm:text-lg font-semibold">
                            {displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base sm:text-xl mb-1 truncate">{displayName}</p>
                          <div className="hidden sm:block">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Net Deals</p>
                            <p className="font-bold text-xl sm:text-2xl text-primary">{closer.sales}</p>
                          </div>
                          <div className="sm:hidden">
                            <p className="text-xs text-muted-foreground">Net Deals: <span className="font-bold text-primary">{closer.sales}</span></p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Total kW</p>
                        <p className="font-bold text-lg sm:text-2xl text-primary">{formatKW(closer.totalKW)}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">kW</p>
                      </div>
                    </div>
                  )
                })}
                {closers.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                    No closer data available for the selected date range.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Setters</CardTitle>
              <CardDescription>Ranked by gross kW sold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {setters.slice(0, 10).map((setter, index) => {
                  const displayName = setter.matchedProfile?.displayName || setter.name
                  const avatarUrl = setter.matchedProfile?.photoURL
                  
                  return (
                    <div key={setter.name} className="flex items-center justify-between p-4 sm:p-6 border rounded-xl bg-gradient-to-r from-background to-muted/20 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer touch-manipulation">
                      <div className="flex items-center space-x-3 sm:space-x-6 flex-1 min-w-0">
                        <div className="shrink-0">
                          {getRankBadge(index + 1)}
                        </div>
                        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 ring-border shrink-0">
                          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                          <AvatarFallback className="text-sm sm:text-lg font-semibold">
                            {displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base sm:text-xl mb-1 truncate">{displayName}</p>
                          <div className="hidden sm:block">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Gross Deals</p>
                            <p className="font-bold text-xl sm:text-2xl text-primary">{setter.totalLeads}</p>
                          </div>
                          <div className="sm:hidden">
                            <p className="text-xs text-muted-foreground">Gross Deals: <span className="font-bold text-primary">{setter.totalLeads}</span></p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Gross kW</p>
                        <p className="font-bold text-lg sm:text-2xl text-primary">{formatKW(setter.grossKW)}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">kW</p>
                      </div>
                    </div>
                  )
                })}
                {setters.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                    No setter data available for the selected date range.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Debug Section */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-6 sm:mt-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Debug: User Matching</CardTitle>
            <CardDescription className="text-sm">Development info for user profile matching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm sm:text-base mb-2">Total Users in Firestore: {allUsers.length}</h4>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Users with Photos: {allUsers.filter(u => u.photoURL || u.avatarUrl || u.profilePicture || u.avatar).length}</h4>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Matched Closers: {closers.filter(c => c.matchedProfile).length}/{closers.length}</h4>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Matched Setters: {setters.filter(s => s.matchedProfile).length}/{setters.length}</h4>
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Unmatched Names:</h4>
                <div className="text-xs sm:text-sm space-y-1 max-h-32 sm:max-h-40 overflow-y-auto">
                  {[...closers.filter(c => !c.matchedProfile).map(c => c.name), 
                    ...setters.filter(s => !s.matchedProfile).map(s => s.name)]
                    .filter((name, index, array) => array.indexOf(name) === index) // dedupe
                    .slice(0, 15)
                    .map(name => (
                      <div key={name} className="text-muted-foreground break-words">• {name}</div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

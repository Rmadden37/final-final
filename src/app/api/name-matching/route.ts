import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    // This endpoint requires authentication, so we'll simulate what the client side does
    // In a real scenario, this would be called from an authenticated context

    // Get leaderboard data
    const leaderboardResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002'}/api/leaderboard-data`);
    const leaderboardData = await leaderboardResponse.json();
    
    // Extract unique names from leaderboard
    const leaderboardNames = new Set<string>();
    leaderboardData.data?.forEach((row: any) => {
      if (row.closer_name?.trim()) leaderboardNames.add(row.closer_name.trim());
      if (row.setter_name?.trim()) leaderboardNames.add(row.setter_name.trim());
    });

    // Mock user data (you would replace this with actual Firestore data)
    const mockUsers = [
      { displayName: 'Joshua Long', email: 'joshua@company.com', photoURL: 'https://example.com/josh.jpg' },
      { displayName: 'Rocky Niger', email: 'rocky@company.com', photoURL: null },
      { displayName: 'Samuel Hernandez', email: 'sam@company.com', photoURL: 'https://example.com/sam.jpg' },
      { displayName: 'William Milian Jr', email: 'will@company.com', photoURL: null },
      { displayName: 'Nathan A', email: 'nathan@company.com', photoURL: null },
      { displayName: 'Styles F', email: 'styles@company.com', photoURL: null },
      // Add more mock users as needed
    ];

    // Helper to normalize names for matching
    function normalizeName(str: string): string {
      return str.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
    }

    // Enhanced matching function
    function findUserProfile(nameOrEmail: string, users: any[]): any | undefined {
      if (!nameOrEmail) return undefined
      
      const trimmedName = nameOrEmail.trim()
      
      // 1. Try exact displayName match (case-insensitive)
      let matched = users.find(u => u.displayName && u.displayName.trim().toLowerCase() === trimmedName.toLowerCase())
      if (matched) return { ...matched, matchType: 'exact_displayName' }
      
      // 2. Try exact email match
      matched = users.find(u => u.email && u.email.trim().toLowerCase() === trimmedName.toLowerCase())
      if (matched) return { ...matched, matchType: 'exact_email' }
      
      // 3. Try normalized name match
      const normalizedTarget = normalizeName(trimmedName)
      matched = users.find(u => u.displayName && normalizeName(u.displayName) === normalizedTarget)
      if (matched) return { ...matched, matchType: 'normalized_name' }
      
      // 4. Try "First Last" vs "First Middle Last" matching
      const nameParts = trimmedName.split(' ').filter(p => p.length > 0)
      if (nameParts.length >= 2) {
        const firstName = nameParts[0]
        const lastName = nameParts[nameParts.length - 1]
        
        matched = users.find(u => {
          if (!u.displayName) return false
          const userParts = u.displayName.trim().split(' ').filter(p => p.length > 0)
          if (userParts.length < 2) return false
          
          const userFirst = userParts[0]
          const userLast = userParts[userParts.length - 1]
          
          return firstName.toLowerCase() === userFirst.toLowerCase() && 
                 lastName.toLowerCase() === userLast.toLowerCase()
        })
        if (matched) return { ...matched, matchType: 'first_last_name' }
      }
      
      // 5. Try first name + first letter of last name
      if (nameParts.length >= 2) {
        const firstName = nameParts[0]
        const lastInitial = nameParts[nameParts.length - 1][0]
        
        matched = users.find(u => {
          if (!u.displayName) return false
          const userParts = u.displayName.trim().split(' ').filter(p => p.length > 0)
          if (userParts.length < 2) return false
          
          const userFirst = userParts[0]
          const userLastInitial = userParts[userParts.length - 1][0]
          
          return firstName.toLowerCase() === userFirst.toLowerCase() && 
                 lastInitial.toLowerCase() === userLastInitial.toLowerCase()
        })
        if (matched) return { ...matched, matchType: 'first_name_last_initial' }
      }
      
      // 6. Try just first name match (as last resort)
      if (nameParts.length >= 1) {
        const firstName = nameParts[0]
        matched = users.find(u => {
          if (!u.displayName) return false
          const userParts = u.displayName.trim().split(' ').filter(p => p.length > 0)
          return userParts.length >= 1 && firstName.toLowerCase() === userParts[0].toLowerCase()
        })
        if (matched) return { ...matched, matchType: 'first_name_only' }
      }
      
      return undefined
    }

    // Match all leaderboard names
    const matches = Array.from(leaderboardNames).map(name => {
      const match = findUserProfile(name, mockUsers);
      return {
        leaderboardName: name,
        matched: !!match,
        matchType: match?.matchType || 'no_match',
        userProfile: match ? {
          displayName: match.displayName,
          email: match.email,
          hasPhoto: !!match.photoURL
        } : null
      };
    });

    return NextResponse.json({
      totalLeaderboardNames: leaderboardNames.size,
      totalMockUsers: mockUsers.length,
      matchedCount: matches.filter(m => m.matched).length,
      unmatchedCount: matches.filter(m => !m.matched).length,
      matches,
      unmatchedNames: matches.filter(m => !m.matched).map(m => m.leaderboardName),
      mockUsers: mockUsers.map(u => ({ displayName: u.displayName, email: u.email, hasPhoto: !!u.photoURL }))
    });
  } catch (error) {
    console.error('Error in name-matching API:', error);
    return NextResponse.json({ error: 'Failed to process name matching', details: error.message }, { status: 500 });
  }
}

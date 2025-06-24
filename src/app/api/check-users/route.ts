import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const usersSnap = await adminDb.collection('users').get();
    const users = usersSnap.docs.map(doc => ({ 
      uid: doc.id, 
      ...doc.data() 
    })) as any[];

    // Check for users with photos
    const usersWithPhotos = users.filter(u => 
      u.photoURL || u.avatarUrl || u.profilePicture || u.avatar
    );

    // Get leaderboard names to compare
    const leaderboardResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002'}/api/leaderboard-data`);
    const leaderboardData = await leaderboardResponse.json();
    
    // Extract unique closer and setter names
    const leaderboardNames = new Set<string>();
    leaderboardData.data?.forEach((row: any) => {
      if (row.closer_name?.trim()) leaderboardNames.add(row.closer_name.trim());
      if (row.setter_name?.trim()) leaderboardNames.add(row.setter_name.trim());
    });

    // Helper to normalize names for matching
    function normalizeName(str: string): string {
      return str.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
    }

    // Try to match leaderboard names to users
    const nameMatches: any[] = [];
    Array.from(leaderboardNames).forEach(leaderboardName => {
      const normalized = normalizeName(leaderboardName);
      
      // Try exact displayName match
      let match = users.find(u => u.displayName && u.displayName.trim().toLowerCase() === leaderboardName.toLowerCase());
      if (match) {
        nameMatches.push({
          leaderboardName,
          matchType: 'exact_displayName',
          user: {
            displayName: match.displayName,
            email: match.email,
            photoURL: match.photoURL || match.avatarUrl || match.profilePicture || match.avatar
          }
        });
        return;
      }

      // Try email match (in case leaderboard has email)
      match = users.find(u => u.email && u.email.trim().toLowerCase() === leaderboardName.toLowerCase());
      if (match) {
        nameMatches.push({
          leaderboardName,
          matchType: 'exact_email',
          user: {
            displayName: match.displayName,
            email: match.email,
            photoURL: match.photoURL || match.avatarUrl || match.profilePicture || match.avatar
          }
        });
        return;
      }

      // Try normalized name match
      match = users.find(u => u.displayName && normalizeName(u.displayName) === normalized);
      if (match) {
        nameMatches.push({
          leaderboardName,
          matchType: 'normalized_name',
          user: {
            displayName: match.displayName,
            email: match.email,
            photoURL: match.photoURL || match.avatarUrl || match.profilePicture || match.avatar
          }
        });
        return;
      }

      // Try first name match
      const firstName = leaderboardName.split(' ')[0];
      match = users.find(u => u.displayName && u.displayName.split(' ')[0].toLowerCase() === firstName.toLowerCase());
      if (match) {
        nameMatches.push({
          leaderboardName,
          matchType: 'first_name',
          user: {
            displayName: match.displayName,
            email: match.email,
            photoURL: match.photoURL || match.avatarUrl || match.profilePicture || match.avatar
          }
        });
        return;
      }

      // No match found
      nameMatches.push({
        leaderboardName,
        matchType: 'no_match',
        user: null
      });
    });

    return NextResponse.json({
      totalUsers: users.length,
      usersWithPhotos: usersWithPhotos.length,
      totalLeaderboardNames: leaderboardNames.size,
      matchedNames: nameMatches.filter(m => m.user !== null).length,
      unmatchedNames: nameMatches.filter(m => m.user === null).length,
      allUsers: users.map(u => ({
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL || u.avatarUrl || u.profilePicture || u.avatar,
        hasPhoto: !!(u.photoURL || u.avatarUrl || u.profilePicture || u.avatar)
      })),
      nameMatches,
      unmatchedLeaderboardNames: nameMatches.filter(m => m.user === null).map(m => m.leaderboardName)
    });
  } catch (error) {
    console.error('Error in check-users API:', error);
    return NextResponse.json({ error: 'Failed to fetch users', details: error.message }, { status: 500 });
  }
}

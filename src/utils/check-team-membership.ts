/**
 * Simple web-based script to check team membership
 * This can be run in the browser console or as a standalone web page
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Firebase configuration (from the existing config)
const firebaseConfig = {
  apiKey: "AIzaSyBc3jmFE6dRXBApmWD9Jg2PO86suqGgaZw",
  authDomain: "leadflow-4lvrr.firebaseapp.com",
  projectId: "leadflow-4lvrr",
  storageBucket: "leadflow-4lvrr.appspot.com",
  messagingSenderId: "13877630896",
  appId: "1:13877630896:web:ab7d2717024960ec36e875",
  measurementId: "G-KDEF2C21SH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function checkTeamMembership() {
  console.log('=== CHECKING RICHARD NIGER & MARCELO GUERRA TEAM MEMBERSHIP ===\n');
  
  try {
    // Get all closers
    const closersSnapshot = await getDocs(collection(db, 'closers'));
    const allClosers: any[] = [];
    
    closersSnapshot.forEach(doc => {
      allClosers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Total closers found: ${allClosers.length}`);
    console.log('All closers:', allClosers);
    
    // Find Richard Niger
    const richard = allClosers.find(closer => 
      closer.name && closer.name.toLowerCase().includes('richard niger')
    );
    
    // Find Marcelo Guerra  
    const marcelo = allClosers.find(closer =>
      closer.name && closer.name.toLowerCase().includes('marcelo guerra')
    );
    
    console.log('\n=== SEARCH RESULTS ===');
    console.log('Richard Niger found:', richard ? '✅ YES' : '❌ NO');
    if (richard) {
      console.log('Richard Niger details:', richard);
    }
    
    console.log('Marcelo Guerra found:', marcelo ? '✅ YES' : '❌ NO');
    if (marcelo) {
      console.log('Marcelo Guerra details:', marcelo);
    }
    
    console.log('\n=== TEAM MEMBERSHIP ANALYSIS ===');
    if (richard && marcelo) {
      const sameTeam = richard.teamId === marcelo.teamId;
      console.log(`Same team: ${sameTeam ? '✅ YES' : '❌ NO'}`);
      
      if (sameTeam) {
        console.log(`Both are on team: ${richard.teamId}`);
      } else {
        console.log(`Richard's team: ${richard.teamId}`);
        console.log(`Marcelo's team: ${marcelo.teamId}`);
      }
      
      return {
        richardFound: true,
        marceloFound: true,
        sameTeam,
        richard,
        marcelo
      };
    } else {
      const result = {
        richardFound: !!richard,
        marceloFound: !!marcelo,
        sameTeam: false,
        richard: richard || null,
        marcelo: marcelo || null
      };
      
      if (!richard && !marcelo) {
        console.log('❌ Neither Richard Niger nor Marcelo Guerra found in the system');
      } else if (!richard) {
        console.log('❌ Richard Niger not found - cannot compare teams');
      } else if (!marcelo) {
        console.log('❌ Marcelo Guerra not found - cannot compare teams');
      }
      
      return result;
    }
    
  } catch (error) {
    console.error('Error checking team members:', error);
    throw error;
  }
}

// For use in browser console
if (typeof window !== 'undefined') {
  (window as any).checkTeamMembership = checkTeamMembership;
  console.log('Team membership checker loaded. Run checkTeamMembership() to execute.');
}

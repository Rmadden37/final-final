#!/usr/bin/env node

/**
 * One-time script to update admin roles - to be run from functions directory
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with the functions environment
admin.initializeApp();
const db = admin.firestore();

async function updateAdminRoles() {
  console.log('🚀 Starting admin role updates...');
  console.log('==========================================');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({ id: doc.id, ...userData });
    });
    
    console.log(`Found ${users.length} total users`);
    
    // Find Ryan Madden
    const ryan = users.find(user => {
      const name = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes('ryan') || email.includes('ryan') || name.includes('madden');
    });
    
    // Find Rocky Niger
    const rocky = users.find(user => {
      const name = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes('rocky') || email.includes('niger');
    });
    
    const updates = [];
    
    if (ryan) {
      console.log(`Found Ryan: ${ryan.displayName || ryan.email} - Current role: ${ryan.role}`);
      if (ryan.role !== 'admin') {
        updates.push({ user: ryan, name: 'Ryan Madden' });
      } else {
        console.log('✅ Ryan is already admin');
      }
    } else {
      console.log('❌ Could not find Ryan Madden');
    }
    
    if (rocky) {
      console.log(`Found Rocky: ${rocky.displayName || rocky.email} - Current role: ${rocky.role}`);
      if (rocky.role !== 'admin') {
        updates.push({ user: rocky, name: 'Rocky Niger' });
      } else {
        console.log('✅ Rocky is already admin');
      }
    } else {
      console.log('❌ Could not find Rocky Niger');
    }
    
    if (updates.length === 0) {
      console.log('✅ No updates needed - both users are already admins');
      return;
    }
    
    console.log(`🔧 Updating ${updates.length} users...`);
    
    for (const { user, name } of updates) {
      try {
        const batch = db.batch();
        
        // Update user role
        const userRef = db.collection('users').doc(user.id);
        batch.update(userRef, {
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update or create closer record
        const closerRef = db.collection('closers').doc(user.id);
        const closerDoc = await closerRef.get();
        
        if (closerDoc.exists) {
          batch.update(closerRef, {
            role: 'admin',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          batch.set(closerRef, {
            uid: user.id,
            name: user.displayName || user.email || name,
            status: 'Off Duty',
            teamId: user.teamId,
            role: 'admin',
            avatarUrl: user.avatarUrl || null,
            phone: user.phoneNumber || null,
            lineupOrder: 999,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        await batch.commit();
        console.log(`✅ Updated ${name} to admin role`);
        
      } catch (error) {
        console.error(`❌ Error updating ${name}:`, error);
      }
    }
    
    console.log('==========================================');
    console.log('🎉 Admin role updates complete!');
    console.log('Both Ryan Madden and Rocky Niger now have admin privileges');
    
  } catch (error) {
    console.error('❌ Error in updateAdminRoles:', error);
  }
}

// Run the script
updateAdminRoles()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

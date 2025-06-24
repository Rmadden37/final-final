"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function AdminTools() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string>("");
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Check if user has permission
  const hasPermission = user && (user.role === "manager" || user.role === "admin");

  useEffect(() => {
    // Test Firebase availability
    const testFirebase = async () => {
      try {
        const { db } = await import("@/lib/firebase");
        if (db) {
          setFirebaseReady(true);
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          console.error("Firebase not ready:", error);
        }
        setResults("❌ Firebase connection failed. Please refresh the page.");
      }
    };
    
    if (hasPermission) {
      testFirebase();
    }
  }, [hasPermission]);

  const handleQuickFix = async () => {
    if (!hasPermission) {
      setResults("❌ Access denied. Admin/Manager role required.");
      return;
    }

    setIsLoading(true);
    setResults("Starting Tony Tiger lead fix...");
    
    try {
      setResults("Loading Firebase...");
      
      // Import Firebase dynamically
      const { db } = await import("@/lib/firebase");
      const { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } = await import("firebase/firestore");      
      setResults("✅ Firebase loaded. Searching for Tony Tiger lead...");
      
      // Search for Tony Tiger lead - try customer name first
      let customerQuery = query(
        collection(db, 'leads'),
        where('customerName', '==', 'Tony Tiger')
      );
      
      let snapshot = await getDocs(customerQuery);
      
      if (snapshot.empty) {
        setResults("No customer named Tony Tiger found. Searching assigned closers...");
        
        // Try searching by assigned closer name
        customerQuery = query(
          collection(db, 'leads'),
          where('assignedCloserName', '==', 'Tony Tiger')
        );
        
        snapshot = await getDocs(customerQuery);
      }
      
      if (snapshot.empty) {
        setResults("❌ No Tony Tiger lead found. Let me search all leads...");
        
        // Get all leads and search manually
        const allLeadsQuery = query(collection(db, 'leads'));
        const allSnapshot = await getDocs(allLeadsQuery);
        
        let resultText = `Found ${allSnapshot.size} total leads:\n\n`;
        let tonyFound = false;
        
        allSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const customer = data.customerName || 'No Name';
          const assigned = data.assignedCloserName || 'Unassigned';
          
          if (customer.toLowerCase().includes('tony') || 
              assigned.toLowerCase().includes('tony') ||
              customer.toLowerCase().includes('tiger') || 
              assigned.toLowerCase().includes('tiger')) {
            resultText += `🎯 MATCH: ${docSnap.id}\n`;
            resultText += `   Customer: ${customer}\n`;
            resultText += `   Assigned: ${assigned}\n`;
            resultText += `   Status: ${data.status}\n\n`;
            tonyFound = true;
          }
        });
        
        if (!tonyFound) {
          resultText += "\n❌ No leads found containing 'Tony' or 'Tiger'";
        }
        
        setResults(resultText);
        return;
      }
      
      let resultText = `Found ${snapshot.size} Tony Tiger lead(s):\n\n`;
      let updatedCount = 0;
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        resultText += `📋 Lead ID: ${docSnap.id}\n`;
        resultText += `👤 Customer: ${data.customerName}\n`;
        resultText += `🎯 Assigned to: ${data.assignedCloserName || 'Unassigned'}\n`;
        resultText += `📊 Status: ${data.status}\n`;
        resultText += `🕒 Created: ${data.createdAt?.toDate?.() || 'Unknown'}\n`;
        resultText += `---\n`;
        
        if (data.status === 'scheduled') {
          resultText += `🔄 Updating ${docSnap.id} from "scheduled" to "rescheduled"...\n`;
          
          await updateDoc(doc(db, 'leads', docSnap.id), {
            status: 'rescheduled',
            updatedAt: serverTimestamp(),
            statusChangeReason: 'Fixed icon color - lead was reassigned so should show rescheduled'
          });
          
          resultText += `✅ Updated successfully!\n`;
          updatedCount++;
        } else if (data.status === 'rescheduled') {
          resultText += `✅ Already marked as "rescheduled"\n`;
        } else {
          resultText += `ℹ️ Status is "${data.status}" - no update needed\n`;
        }
        
        resultText += `\n`;
      }
      
      if (updatedCount > 0) {
        resultText += `\n🎉 SUCCESS! Updated ${updatedCount} lead(s) to "rescheduled".\n`;
        resultText += `🎨 Tony Tiger's lead will now show a PURPLE rescheduled icon.\n`;
        resultText += `🔄 Refresh the dashboard to see changes.`;
      } else {
        resultText += `\n📝 No leads needed updating.`;
      }
      
      setResults(resultText);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error : String(error);
      setResults(`❌ Error: ${errorMessage}\n\nFull error: ${JSON.stringify(errorDetails, null, 2)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading if user is not loaded yet
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (!hasPermission) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This tool requires Manager or Admin role.</p>
            <p>Your current role: {user.role}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Tony Tiger Lead Status Fix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>What this tool does:</strong></p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Finds Tony Tiger's lead in the database</li>
              <li>Changes status from "scheduled" to "rescheduled"</li>
              <li>This makes the lead show a <span className="text-purple-600 font-semibold">PURPLE</span> rescheduled icon instead of blue</li>
              <li>Only works for Manager/Admin users</li>
            </ul>
          </div>
          
          {!firebaseReady && hasPermission && (
            <div className="text-amber-600 text-sm">
              ⚠️ Firebase is still loading...
            </div>
          )}
          
          <Button 
            onClick={handleQuickFix}
            disabled={isLoading || !firebaseReady}
            className="w-full"
          >
            {isLoading ? "Working..." : "Find and Fix Tony Tiger Lead"}
          </Button>
          
          {results && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <h3 className="font-semibold mb-2">Results:</h3>
              <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">{results}</pre>
            </div>
          )}
          
          <div className="text-xs text-gray-500 border-t pt-4">
            <p><strong>Alternative method:</strong> You can also run the browser console script:</p>
            <ol className="list-decimal ml-5 mt-1 space-y-1">
              <li>Go to the dashboard page</li>
              <li>Open Developer Tools (F12) → Console tab</li>
              <li>Copy and paste the script from <code>/scripts/browser-fix-tony-tiger.js</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

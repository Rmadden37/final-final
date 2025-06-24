# Manual Steps to Update Tony Tiger's Lead Status

Since we have the icon fix in place but Tony Tiger's lead is still showing as "scheduled" instead of "rescheduled", here are the manual steps to fix this:

## Option 1: Use the Dashboard UI

1. **Open the dashboard** at http://localhost:9002
2. **Find Tony Tiger's lead** in the scheduled section (you can see it in the attachment)
3. **Click on Tony Tiger's lead** to open the details
4. **Click the disposition button** (if available)
5. **Select "Rescheduled"** as the new status
6. **Set a future appointment time** if required
7. **Save the changes**

This will update the lead status from "scheduled" to "rescheduled" and it will now show the purple icon we implemented.

## Option 2: Browser Console Method

If you want to use a script directly in the browser:

1. **Open the dashboard** at http://localhost:9002
2. **Open browser developer tools** (F12)
3. **Go to Console tab**
4. **Run this command:**

```javascript
// Find and update Tony Tiger's lead
(async () => {
  try {
    const { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } = firebase.firestore;
    
    const q = query(collection(db, 'leads'), where('customerName', '==', 'Tony Tiger'));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const leadDoc = snapshot.docs[0];
      const leadData = leadDoc.data();
      
      if (leadData.status === 'scheduled') {
        await updateDoc(doc(db, 'leads', leadDoc.id), {
          status: 'rescheduled',
          updatedAt: serverTimestamp(),
          statusChangeReason: 'Updated to show purple rescheduled icon'
        });
        
        console.log('✅ Tony Tiger lead updated to rescheduled status');
        console.log('🔄 Refresh the page to see the purple icon');
      } else {
        console.log('Lead is already:', leadData.status);
      }
    } else {
      console.log('Tony Tiger lead not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

## Option 3: Check Database Directly

The issue might be that Tony Tiger's lead is legitimately scheduled and needs to be properly rescheduled. If this is the case:

1. **Check the actual appointment time** - is it still for the original time?
2. **Was the lead actually reassigned** to Jonathan Shahar?
3. **Should it be rescheduled** to a different time?

If the lead was reassigned to Jonathan Shahar and should have a new appointment time, then using Option 1 (the UI) is the best approach as it will properly handle all the scheduling logic.

## Result

After any of these steps, Tony Tiger's lead should show:
- ✅ Purple calendar icon (instead of blue)
- ✅ "Rescheduled" status badge
- ✅ Proper assignment to Jonathan Shahar

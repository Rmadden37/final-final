# Tony Tiger Lead Fix - Manual Steps

## SUMMARY OF THE ISSUE
Tony Tiger's lead was reassigned to Jonathan Shahar but still shows as "Scheduled" with a blue icon instead of "Rescheduled" with a purple icon.

## WHAT WE'VE FIXED
✅ **Icon color logic is already fixed** in `/src/components/dashboard/lead-card.tsx`
- "Rescheduled" leads now show purple CalendarClock icon (`text-purple-500`)
- "Scheduled" leads show blue CalendarClock icon (`text-blue-500`)

## WHAT NEEDS TO BE DONE
🔧 **Update Tony Tiger's lead status** from "scheduled" to "rescheduled" in the database

## OPTION 1: Browser Console Method (RECOMMENDED)

1. **Open the dashboard**
   - Go to: http://localhost:9002/dashboard
   - Make sure you're logged in as an admin or manager

2. **Open Developer Tools**
   - Press F12 (or right-click → Inspect)
   - Click on the "Console" tab

3. **Run the fix script**
   - Copy the entire script from `/scripts/working-tony-tiger-fix.js`
   - Paste it into the console and press Enter
   - The script will automatically find and update Tony Tiger's lead

## OPTION 2: Firebase Console Method

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Select project: leadflow-4lvrr
   - Go to Firestore Database

2. **Find Tony Tiger's lead**
   - Go to the "leads" collection
   - Search for documents where:
     - `customerName` = "Tony Tiger" OR
     - `assignedCloserName` = "Tony Tiger"

3. **Update the lead**
   - Find the lead with `status` = "scheduled"
   - Change `status` field to "rescheduled"
   - Update `updatedAt` field to current timestamp
   - Add `statusChangeReason` = "Fixed icon color - lead was reassigned"

## OPTION 3: Admin Tools Page (Currently Has Issues)
- The admin tools page at `/admin-tools` has server-side errors
- We created the page but it's not working due to SSR issues
- Use Option 1 or 2 instead

## VERIFICATION STEPS

After updating the lead:

1. **Refresh the dashboard page**
   - Go to http://localhost:9002/dashboard
   - Press Ctrl+F5 (hard refresh)

2. **Check Tony Tiger's lead**
   - Look for the lead assigned to Jonathan Shahar
   - Verify it now shows a **PURPLE** rescheduled icon instead of blue
   - The status should say "rescheduled" instead of "scheduled"

## SCRIPTS AVAILABLE

- `scripts/working-tony-tiger-fix.js` - Browser console script (RECOMMENDED)
- `scripts/simple-tony-tiger-fix.js` - Alternative browser script
- `scripts/node-fix-tony-tiger.js` - Node.js script (has auth issues)
- `scripts/update-tony-tiger-rescheduled.js` - Original script (has auth issues)

## TROUBLESHOOTING

If you can't find Tony Tiger's lead:
- The lead might be named slightly differently
- Check all leads assigned to Jonathan Shahar
- Look for leads with status "scheduled" that should be "rescheduled"

If the browser script doesn't work:
- Make sure you're on the dashboard page
- Make sure you're logged in as admin/manager
- Try refreshing the page and running the script again
- Use the Firebase Console method instead

## TECHNICAL DETAILS

The fix changes:
- `status`: "scheduled" → "rescheduled"
- `updatedAt`: current timestamp
- `statusChangeReason`: "Fixed icon color - lead was reassigned"

This triggers the icon color logic we already fixed:
```tsx
case "rescheduled":
  return <CalendarClock className="h-5 w-5 text-purple-500" />;
case "scheduled":
  return <CalendarClock className="h-5 w-5 text-blue-500" />;
```

# Closer Lineup Visibility Feature

## Overview
This feature enhances the Closer Lineup component to provide different views based on user roles, with a special focus on enabling closers to see their position in the rotation queue.

## Implementation Summary

### Changes Made
**File Modified**: `src/components/dashboard/closer-lineup.tsx`

### New Functionality

#### For Closers (role: "closer")
- **Full Lineup Visibility**: Can now see the entire On Duty lineup, not just available closers
- **Position Indicator**: Shows their current position in the rotation queue prominently 
- **Enhanced Visual Feedback**: 
  - Displays position number in a highlighted badge at the top
  - Highlights their own card with a blue ring
  - Shows "👤 This is you" indicator below their card
- **Status Awareness**: Can see which closers are working on leads vs. available

#### For Managers/Admins (role: "manager" | "admin")
- **Unchanged Behavior**: Continue to see only available closers (as before)
- **Management Access**: Still have access to manage closers via the icon click

#### For Setters (role: "setter")
- **Unchanged Behavior**: See only available closers

### Technical Implementation

#### State Management
```typescript
const [allOnDutyClosers, setAllOnDutyClosers] = useState<Closer[]>([]);
const isCloser = user?.role === "closer";
```

#### Display Logic
- **Closers**: Display `allOnDutyClosers` (full On Duty lineup)
- **Others**: Display `closersInLineup` (available closers only)

#### Position Calculation
```typescript
const currentUserPosition = allOnDutyClosers.findIndex(closer => closer.uid === user?.uid) + 1;
```

#### UI Components
1. **Position Badge**: Prominently displayed for closers showing their rotation position
2. **User Highlight**: Blue ring around the current user's card when viewing full lineup
3. **Status Indicators**: Shows who is "Working on lead" vs. available
4. **Dynamic Titles**: Updates subtitle based on user role and position

### Benefits

1. **Transparency**: Closers can now see exactly where they stand in the rotation
2. **Motivation**: Knowing their position helps closers understand when they might get the next lead
3. **Team Awareness**: Closers can see who else is on duty and their relative positions
4. **Unchanged Management**: Managers and admins retain their current workflow

### User Experience

#### Before (All Users)
- Only saw available closers
- No position awareness for closers
- Limited visibility into team status

#### After (Closers)
- See full On Duty lineup with positions
- Know exactly where they are in rotation
- Visual highlighting of their position
- Better understanding of team availability

#### After (Managers/Admins)
- Unchanged experience - still see only available closers
- Retain all management capabilities

## Testing

To test this feature:

1. **As a Closer**: 
   - Log in with a closer account
   - Navigate to the Dashboard
   - Check the Closer Lineup component
   - Verify you see your position prominently displayed
   - Verify you see all On Duty closers with their positions

2. **As a Manager**: 
   - Log in with a manager account
   - Navigate to the Dashboard  
   - Check the Closer Lineup component
   - Verify you only see available closers (unchanged behavior)

3. **Position Updates**:
   - Change status to "On Duty" or "Off Duty"
   - Verify position updates correctly
   - Check that assignments remove closers from available list

## Code Quality

- ✅ TypeScript compliant
- ✅ Maintains backward compatibility
- ✅ Preserves existing access controls
- ✅ Follows component patterns
- ✅ Proper error handling
- ✅ Responsive design maintained

## Future Enhancements

Potential improvements could include:
- Estimated time until next lead based on position
- Historical rotation statistics
- Push notifications when position changes significantly
- Detailed rotation queue analytics

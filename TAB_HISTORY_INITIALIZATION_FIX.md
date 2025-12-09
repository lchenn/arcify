# Tab History Initialization Fix

## Problem
When pressing the tab switcher shortcut (Cmd/Ctrl + Q) immediately after:
- Starting Chrome
- Installing/updating the extension
- Reloading the extension

The tab switcher modal wouldn't show all (or any) recent tabs because the `tabHistory` array was empty.

## Root Cause
The `tabHistory` array that tracks the 5 most recent tabs was only populated when tabs were activated through the `chrome.tabs.onActivated` event listener. This meant:

1. On fresh Chrome startup, `tabHistory` started as an empty array `[]`
2. Tabs only got added to history when the user manually switched between them
3. If you pressed the shortcut before switching tabs manually, there were no tabs in history to cycle through

## Solution
Added an `initializeTabHistory()` function that:

1. **Queries existing tabs** - Gets all tabs in the current window on startup
2. **Sorts by recency** - Uses Chrome's `lastAccessed` timestamp to sort tabs by most recent access
3. **Populates history** - Takes the top 5 most recently accessed tabs and initializes the `tabHistory` array

The function is called in two places:
- `chrome.runtime.onInstalled` - When extension is installed or updated
- `chrome.runtime.onStartup` - When Chrome starts

## Implementation Details

```javascript
// Initialize tab history with existing tabs when extension starts
async function initializeTabHistory() {
    try {
        console.log("Initializing tab history...");

        // Get all tabs in the current window
        const tabs = await chrome.tabs.query({ currentWindow: true });

        // Sort tabs by lastAccessed (most recent first)
        tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

        // Take the most recent MAX_TAB_HISTORY tabs
        tabHistory = tabs.slice(0, MAX_TAB_HISTORY).map(tab => tab.id);

        console.log(`Tab history initialized with ${tabHistory.length} tabs: [${tabHistory.join(', ')}]`);
    } catch (error) {
        console.error("Error initializing tab history:", error);
    }
}
```

## Benefits

1. ✅ **Immediate functionality** - Tab switcher works right after Chrome starts or extension reloads
2. ✅ **Accurate history** - Uses Chrome's built-in `lastAccessed` timestamp to determine most recent tabs
3. ✅ **Consistent UX** - Users can always cycle through recent tabs without needing to manually switch first
4. ✅ **Graceful handling** - Error handling ensures the extension continues to work even if initialization fails

## Testing Checklist

To verify the fix works:

1. ✓ Reload the extension (chrome://extensions -> Developer mode -> Reload)
2. ✓ Press Cmd/Ctrl + Q immediately
3. ✓ Verify the tab switcher modal appears with up to 5 recent tabs
4. ✓ Verify cycling through tabs works correctly
5. ✓ Restart Chrome and test again

## Files Modified

- `/Users/lchenn/Repos/arcify/background.js`
  - Added `initializeTabHistory()` function
  - Updated `chrome.runtime.onInstalled` listener to call initialization
  - Updated `chrome.runtime.onStartup` listener to call initialization

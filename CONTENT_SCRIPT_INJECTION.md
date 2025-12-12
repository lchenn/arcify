# Content Script Injection After Extension Reload

## Summary

Added functionality to ensure the tab switcher content script is automatically injected into tabs after extension reload, so the tab switcher modal works immediately.

## Changes Made

### 1. Added "scripting" Permission

**File**: `/Users/lchenn/Repos/arcify/manifest.json`

Added `"scripting"` to permissions array to allow programmatic script injection.

### 2. Added Content Script Injection Helper

**File**: `/Users/lchenn/Repos/arcify/background.js`

Added `ensureContentScriptInjected()` function that:
- Checks if the content script is already loaded by sending a "ping" message
- If not present, programmatically injects it using `chrome.scripting.executeScript()`
- Handles restricted URLs (chrome://, chrome-extension://, etc.) that cannot run content scripts
- Returns true if injection succeeds, false otherwise

### 3. Updated Tab Switcher Command

**File**: `/Users/lchenn/Repos/arcify/background.js`

Modified the `switchToRecentTab` command handler to:
- Call `ensureContentScriptInjected()` before showing the modal
- Only send the modal message if injection succeeds
- Provide clear console feedback about injection status

### 4. Added Ping Handler in Content Script

**File**: `/Users/lchenn/Repos/arcify/tab-switcher-modal.js`

Added handler for "ping" action that:
- Responds with `{status: 'ok'}` to confirm the script is loaded
- Allows the background script to detect if content script is present

## How It Works

1. User presses Cmd/Ctrl + Q to cycle through tabs
2. Background script switches to the target tab
3. Background script sends a "ping" message to check if content script is loaded
4. If content script responds, use it; if not, inject it programmatically
5. Once injected, show the tab switcher modal with all recent tabs

## Benefits

- Tab switcher works immediately after extension reload without needing to refresh tabs
- Graceful handling of restricted URLs where content scripts cannot run
- No manual user action required - everything happens automatically
- Clear console logging for debugging

## Testing

To verify the fix works:

1. Reload the extension in chrome://extensions
2. Press Cmd/Ctrl + Q immediately (without refreshing any tabs)
3. The tab switcher modal should appear automatically
4. Check the console for injection status messages

## Related Files

- `/Users/lchenn/Repos/arcify/background.js` - Added injection logic
- `/Users/lchenn/Repos/arcify/tab-switcher-modal.js` - Added ping handler
- `/Users/lchenn/Repos/arcify/manifest.json` - Added scripting permission

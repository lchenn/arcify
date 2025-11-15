# Claude AI Assistant Guide for Arcify

This document provides guidance for using Claude AI assistant to help develop and maintain the Arcify browser extension.

## Project Overview

Arcify is a Chrome extension that replicates Arc browser's tab management system with a vertical sidebar. The project is built with vanilla JavaScript, HTML, and CSS, and uses Vite for building.

## Project Structure

```
arcify/
├── background.js          # Service worker for background tasks
├── sidebar.js            # Main sidebar logic
├── sidebar.html          # Sidebar UI
├── chromeHelper.js       # Chrome API utilities
├── domManager.js         # DOM manipulation utilities
├── localstorage.js       # Storage management
├── search-modal.js       # Search functionality
├── icons.js              # Icon handling
├── utils.js              # Shared utilities
├── options.js/html       # Extension settings
├── onboarding.js/html    # First-time user experience
├── styles.css            # Global styles
├── manifest.json         # Extension manifest
├── scripts/              # Build and release automation
└── assets/               # Images and icons
```

## Key Technologies

- **Language**: Vanilla JavaScript (ES6+)
- **Build Tool**: Vite
- **Platform**: Chrome Extension Manifest V3
- **APIs**: Chrome Extensions API, Chrome Tabs API, Chrome Bookmarks API

## Development Commands

```bash
npm run dev           # Development build with watch mode
npm run build         # Production build
npm run build:zip     # Build and create distribution package
npm run clean         # Remove build artifacts
npm run release       # Create new release (patch/minor/major)
```

## Common Development Tasks

### 1. Working with Chrome Extension APIs

When adding features, remember:
- Use Chrome Extension Manifest V3 APIs
- Service workers instead of background pages
- `chrome.tabs` API for tab management
- `chrome.storage.local` for persistent data
- Check `manifest.json` for required permissions

### 2. Testing Changes

After making changes:
1. Run `npm run dev` to build
2. Go to `chrome://extensions/`
3. Reload the extension
4. Test in the sidebar and check console for errors

### 3. Styling

- Main styles are in `/Users/lchenn/Repos/arcify/styles.css`
- Follow existing CSS patterns
- Use CSS variables for theming
- Maintain Arc browser's aesthetic

### 4. State Management

- Local storage is managed through `/Users/lchenn/Repos/arcify/localstorage.js`
- Tab state is synchronized with Chrome's tab system
- Use event listeners for real-time updates

## Common Patterns

### Tab Management
```javascript
// Get all tabs
chrome.tabs.query({}, (tabs) => {
  // Process tabs
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Handle updates
});
```

### Storage Operations
```javascript
// Save data
chrome.storage.local.set({ key: value });

// Load data
chrome.storage.local.get(['key'], (result) => {
  // Use result.key
});
```

## Code Style Guidelines

- Use modern JavaScript (ES6+)
- Prefer `const` and `let` over `var`
- Use arrow functions where appropriate
- Add JSDoc comments for complex functions
- Keep functions focused and single-purpose
- Follow existing naming conventions

## Debugging Tips

1. **Service Worker**: Inspect in `chrome://extensions/` → "Inspect views: service worker"
2. **Sidebar**: Right-click sidebar → "Inspect"
3. **Console Logs**: Check both service worker and sidebar consoles
4. **Storage**: View in DevTools → Application → Storage → Local Storage

## Important Files to Know

- **`/Users/lchenn/Repos/arcify/manifest.json`**: Extension configuration and permissions
- **`/Users/lchenn/Repos/arcify/background.js`**: Background service worker, handles global events
- **`/Users/lchenn/Repos/arcify/sidebar.js`**: Core sidebar functionality
- **`/Users/lchenn/Repos/arcify/chromeHelper.js`**: Wrapper functions for Chrome APIs
- **`/Users/lchenn/Repos/arcify/domManager.js`**: DOM manipulation helpers

## Release Process

The project uses automated releases:
1. Make and commit changes
2. Run `npm run release <type>` where type is:
   - `patch`: Bug fixes (2.2.0 → 2.2.1)
   - `minor`: New features (2.2.0 → 2.3.0)
   - `major`: Breaking changes (2.2.0 → 3.0.0)
3. GitHub Actions automatically builds and creates release

## Working with Claude

### When asking Claude for help:

1. **Be specific about the file**: Reference full file paths
2. **Provide context**: Mention which feature or component you're working on
3. **Include error messages**: Share complete console errors
4. **Test incrementally**: Ask Claude to help test each change

### Claude can help with:

- Adding new features to the sidebar
- Debugging Chrome API issues
- Improving UI/UX
- Refactoring code
- Writing documentation
- Creating test scenarios
- Optimizing performance

### Example prompts:

- "Add a keyboard shortcut to focus the search bar in `/Users/lchenn/Repos/arcify/sidebar.js`"
- "Fix the tab grouping logic in `/Users/lchenn/Repos/arcify/sidebar.js`"
- "Improve the styling of the search modal in `/Users/lchenn/Repos/arcify/styles.css`"
- "Debug why tabs aren't updating in real-time"

## Contributing

- Follow the guidelines in `/Users/lchenn/Repos/arcify/README.md`
- Join the Discord: https://discord.gg/D9jQHQnjNb
- Test thoroughly before submitting PRs
- Update documentation for new features

## Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extensions API Reference](https://developer.chrome.com/docs/extensions/reference/)
- [Arc Browser](https://arc.net/) - For design inspiration

## License

GPL v3.0 - See `/Users/lchenn/Repos/arcify/LICENSE` for details

import { LocalStorage } from './localstorage.js';

const MAX_ARCHIVED_TABS = 100;
const ARCHIVED_TABS_KEY = 'archivedTabs';

const Utils = {

    processBookmarkFolder: async function(folder, groupId) {
        const bookmarks = [];
        const items = await chrome.bookmarks.getChildren(folder.id);
        const tabs = await chrome.tabs.query({groupId: groupId});
        for (const item of items) {
            if (item.url) {
                // This is a bookmark
                const tab = tabs.find(t => t.url === item.url);
                if (tab) {
                    bookmarks.push(tab.id);
                    // Set tab name override with the bookmark's title
                    if (item.title && item.title !== tab.title) { // Only override if bookmark title is present and different
                        await this.setTabNameOverride(tab.id, tab.url, item.title);
                        console.log(`Override set for tab ${tab.id} from bookmark: ${item.title}`);
                    }
                }
            } else {
                // This is a folder, recursively process it
                const subFolderBookmarks = await this.processBookmarkFolder(item, groupId);
                bookmarks.push(...subFolderBookmarks);
            }
        }

        return bookmarks;
    },

    // Helper function to generate UUID (If you want to move this too)
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Helper function to fetch favicon
    getFaviconUrl: function(u, size = "16") {
        const url = new URL(chrome.runtime.getURL("/_favicon/"));
        url.searchParams.set("pageUrl", u);
        url.searchParams.set("size", size);
        return url.toString();
    },

    getSettings: async function() {
        const defaultSettings = {
            defaultSpaceName: 'Home',
            autoArchiveEnabled: false,
            autoArchiveIdleMinutes: 30,
            searchTabs: true,
            searchBookmarks: true,
            searchHistory: true,
        };
        const result = await chrome.storage.sync.get(defaultSettings);
        console.log("Retrieved settings:", result);
        return result;
    },

    // Get all overrides (keyed by tabId)
    getTabNameOverrides: async function() {
        const result = await chrome.storage.local.get('tabNameOverridesById'); // Changed key
        return result.tabNameOverridesById || {}; // Changed key
    },

    // Save all overrides (keyed by tabId)
    saveTabNameOverrides: async function (overrides) {
        await chrome.storage.local.set({ tabNameOverridesById: overrides }); // Changed key
    },

    // Set or update a single override using tabId
    setTabNameOverride: async function (tabId, url, name) { // Added tabId, kept url for domain
        if (!tabId || !url || !name) return; // Basic validation

        const overrides = await this.getTabNameOverrides();
        try {
            // Still store originalDomain in case we need it later, derived from the URL at time of setting
            const originalDomain = new URL(url).hostname;
            overrides[tabId] = { name: name, originalDomain: originalDomain }; // Use tabId as key
            await this.saveTabNameOverrides(overrides);
            console.log(`Override set for tab ${tabId}: ${name}`);
        } catch (e) {
            console.error("Error setting override - invalid URL?", url, e);
        }
    },

    // Remove an override using tabId
    removeTabNameOverride: async function (tabId) { // Changed parameter to tabId
        if (!tabId) return;

        const overrides = await this.getTabNameOverrides();
        if (overrides[tabId]) { // Check using tabId
            delete overrides[tabId]; // Delete using tabId
            await this.saveTabNameOverrides(overrides);
            console.log(`Override removed for tab ${tabId}`);
        }
    },

    getTabGroupColor: async function (groupName) {
        let tabGroups = await chrome.tabGroups.query({});

        const chromeTabGroupColors = [
            'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'
        ];
        const existingGroup = tabGroups.find(group => group.title === groupName);
        if (existingGroup) {
            return existingGroup.color;
        } else {
            const randomIndex = Math.floor(Math.random() * chromeTabGroupColors.length);
            return chromeTabGroupColors[randomIndex];
        }
    },

    updateBookmarkTitleIfNeeded: async function(tab, activeSpace, newTitle) {
        console.log(`Attempting to update bookmark for pinned tab ${tab.id} in space ${activeSpace.name} to title: ${newTitle}`);

        try {
            const spaceFolder = await LocalStorage.getOrCreateSpaceFolder(activeSpace.name);
            if (!spaceFolder) {
                console.error(`Bookmark folder for space ${activeSpace.name} not found.`);
                return;
            }

            // Recursive function to find and update the bookmark
            const findAndUpdate = async (folderId) => {
                const items = await chrome.bookmarks.getChildren(folderId);
                for (const item of items) {
                    if (item.url && item.url === tab.url) {
                        // Found the bookmark
                        // Avoid unnecessary updates if title is already correct
                        if (item.title !== newTitle) {
                            console.log(`Found bookmark ${item.id} for URL ${tab.url}. Updating title to "${newTitle}"`);
                            await chrome.bookmarks.update(item.id, { title: newTitle });
                        } else {
                             console.log(`Bookmark ${item.id} title already matches "${newTitle}". Skipping update.`);
                        }
                        return true; // Found
                    } else if (!item.url) {
                        // It's a subfolder, search recursively
                        const found = await findAndUpdate(item.id);
                        if (found) return true; // Stop searching if found in subfolder
                    }
                }
                return false; // Not found in this folder
            };

            const updated = await findAndUpdate(spaceFolder.id);
            if (!updated) {
                console.log(`Bookmark for URL ${tab.url} not found in space folder ${activeSpace.name}.`);
            }

        } catch (error) {
            console.error(`Error updating bookmark for tab ${tab.id}:`, error);
        }
    },

    // Function to get if archiving is enabled
    isArchivingEnabled: async function() {
        const settings = await this.getSettings();
        return settings.autoArchiveEnabled;
    },

    // Get all archived tabs
    getArchivedTabs: async function() {
        const result = await chrome.storage.local.get(ARCHIVED_TABS_KEY);
        return result[ARCHIVED_TABS_KEY] || [];
    },

    // Save all archived tabs
    saveArchivedTabs: async function(tabs) {
        await chrome.storage.local.set({ [ARCHIVED_TABS_KEY]: tabs });
    },

    // Add a tab to the archive
    addArchivedTab: async function(tabData) { // tabData = { url, name, spaceId, archivedAt }
        if (!tabData || !tabData.url || !tabData.name || !tabData.spaceId) return;

        const archivedTabs = await this.getArchivedTabs();

        const exists = archivedTabs.some(t => t.url === tabData.url && t.spaceId === tabData.spaceId);
        if (exists) {
            console.log(`Tab already archived: ${tabData.name}`);
            return; // Don't add duplicates
        }

        // Add new tab with timestamp
        const newArchiveEntry = { ...tabData, archivedAt: Date.now() };
        archivedTabs.push(newArchiveEntry);

        // Sort by timestamp (newest first for potential slicing, though FIFO means oldest removed)
        archivedTabs.sort((a, b) => b.archivedAt - a.archivedAt);

        // Enforce limit (remove oldest if over limit - FIFO)
        if (archivedTabs.length > MAX_ARCHIVED_TABS) {
            archivedTabs.splice(MAX_ARCHIVED_TABS); // Remove items from the end (oldest)
        }

        await this.saveArchivedTabs(archivedTabs);
        console.log(`Archived tab: ${tabData.name} from space ${tabData.spaceId}`);
    },

    // Function to archive a tab (likely called from context menu)
    archiveTab: async function(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (!tab || !activeSpaceId) return;

            const tabData = {
                url: tab.url,
                name: tab.title,
                spaceId: activeSpaceId // Archive within the current space
            };

            await this.addArchivedTab(tabData);
            await chrome.tabs.remove(tabId); // Close the original tab
            // Optionally: Refresh sidebar view if needed, though handleTabRemove should cover it

        } catch (error) {
            console.error(`Error archiving tab ${tabId}:`, error);
        }
    },

    // Remove a tab from the archive (e.g., after restoration)
    removeArchivedTab: async function(url, spaceId) {
        if (!url || !spaceId) return;

        let archivedTabs = await this.getArchivedTabs();
        archivedTabs = archivedTabs.filter(tab => !(tab.url === url && tab.spaceId === spaceId));
        await this.saveArchivedTabs(archivedTabs);
        console.log(`Removed archived tab: ${url} from space ${spaceId}`);
    },

    restoreArchivedTab: async function(archivedTabData) {
        try {
            // Create the tab in the original space's group
            const newTab = await chrome.tabs.create({
                url: archivedTabData.url,
                active: true, // Make it active
                // windowId: currentWindow.id // Ensure it's in the current window
            });

            // Immediately group the new tab into the correct space
            await chrome.tabs.group({ tabIds: [newTab.id] });

            // Remove from archive storage
            await this.removeArchivedTab(archivedTabData.url, archivedTabData.spaceId);

            // The handleTabCreated and handleTabUpdate listeners should add the tab to the UI.
            // If not, you might need to manually add it or refresh the space view.

        } catch (error) {
            console.error(`Error restoring archived tab ${archivedTabData.url}:`, error);
        }
    },

    setArchivingEnabled: async function(enabled) {
        const settings = await this.getSettings();
        settings.autoArchiveEnabled = enabled;
        await chrome.storage.sync.set({ autoArchiveEnabled: enabled });
    },

    setArchiveTime: async function(minutes) {
        const settings = await this.getSettings();
        settings.autoArchiveIdleMinutes = minutes;
        await chrome.storage.sync.set({ autoArchiveIdleMinutes: minutes });
    },

    // Search and remove bookmark by URL from a folder structure recursively
    searchAndRemoveBookmark: async function(folderId, tabUrl, options = {}) {
        const {
            removeTabElement = false, // Whether to also remove the tab element from DOM
            tabElement = null, // The tab element to remove if removeTabElement is true
            logRemoval = false // Whether to log the removal
        } = options;

        const items = await chrome.bookmarks.getChildren(folderId);
        for (const item of items) {
            if (item.url === tabUrl) {
                if (logRemoval) {
                    console.log("removing bookmark", item);
                }
                await chrome.bookmarks.remove(item.id);

                if (removeTabElement && tabElement) {
                    tabElement.remove();
                }

                return true; // Bookmark found and removed
            } else if (!item.url) {
                // This is a folder, search recursively
                const found = await this.searchAndRemoveBookmark(item.id, tabUrl, options);
                if (found) return true;
            }
        }
        return false; // Bookmark not found
    },

    // Get all custom pinned tab data
    getPinnedTabCustomizations: async function() {
        const result = await chrome.storage.local.get('pinnedTabCustomizations');
        return result.pinnedTabCustomizations || {};
    },

    // Save all custom pinned tab data
    savePinnedTabCustomizations: async function(customizations) {
        await chrome.storage.local.set({ pinnedTabCustomizations: customizations });
    },

    // Set or update customization for a pinned tab
    setPinnedTabCustomization: async function(tabId, customName, customFavicon) {
        if (!tabId) return;

        const customizations = await this.getPinnedTabCustomizations();
        customizations[tabId] = {
            customName: customName || null,
            customFavicon: customFavicon || null
        };
        await this.savePinnedTabCustomizations(customizations);
        console.log(`Customization set for pinned tab ${tabId}`);
    },

    // Get customization for a specific pinned tab
    getPinnedTabCustomization: async function(tabId) {
        const customizations = await this.getPinnedTabCustomizations();
        return customizations[tabId] || null;
    },

    // Remove customization for a pinned tab
    removePinnedTabCustomization: async function(tabId) {
        if (!tabId) return;

        const customizations = await this.getPinnedTabCustomizations();
        if (customizations[tabId]) {
            delete customizations[tabId];
            await this.savePinnedTabCustomizations(customizations);
            console.log(`Customization removed for pinned tab ${tabId}`);
        }
    },

    // Get or create the "Pinned Tabs" bookmark folder
    getOrCreatePinnedTabsFolder: async function() {
        const PINNED_TABS_FOLDER_NAME = 'Pinned Tabs';

        try {
            const arcifyFolder = await LocalStorage.getOrCreateArcifyFolder();
            const children = await chrome.bookmarks.getChildren(arcifyFolder.id);

            let pinnedTabsFolder = children.find(child =>
                child.title === PINNED_TABS_FOLDER_NAME && !child.url
            );

            if (!pinnedTabsFolder) {
                pinnedTabsFolder = await chrome.bookmarks.create({
                    parentId: arcifyFolder.id,
                    title: PINNED_TABS_FOLDER_NAME
                });
                console.log(`Created Pinned Tabs folder: ${pinnedTabsFolder.id}`);
            }

            return pinnedTabsFolder;
        } catch (error) {
            console.error('Error getting or creating Pinned Tabs folder:', error);
            return null;
        }
    },

    // Sync pinned tab to bookmarks
    syncPinnedTabToBookmark: async function(tab) {
        if (!tab || !tab.url) return;

        try {
            const pinnedTabsFolder = await this.getOrCreatePinnedTabsFolder();
            if (!pinnedTabsFolder) return;

            const customData = await this.getPinnedTabCustomization(tab.id);
            const bookmarkTitle = customData?.customName || tab.title || tab.url;

            const existingBookmarks = await chrome.bookmarks.getChildren(pinnedTabsFolder.id);
            const existingBookmark = existingBookmarks.find(b => b.url === tab.url);

            if (existingBookmark) {
                await chrome.bookmarks.update(existingBookmark.id, {
                    title: bookmarkTitle
                });
                console.log(`Updated pinned tab bookmark: ${bookmarkTitle}`);
            } else {
                await chrome.bookmarks.create({
                    parentId: pinnedTabsFolder.id,
                    title: bookmarkTitle,
                    url: tab.url
                });
                console.log(`Created pinned tab bookmark: ${bookmarkTitle}`);
            }
        } catch (error) {
            console.error('Error syncing pinned tab to bookmark:', error);
        }
    },

    // Remove pinned tab from bookmarks
    removePinnedTabFromBookmarks: async function(tabUrl) {
        if (!tabUrl) return;

        try {
            const pinnedTabsFolder = await this.getOrCreatePinnedTabsFolder();
            if (!pinnedTabsFolder) return;

            const bookmarks = await chrome.bookmarks.getChildren(pinnedTabsFolder.id);
            const bookmark = bookmarks.find(b => b.url === tabUrl);

            if (bookmark) {
                await chrome.bookmarks.remove(bookmark.id);
                console.log(`Removed pinned tab bookmark for: ${tabUrl}`);
            }
        } catch (error) {
            console.error('Error removing pinned tab from bookmarks:', error);
        }
    },

    // Update pinned tab bookmark when customization changes
    updatePinnedTabBookmark: async function(tabId, tabUrl, newTitle) {
        if (!tabUrl) return;

        try {
            const pinnedTabsFolder = await this.getOrCreatePinnedTabsFolder();
            if (!pinnedTabsFolder) return;

            const bookmarks = await chrome.bookmarks.getChildren(pinnedTabsFolder.id);
            const bookmark = bookmarks.find(b => b.url === tabUrl);

            if (bookmark && newTitle) {
                await chrome.bookmarks.update(bookmark.id, {
                    title: newTitle
                });
                console.log(`Updated pinned tab bookmark title to: ${newTitle}`);
            }
        } catch (error) {
            console.error('Error updating pinned tab bookmark:', error);
        }
    },

    // Restore pinned tabs from bookmarks
    restorePinnedTabsFromBookmarks: async function() {
        try {
            const pinnedTabsFolder = await this.getOrCreatePinnedTabsFolder();
            if (!pinnedTabsFolder) return;

            const bookmarks = await chrome.bookmarks.getChildren(pinnedTabsFolder.id);
            const allTabs = await chrome.tabs.query({});
            const pinnedTabs = allTabs.filter(tab => tab.pinned);

            console.log(`Restoring ${bookmarks.length} pinned tabs from bookmarks...`);

            // Track which pinned tabs have been matched to bookmarks
            const matchedPinnedTabIds = new Set();

            for (const bookmark of bookmarks) {
                if (!bookmark.url) continue;

                // First, check if there's already a pinned tab with this URL
                const pinnedTabWithUrl = pinnedTabs.find(tab =>
                    tab.url === bookmark.url && !matchedPinnedTabIds.has(tab.id)
                );

                if (pinnedTabWithUrl) {
                    // Already exists as pinned tab with correct URL - mark as matched
                    matchedPinnedTabIds.add(pinnedTabWithUrl.id);
                    console.log(`Pinned tab already exists: ${bookmark.title}`);
                    continue;
                }

                // Check if there's a non-pinned tab with this URL
                const unpinnedTabWithUrl = allTabs.find(tab =>
                    tab.url === bookmark.url && !tab.pinned
                );

                if (unpinnedTabWithUrl) {
                    // Tab exists but is not pinned - pin it
                    await chrome.tabs.update(unpinnedTabWithUrl.id, { pinned: true });
                    console.log(`Pinned existing tab: ${bookmark.title}`);
                    continue;
                }

                // Check if there's a pinned tab that hasn't been matched yet
                // (could have been navigated to a different URL)
                const unmatchedPinnedTab = pinnedTabs.find(tab =>
                    !matchedPinnedTabIds.has(tab.id)
                );

                if (unmatchedPinnedTab) {
                    // Reuse this pinned tab by navigating it to the bookmark URL
                    await chrome.tabs.update(unmatchedPinnedTab.id, { url: bookmark.url });
                    matchedPinnedTabIds.add(unmatchedPinnedTab.id);
                    console.log(`Reused pinned tab and navigated to: ${bookmark.title}`);
                } else {
                    // No existing tab found - create and pin a new one
                    const newTab = await chrome.tabs.create({
                        url: bookmark.url,
                        pinned: true,
                        active: false
                    });
                    console.log(`Created and pinned new tab: ${bookmark.title}`);
                }
            }

            console.log('Finished restoring pinned tabs from bookmarks');
        } catch (error) {
            console.error('Error restoring pinned tabs from bookmarks:', error);
        }
    },
}

export { Utils };

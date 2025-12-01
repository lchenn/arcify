import { Utils } from './utils.js';

// Function to save options to chrome.storage
async function saveOptions() {
  const defaultSpaceName = document.getElementById('defaultSpaceName').value;
  const autoArchiveEnabledCheckbox = document.getElementById('autoArchiveEnabled');
  const autoArchiveIdleMinutesInput = document.getElementById('autoArchiveIdleMinutes');
  const searchTabsCheckbox = document.getElementById('searchTabs');
  const searchBookmarksCheckbox = document.getElementById('searchBookmarks');
  const searchHistoryCheckbox = document.getElementById('searchHistory');
  const showPinnedTabTextCheckbox = document.getElementById('showPinnedTabText');

  const settings = {
    defaultSpaceName: defaultSpaceName || 'Home',
    autoArchiveEnabled: autoArchiveEnabledCheckbox.checked,
    autoArchiveIdleMinutes: parseInt(autoArchiveIdleMinutesInput.value, 10) || 30,
    searchTabs: searchTabsCheckbox.checked,
    searchBookmarks: searchBookmarksCheckbox.checked,
    searchHistory: searchHistoryCheckbox.checked,
    showPinnedTabText: showPinnedTabTextCheckbox.checked,
  };

  try {
    await chrome.storage.sync.set(settings);
    console.log('Settings saved:', settings);

    // Notify background script to update the alarm immediately
    await chrome.runtime.sendMessage({ action: 'updateAutoArchiveSettings' });

    // Show status message to user
    const status = document.getElementById('status');
    console.log('Status:', status);
    status.textContent = 'Options saved.';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Function to restore options from chrome.storage
async function restoreOptions() {

    const settings = await Utils.getSettings();

    const defaultSpaceName = document.getElementById('defaultSpaceName');
    const autoArchiveEnabledCheckbox = document.getElementById('autoArchiveEnabled');
    const autoArchiveIdleMinutesInput = document.getElementById('autoArchiveIdleMinutes');
    const searchTabsCheckbox = document.getElementById('searchTabs');
    const searchBookmarksCheckbox = document.getElementById('searchBookmarks');
    const searchHistoryCheckbox = document.getElementById('searchHistory');
    const showPinnedTabTextCheckbox = document.getElementById('showPinnedTabText');

    defaultSpaceName.value = settings.defaultSpaceName;
    autoArchiveEnabledCheckbox.checked = settings.autoArchiveEnabled;
    autoArchiveIdleMinutesInput.value = settings.autoArchiveIdleMinutes;
    searchTabsCheckbox.checked = settings.searchTabs !== false; // Default to true
    searchBookmarksCheckbox.checked = settings.searchBookmarks !== false; // Default to true
    searchHistoryCheckbox.checked = settings.searchHistory !== false; // Default to true
    showPinnedTabTextCheckbox.checked = settings.showPinnedTabText !== false; // Default to true
}

// Function to open Chrome's keyboard shortcuts page
function openShortcutsPage() {
    chrome.tabs.create({
        url: 'chrome://extensions/shortcuts',
        active: true
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('customizeShortcuts').addEventListener('click', openShortcutsPage);

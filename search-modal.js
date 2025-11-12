// Global search modal content script
// This script injects the search modal into web pages for global access

(function() {
    'use strict';

    // Avoid injecting multiple times
    if (window.__arcifySearchModalInjected) {
        return;
    }
    window.__arcifySearchModalInjected = true;

    // State
    let selectedResultIndex = -1;
    let searchResults = [];
    let searchTimeout;

    // Utility function to get favicon URL
    function getFaviconUrl(url, size = "32") {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=${size}`;
        } catch (e) {
            return 'chrome-extension://' + chrome.runtime.id + '/assets/default_icon.png';
        }
    }

    // Create modal HTML
    function createModalHTML() {
        const modal = document.createElement('div');
        modal.id = 'arcify-search-modal';
        modal.innerHTML = `
            <div class="arcify-modal-backdrop"></div>
            <div class="arcify-modal-container">
                <div class="arcify-search-input-wrapper">
                    <input type="text" id="arcify-search-input" placeholder="Search tabs, bookmarks, and history..." autocomplete="off">
                    <div class="arcify-search-shortcuts">
                        <span class="arcify-hint">
                            <kbd class="arcify-kbd">↑</kbd><kbd class="arcify-kbd">↓</kbd> to navigate
                        </span>
                        <span class="arcify-hint">
                            <kbd class="arcify-kbd">↵</kbd> to select
                        </span>
                        <span class="arcify-hint">
                            <kbd class="arcify-kbd">Esc</kbd> to close
                        </span>
                    </div>
                </div>
                <div id="arcify-search-results"></div>
            </div>
        `;
        return modal;
    }

    // Inject CSS
    function injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            #arcify-search-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                display: none;
                justify-content: center;
                align-items: flex-start;
                z-index: 2147483647; /* Maximum z-index */
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            }

            #arcify-search-modal * {
                box-sizing: border-box;
            }

            #arcify-search-modal.arcify-visible {
                display: flex;
            }

            .arcify-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
            }

            .arcify-modal-container {
                position: relative;
                background-color: rgba(255, 255, 255, 0.95);
                border-radius: 12px;
                padding: 12px;
                width: 90%;
                max-width: 600px;
                margin-top: 100px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(8px);
                max-height: calc(100vh - 200px);
                display: flex;
                flex-direction: column;
            }

            .arcify-search-input-wrapper {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            #arcify-search-input {
                width: 100%;
                padding: 12px;
                border: none;
                background: transparent;
                font-size: 16px;
                outline: none;
                color: #333;
            }

            #arcify-search-input::placeholder {
                color: #999;
            }

            .arcify-search-shortcuts {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 12px 8px 12px;
                font-size: 12px;
                color: #666;
                flex-wrap: wrap;
            }

            .arcify-kbd {
                display: inline-block;
                padding: 2px 6px;
                background: linear-gradient(180deg, #fefefe 0%, #f3f3f3 100%);
                border: 1px solid #d4d4d4;
                border-radius: 4px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
                font-size: 11px;
                font-weight: 500;
                color: #444;
                line-height: 1.4;
                min-width: 20px;
                text-align: center;
            }

            .arcify-hint {
                margin-right: 8px;
                color: #999;
            }

            #arcify-search-results {
                max-height: 400px;
                overflow-y: auto;
                margin-top: 8px;
            }

            #arcify-search-results::-webkit-scrollbar {
                width: 8px;
            }

            #arcify-search-results::-webkit-scrollbar-track {
                background: transparent;
            }

            #arcify-search-results::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
            }

            .arcify-search-result {
                display: flex;
                align-items: center;
                padding: 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                gap: 12px;
            }

            .arcify-search-result:hover,
            .arcify-search-result.arcify-selected {
                background-color: rgba(0, 0, 0, 0.05);
            }

            .arcify-search-result-icon {
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .arcify-search-result-icon img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                border-radius: 4px;
            }

            .arcify-search-result-content {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .arcify-search-result-title {
                font-size: 14px;
                font-weight: 500;
                color: #333;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .arcify-search-result-url {
                font-size: 12px;
                color: #666;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .arcify-search-result-type {
                flex-shrink: 0;
                font-size: 11px;
                text-transform: uppercase;
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: 600;
                letter-spacing: 0.5px;
                background-color: rgba(0, 0, 0, 0.08);
                color: #666;
            }

            .arcify-no-results {
                padding: 24px;
                text-align: center;
                color: #999;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize modal
    function initModal() {
        injectCSS();
        const modal = createModalHTML();
        document.body.appendChild(modal);

        const input = document.getElementById('arcify-search-input');
        const resultsContainer = document.getElementById('arcify-search-results');
        const modalElement = document.getElementById('arcify-search-modal');
        const backdrop = modal.querySelector('.arcify-modal-backdrop');

        // Input event listener
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
            }, 200);
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (searchResults.length > 0) {
                    selectedResultIndex = (selectedResultIndex + 1) % searchResults.length;
                    updateSelectedResult();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (searchResults.length > 0) {
                    selectedResultIndex = selectedResultIndex <= 0 ? searchResults.length - 1 : selectedResultIndex - 1;
                    updateSelectedResult();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedResultIndex >= 0 && searchResults[selectedResultIndex]) {
                    openResult(searchResults[selectedResultIndex]);
                }
            }
        });

        // Backdrop click to close
        backdrop.addEventListener('click', () => {
            closeModal();
        });
    }

    // Open modal
    function openModal() {
        const modal = document.getElementById('arcify-search-modal');
        const input = document.getElementById('arcify-search-input');
        const resultsContainer = document.getElementById('arcify-search-results');

        modal.classList.add('arcify-visible');
        input.value = '';
        resultsContainer.innerHTML = '';
        selectedResultIndex = -1;
        searchResults = [];

        // Focus after a brief delay
        setTimeout(() => {
            input.focus();
        }, 0);
    }

    // Close modal
    function closeModal() {
        const modal = document.getElementById('arcify-search-modal');
        modal.classList.remove('arcify-visible');
    }

    // Perform search
    async function performSearch(query) {
        if (!query.trim()) {
            const resultsContainer = document.getElementById('arcify-search-results');
            resultsContainer.innerHTML = '';
            searchResults = [];
            selectedResultIndex = -1;
            return;
        }

        // Send message to background script to perform search
        chrome.runtime.sendMessage({
            action: 'performSearch',
            query: query
        }, (response) => {
            if (response && response.results) {
                searchResults = response.results;
                displayResults(response.results);
            }
        });
    }

    // Display results
    function displayResults(results) {
        const resultsContainer = document.getElementById('arcify-search-results');

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="arcify-no-results">No results found</div>';
            return;
        }

        resultsContainer.innerHTML = '';
        results.forEach((result, index) => {
            const resultElement = document.createElement('div');
            resultElement.className = 'arcify-search-result';
            resultElement.dataset.index = index;

            const iconElement = document.createElement('div');
            iconElement.className = 'arcify-search-result-icon';

            const img = document.createElement('img');
            img.src = result.favIconUrl || getFaviconUrl(result.url, "32");
            img.onerror = () => {
                img.src = getFaviconUrl(result.url, "32");
            };
            iconElement.appendChild(img);

            const contentElement = document.createElement('div');
            contentElement.className = 'arcify-search-result-content';

            const titleElement = document.createElement('div');
            titleElement.className = 'arcify-search-result-title';
            titleElement.textContent = result.title || result.url;

            const urlElement = document.createElement('div');
            urlElement.className = 'arcify-search-result-url';
            urlElement.textContent = result.url;

            contentElement.appendChild(titleElement);
            contentElement.appendChild(urlElement);

            const typeElement = document.createElement('div');
            typeElement.className = 'arcify-search-result-type';
            typeElement.textContent = result.type;

            resultElement.appendChild(iconElement);
            resultElement.appendChild(contentElement);
            resultElement.appendChild(typeElement);

            resultElement.addEventListener('click', () => openResult(result));
            resultElement.addEventListener('mouseenter', () => {
                document.querySelectorAll('.arcify-search-result').forEach(el => el.classList.remove('arcify-selected'));
                resultElement.classList.add('arcify-selected');
                selectedResultIndex = index;
            });

            resultsContainer.appendChild(resultElement);
        });

        if (results.length > 0) {
            selectedResultIndex = 0;
            resultsContainer.children[0].classList.add('arcify-selected');
        }
    }

    // Update selected result
    function updateSelectedResult() {
        const resultsContainer = document.getElementById('arcify-search-results');
        Array.from(resultsContainer.children).forEach((el, index) => {
            if (index === selectedResultIndex) {
                el.classList.add('arcify-selected');
                el.scrollIntoView({ block: 'nearest' });
            } else {
                el.classList.remove('arcify-selected');
            }
        });
    }

    // Open result
    function openResult(result) {
        chrome.runtime.sendMessage({
            action: 'openSearchResult',
            result: result
        });
        closeModal();
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.command === 'openSearch') {
            openModal();
            sendResponse({ success: true });
        }
    });

    // Global keyboard listener
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('arcify-search-modal');

        // Close on ESC if modal is visible
        if (e.key === 'Escape' && modal && modal.classList.contains('arcify-visible')) {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
            return;
        }

        // Don't open if user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        )) {
            return;
        }

        // Open on Ctrl+K or Cmd+K
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            e.stopPropagation();
            openModal();
        }
    }, true); // Use capture phase

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModal);
    } else {
        initModal();
    }
})();

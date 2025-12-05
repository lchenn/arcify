// Tab Switcher Modal - Arc browser style tab switching with thumbnails

class TabSwitcherModal {
    constructor() {
        this.modal = null;
        this.tabHistory = [];
        this.currentIndex = 0;
        this.isVisible = false;
        this.hideTimeout = null;
    }

    createModal() {
        if (this.modal) return;

        // Create modal container
        this.modal = document.createElement('div');
        this.modal.id = 'arcify-tab-switcher-modal';
        this.modal.className = 'arcify-tab-switcher-modal';
        this.modal.innerHTML = `
            <div class="arcify-tab-switcher-container">
                <div class="arcify-tab-switcher-header">
                    <span class="arcify-tab-switcher-title">Recent Tabs</span>
                    <span class="arcify-tab-switcher-count"></span>
                </div>
                <div class="arcify-tab-switcher-list"></div>
                <div class="arcify-tab-switcher-hint">
                    <kbd>Cmd/Ctrl</kbd> + <kbd>[</kbd> to cycle through tabs
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .arcify-tab-switcher-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: none;
                animation: arcify-tab-switcher-fade-in 0.15s ease-out;
            }

            .arcify-tab-switcher-modal.visible {
                display: block;
            }

            @keyframes arcify-tab-switcher-fade-in {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            .arcify-tab-switcher-container {
                background: rgba(20, 20, 25, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 16px;
                padding: 16px;
                min-width: 500px;
                max-width: 700px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
                            0 0 0 1px rgba(255, 255, 255, 0.1);
            }

            .arcify-tab-switcher-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                margin-bottom: 12px;
            }

            .arcify-tab-switcher-title {
                font-size: 14px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
            }

            .arcify-tab-switcher-count {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
            }

            .arcify-tab-switcher-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 400px;
                overflow-y: auto;
            }

            .arcify-tab-switcher-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.05);
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            }

            .arcify-tab-switcher-item:hover {
                background: rgba(255, 255, 255, 0.08);
            }

            .arcify-tab-switcher-item.selected {
                background: rgba(88, 101, 242, 0.2);
                border-color: rgba(88, 101, 242, 0.5);
            }

            .arcify-tab-switcher-thumbnail {
                width: 80px;
                height: 45px;
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                flex-shrink: 0;
                position: relative;
            }

            .arcify-tab-switcher-thumbnail img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .arcify-tab-switcher-thumbnail-placeholder {
                width: 24px;
                height: 24px;
                color: rgba(255, 255, 255, 0.4);
            }

            .arcify-tab-switcher-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .arcify-tab-switcher-tab-title {
                font-size: 14px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.9);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .arcify-tab-switcher-tab-url {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .arcify-tab-switcher-favicon {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
            }

            .arcify-tab-switcher-hint {
                margin-top: 12px;
                padding: 8px 12px;
                text-align: center;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
            }

            .arcify-tab-switcher-hint kbd {
                background: rgba(255, 255, 255, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: inherit;
                font-size: 10px;
                margin: 0 2px;
            }

            /* Scrollbar styles */
            .arcify-tab-switcher-list::-webkit-scrollbar {
                width: 6px;
            }

            .arcify-tab-switcher-list::-webkit-scrollbar-track {
                background: transparent;
            }

            .arcify-tab-switcher-list::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }

            .arcify-tab-switcher-list::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.modal);
    }

    async show(tabDetails, currentIndex) {
        this.tabDetails = tabDetails;
        this.currentIndex = currentIndex;
        this.isVisible = true;

        if (!this.modal) {
            this.createModal();
        }

        // Clear hide timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        // Update modal content
        this.render(tabDetails);

        // Show modal
        this.modal.classList.add('visible');
    }

    render(tabDetails) {
        const listContainer = this.modal.querySelector('.arcify-tab-switcher-list');
        const countElement = this.modal.querySelector('.arcify-tab-switcher-count');

        // Update count
        countElement.textContent = `${this.currentIndex + 1} of ${tabDetails.length}`;

        // Clear list
        listContainer.innerHTML = '';

        // Add tab items
        tabDetails.forEach((tab, index) => {
            const item = document.createElement('div');
            item.className = 'arcify-tab-switcher-item';
            if (index === this.currentIndex) {
                item.classList.add('selected');
            }

            // Create thumbnail with placeholder icon
            const thumbnail = document.createElement('div');
            thumbnail.className = 'arcify-tab-switcher-thumbnail';

            // Placeholder icon (chrome.tabs API not available in content scripts)
            const placeholderIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            placeholderIcon.classList.add('arcify-tab-switcher-thumbnail-placeholder');
            placeholderIcon.setAttribute('viewBox', '0 0 24 24');
            placeholderIcon.setAttribute('fill', 'none');
            placeholderIcon.setAttribute('stroke', 'currentColor');
            placeholderIcon.setAttribute('stroke-width', '2');
            placeholderIcon.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />';
            thumbnail.appendChild(placeholderIcon);

            // Create info section
            const info = document.createElement('div');
            info.className = 'arcify-tab-switcher-info';

            const title = document.createElement('div');
            title.className = 'arcify-tab-switcher-tab-title';
            title.textContent = tab.title || 'Untitled';

            const url = document.createElement('div');
            url.className = 'arcify-tab-switcher-tab-url';
            url.textContent = tab.url || '';

            info.appendChild(title);
            info.appendChild(url);

            // Create favicon
            const favicon = document.createElement('img');
            favicon.className = 'arcify-tab-switcher-favicon';
            favicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect fill="%23ccc" width="24" height="24"/></svg>';
            favicon.onerror = () => {
                favicon.style.display = 'none';
            };

            // Assemble item
            item.appendChild(thumbnail);
            item.appendChild(info);
            item.appendChild(favicon);

            // Add click handler
            item.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    action: 'switchToTabFromModal',
                    tabId: tab.id
                });
                this.hide();
            });

            listContainer.appendChild(item);
        });

        // Scroll selected item into view
        const selectedItem = listContainer.querySelector('.selected');
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    hide() {
        if (!this.modal || !this.isVisible) return;

        this.modal.classList.remove('visible');
        this.isVisible = false;
    }

    scheduleHide(delay = 1000) {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, delay);
    }

    updateSelection(newIndex) {
        this.currentIndex = newIndex;

        // Update selected class
        const items = this.modal.querySelectorAll('.arcify-tab-switcher-item');
        items.forEach((item, index) => {
            if (index === newIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });

        // Update count
        const countElement = this.modal.querySelector('.arcify-tab-switcher-count');
        countElement.textContent = `${newIndex + 1} of ${items.length}`;
    }
}

// Initialize modal
const tabSwitcherModal = new TabSwitcherModal();

console.log('[Arcify Tab Switcher] Content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Arcify Tab Switcher] Received message:', request.action);

    if (request.action === 'showTabSwitcher') {
        console.log('[Arcify Tab Switcher] Showing modal with', request.tabDetails?.length, 'tabs at index', request.currentIndex);
        tabSwitcherModal.show(request.tabDetails, request.currentIndex);
        tabSwitcherModal.scheduleHide(1500);
    } else if (request.action === 'updateTabSwitcher') {
        if (request.tabDetails) {
            tabSwitcherModal.show(request.tabDetails, request.currentIndex);
        } else {
            tabSwitcherModal.updateSelection(request.currentIndex);
        }
        tabSwitcherModal.scheduleHide(1500);
    } else if (request.action === 'hideTabSwitcher') {
        tabSwitcherModal.hide();
    }
});

// Handle escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tabSwitcherModal.isVisible) {
        tabSwitcherModal.hide();
    }
});

import { languageManager, t } from '../../langs/LanguageManager';
import { RequestModal } from '../modals/RequestModal';
import { ToastMessageModal } from '../modals/ToastMessageModal';
import { authService } from '../../services/AuthService';

export class FriendsBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;
  private unsubscribeLanguageChange?: () => void;
  private requestModal: RequestModal;
  private generalMessageModal: ToastMessageModal | null = null;
  private chatModals: Map<string, ToastMessageModal> = new Map();
  private friendsData: any[] = [];
  private pendingMessages: Map<string, number> = new Map(); // Track unread messages per friend

  // Store bound event handlers
  private boundHandleFriendStatusChange!: (event: Event) => void;
  private boundHandleDirectMessageReceived!: (event: Event) => void;
  private boundHandleFriendsListChanged!: () => void;

  constructor() {
    this.container = document.getElementById("friends-box");
    this.requestModal = new RequestModal();

    // Bind event handlers once
    this.boundHandleFriendStatusChange = this.handleFriendStatusChange.bind(this);
    this.boundHandleDirectMessageReceived = this.handleDirectMessageReceived.bind(this);
    this.boundHandleFriendsListChanged = () => {
      this.loadAndRenderFriends().catch(() => {});
    };

    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      if (this.isRendered) {
        this.updateContent();
        this.setupEventListeners();
        this.loadAndRenderFriends().catch(() => {});
      }
    });

    // Listen for friends list changes
    window.addEventListener('friends-list-changed', this.boundHandleFriendsListChanged);

    // Listen for real-time friend status changes from socket
    window.addEventListener('friend-status-change', this.boundHandleFriendStatusChange);

    // Listen for direct messages to handle notifications
    window.addEventListener('direct-message-received', this.boundHandleDirectMessageReceived);
  }

private handleFriendStatusChange(event: Event): void {
    const customEvent = event as CustomEvent;
    const { username, status } = customEvent.detail;
    console.log(`Friend status update: ${username} is ${status}`);

    // Update friend status in the UI immediately
    this.updateFriendStatus(username, status);

    // Refresh friends list if needed (not relying only on UI updates)
    if (this.isRendered) {
        setTimeout(() => {
            this.loadAndRenderFriends().catch(err => {
                console.error("Error refreshing friends list after status change:", err);
            });
        }, 5000); // Refresh after 5 seconds to ensure server state is updated
    }
}


private handleDirectMessageReceived(event: Event): void {
    const customEvent = event as CustomEvent;
    const { from, text } = customEvent.detail;
    console.log(`Message received from: ${from} - "${text}"`);

    // Always increment pending message count
    this.incrementPendingMessageCount(from);

    // Update the UI to show pending message indicator
    this.updateFriendMessageIndicator(from);

    // If the friend is not in our list, refresh the list
    const friendExists = this.friendsData.some(f => f.username === from);
    if (!friendExists) {
        console.log(`Received message from ${from} who is not in friends list. Refreshing list.`);
        this.loadAndRenderFriends().catch(err => {
            console.error("Error refreshing friends list after message:", err);
        });
    }
}

private incrementPendingMessageCount(username: string): void {
    const currentCount = this.pendingMessages.get(username) || 0;
    this.pendingMessages.set(username, currentCount + 1);
    console.log(`Incremented message count for ${username} to ${currentCount + 1}`);
}

  private clearPendingMessageCount(username: string): void {
    this.pendingMessages.delete(username);
    this.updateFriendMessageIndicator(username);
  }

private updateFriendMessageIndicator(username: string): void {
    const count = this.pendingMessages.get(username) || 0;
    const friendCards = this.container?.querySelectorAll('.friend-card') || [];
    let foundMatch = false;

    console.log(`Updating message indicator for ${username}: ${count} pending messages`);

    friendCards.forEach((card) => {
        const usernameElement = card.querySelector('.friend-username');

        // Check if this card matches the username
        if (usernameElement?.textContent?.includes(`@${username}`)) {
            foundMatch = true;
            console.log(`Found friend card for ${username}, updating message indicator`);

            // Try to find or create the message indicator
            let messageIndicator = card.querySelector('.message-indicator');
            let messageCount = card.querySelector('.message-count');

            if (!messageIndicator) {
                // Create the indicator if it doesn't exist
                console.log(`Creating new message indicator for ${username}`);
                const actionButtons = card.querySelector('.friend-actions');
                if (actionButtons) {
                    const indicatorDiv = document.createElement('div');
                    indicatorDiv.className = 'message-indicator bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center';

                    const countSpan = document.createElement('span');
                    countSpan.className = 'message-count';
                    countSpan.textContent = '0';

                    indicatorDiv.appendChild(countSpan);
                    actionButtons.insertBefore(indicatorDiv, actionButtons.firstChild);

                    messageIndicator = indicatorDiv;
                    messageCount = countSpan;
                }
            }

            if (messageIndicator && messageCount) {
                if (count > 0) {
                    // Show indicator with count
                    messageIndicator.classList.remove('hidden');
                    messageCount.textContent = count.toString();
                } else {
                    // Hide indicator
                    messageIndicator.classList.add('hidden');
                }
            }
        }
    });

    if (!foundMatch && count > 0) {
        console.warn(`No friend card found for ${username} but has ${count} pending messages`);
        // Refresh the list to ensure we show all friends with messages
        this.loadAndRenderFriends().catch(err => {
            console.error("Error loading friends after message indicator update:", err);
        });
    }
}

private updateFriendStatus(username: string, status: string): void {
    console.log(`Updating friend status for ${username} to ${status}`);

    // Find friend in the DOM and update status indicator
    const friendCards = this.container?.querySelectorAll('.friend-card') || [];
    let foundMatch = false;

    friendCards.forEach((card) => {
        const usernameElement = card.querySelector('.friend-username');
        const statusCircle = card.querySelector('.status-circle');

        // Check if this card matches the username - look for @username format
        if (usernameElement?.textContent?.includes(`@${username}`)) {
            foundMatch = true;
            console.log(`Found matching card for ${username}, updating status to ${status}`);

            if (statusCircle) {
                // Remove existing status classes
                statusCircle.classList.remove('bg-green-500', 'bg-red-500', 'bg-gray-500');

                // Add new status class
                switch (status.toLowerCase()) {
                    case 'online':
                        statusCircle.classList.add('bg-green-500');
                        console.log(`Set ${username} status to online (green)`);
                        break;
                    case 'offline':
                        statusCircle.classList.add('bg-red-500');
                        console.log(`Set ${username} status to offline (red)`);
                        break;
                    default:
                        statusCircle.classList.add('bg-gray-500');
                        console.log(`Set ${username} status to unknown (gray)`);
                }
            } else {
                console.warn(`Status circle not found for ${username}`);
            }
        }
    });

    if (!foundMatch) {
        console.warn(`No matching friend card found for ${username}. Will refresh friends list.`);
        // If we couldn't find the friend in the DOM, reload the friends list
        this.loadAndRenderFriends().catch(err => {
            console.error("Error loading friends after status update:", err);
        });
    }

    // Update the friends data array as well
    const friendIndex = this.friendsData.findIndex(f => f.username === username);
    if (friendIndex !== -1) {
        this.friendsData[friendIndex].status = status;
    } else {
        console.warn(`Friend ${username} not found in friends data array`);
    }
}

  private getCurrentUser() {
    try {
      const raw = localStorage.getItem("ft_pong_user_data");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async render(): Promise<void> {
    if (!this.container) {
      console.error("Friends box container not found");
      return;
    }

    console.log("Rendering FriendsBox component...");

    try {
      this.updateContent();
      this.setupEventListeners();
      await this.loadAndRenderFriends();
      this.isRendered = true;
      console.log("FriendsBox component rendered successfully");
    } catch (error) {
      console.error("Error rendering FriendsBox:", error);
    }
  }

  private updateContent(): void {
    if (!this.container) return;

    const authToken = localStorage.getItem("ft_pong_auth_token");
    const userData = localStorage.getItem("ft_pong_user_data");

    if (authToken && userData) {
      this.container.innerHTML = this.getAuthenticatedContent();
    } else {
      this.container.innerHTML = this.getUnauthenticatedContent();
    }
  }

  private getAuthenticatedContent(): string {
    return `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-lime-500">Friends</h3>
        <div class="flex items-center gap-2">
          <button id="add-friend" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-300" title="${t('Add Friend')}">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
          </button>
          <button id="friend-requests" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-300" title="${t('Requests')}">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4-2-2-4 4"></path>
            </svg>
          </button>
          <button id="messages-toggle" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-300" title="${t('Messages')}">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="mb-4">
        <input
          id="friends-search"
          type="text"
          placeholder="${t('Search friends...')}"
          class="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-lime-500"
        >
      </div>

      <div id="friends-list" class="space-y-3">
        <div id="friends-empty" class="text-sm text-gray-400">
          ${t('Loading friends...')}
        </div>
      </div>
    `;
  }

  private getUnauthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">Friends</h3>
      <p class="text-gray-400">${t('Please log in to view friends')}</p>
      <button id="friends-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        ${t('Sign In')}
      </button>
    `;
  }

  private setupEventListeners(): void {
    const signinBtn = document.getElementById("friends-signin");
    const addFriendBtn = document.getElementById("add-friend");
    const requestsBtn = document.getElementById("friend-requests");
    const messagesToggleBtn = document.getElementById("messages-toggle");
    const searchInput = document.getElementById("friends-search") as HTMLInputElement;

    if (signinBtn) {
      signinBtn.addEventListener("click", () => this.showLoginModal());
    }

    if (addFriendBtn) {
      addFriendBtn.addEventListener("click", () => this.showAddFriendModal());
    }

    if (requestsBtn) {
      requestsBtn.addEventListener("click", () => this.showRequestsModal());
    }

    if (messagesToggleBtn) {
      messagesToggleBtn.addEventListener("click", () => this.showGeneralMessagesModal());
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) => this.handleSearch((e.target as HTMLInputElement).value));
    }
  }

  private handleSearch(query: string): void {
    const friendCards = this.container?.querySelectorAll('.friend-card') || [];
    const lowerQuery = query.toLowerCase();

    friendCards.forEach((card) => {
      const nameElement = card.querySelector('.friend-name');
      const usernameElement = card.querySelector('.friend-username');

      if (nameElement && usernameElement) {
        const name = nameElement.textContent?.toLowerCase() || '';
        const username = usernameElement.textContent?.toLowerCase() || '';

        if (name.includes(lowerQuery) || username.includes(lowerQuery)) {
          (card as HTMLElement).style.display = 'flex';
        } else {
          (card as HTMLElement).style.display = 'none';
        }
      }
    });
  }

  private showLoginModal(): void {
    console.log("FriendsBox: Trying to show login modal");
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      console.error("Modal service not available");
      alert(t('Login - Modal service not loaded'));
    }
  }

  private showGeneralMessagesModal(): void {
    console.log("Opening general messages modal");

    // Close existing general modal if open
    if (this.generalMessageModal) {
      this.generalMessageModal.close();
    }

    // Create new general message modal (shows all received messages)
    this.generalMessageModal = new ToastMessageModal();
    this.generalMessageModal.show();
  }

  private isGeneralMessageModalOpen(): boolean {
    return this.generalMessageModal?.isOpen() || false;
  }

  private async showAddFriendModal(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.userName) {
      alert(t('Please sign in first.'));
      return;
    }

    const friendUsername = prompt(t('Enter friends username:'));
    if (!friendUsername) return;

    if (friendUsername === me.userName) {
      alert(t('You cannot add yourself'));
      return;
    }

    try {
      const response = await authService.sendFriendRequest(me.userName, friendUsername);

      if (response.success) {
        alert(t('Friend request sent!'));
      } else {
        if (response.message?.includes('404')) {
          alert(t('User not found'));
        } else if (response.message?.includes('409')) {
          alert(t('Friend request already exists or user is already your friend'));
        } else {
          alert(t('Could not send request:') + ' ' + response.message);
        }
      }
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      alert(t('Could not send request:') + ' ' + err.message);
    }
  }

  private async showRequestsModal(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.userName) {
      alert(t('Please sign in first.'));
      return;
    }

    await this.requestModal.showRequests();
  }

  private async handleRemoveFriend(friendUsername: string): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.userName) {
      alert(t('Please sign in first.'));
      return;
    }

    if (!confirm(t('Are you sure you want to remove') + ` ${friendUsername}?`)) {
      return;
    }

    try {
      const response = await authService.removeFriend(me.userName, friendUsername);

      if (response.success) {
        alert(t('Friend removed'));
        await this.loadAndRenderFriends();
      } else {
        if (response.message?.includes('404')) {
          alert(t('Friend not found or already removed'));
        } else {
          alert(t('Failed to remove friend:') + ' ' + response.message);
        }
      }
    } catch (err: any) {
      console.error('Error removing friend:', err);
      alert(t('Failed to remove friend:') + ' ' + err.message);
    }
  }

  private handleChatFriend(friendUsername: string): void {
    console.log(`Opening chat with ${friendUsername}`);

    // Clear pending message count for this friend
    this.clearPendingMessageCount(friendUsername);

    // Close existing chat modal for this user if open
    const existingModal = this.chatModals.get(friendUsername);
    if (existingModal) {
      existingModal.close();
    }

    // Create new targeted chat modal
    const chatModal = new ToastMessageModal(friendUsername);
    this.chatModals.set(friendUsername, chatModal);

    chatModal.show();

    // Clean up modal reference when it's closed
    // Note: This is a simple cleanup - in production you might want a more robust system
    setTimeout(() => {
      if (!chatModal.isOpen()) {
        this.chatModals.delete(friendUsername);
      }
    }, 1000);
  }

  updateAuthState(_isAuthenticated: boolean): void {
    if (!this.isRendered) return;
    this.updateContent();
    this.setupEventListeners();
    this.loadAndRenderFriends().catch(() => {});
  }

  private async loadAndRenderFriends(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.id || !this.container) return;

    const listEl = this.container.querySelector("#friends-list");
    const emptyEl = this.container.querySelector("#friends-empty") as HTMLElement | null;
    if (!listEl) return;

    // Clear existing friend cards
    listEl.querySelectorAll(".friend-card").forEach((n) => n.remove());

    try {
      const response = await authService.getFriendsList(me.id);

      if (response.success && response.data) {
        const friends = Array.isArray(response.data) ? response.data : [];
        this.friendsData = friends; // Store friends data for status updates

        if (friends.length === 0) {
          if (emptyEl) {
            emptyEl.style.display = "block";
            emptyEl.textContent = t('No friends yet.');
          }
          return;
        }

        if (emptyEl) emptyEl.style.display = "none";

        for (const friend of friends) {
          const card = this.renderFriendCard(friend);
          listEl.insertAdjacentHTML("beforeend", card);
        }

        // Setup event listeners for dynamically created buttons
        this.setupFriendCardListeners();

        // Update message indicators for any pending messages
        this.pendingMessages.forEach((count, username) => {
          if (count > 0) {
            this.updateFriendMessageIndicator(username);
          }
        });
      } else {
        if (emptyEl) {
          emptyEl.style.display = "block";
          emptyEl.textContent = t('No friends yet.');
        }
      }
    } catch (e) {
      console.error("Failed to load friends:", e);
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.textContent = t("Could not load friends.");
      }
    }
  }

  private setupFriendCardListeners(): void {
    // Setup remove friend listeners
    const removeButtons = this.container?.querySelectorAll('.remove-friend-btn') || [];
    removeButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const username = btn.getAttribute('data-username');
        if (username) {
          this.handleRemoveFriend(username);
        }
      });
    });

    // Setup chat listeners
    const chatButtons = this.container?.querySelectorAll('.chat-friend-btn') || [];
    chatButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const username = btn.getAttribute('data-username');
        if (username) {
          this.handleChatFriend(username);
        }
      });
    });
  }

  private renderFriendCard(friend: any): string {
    const username = (friend.username || "").toString();
    const firstName = (friend.firstName || "").toString();
    const lastName = (friend.lastName || "").toString();
    const profilePath = friend.profilePath;
    const status = (friend.status || "offline").toString().toLowerCase();

    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || username || "Unknown";
    const initials = this.initialsFrom(displayName);
    const isOnline = status === "online";
    const pendingCount = this.pendingMessages.get(username) || 0;

    const color = this.colorFor(username);

    // Create avatar display - use profile image if available, otherwise show initials
    let avatarHtml = '';
    if (profilePath) {
      const fullAvatarPath = profilePath.startsWith('avatars/') ? profilePath : `avatars/${profilePath}`;
      avatarHtml = `
        <img src="${this.escape(fullAvatarPath)}"
             alt="${this.escape(displayName)}"
             class="w-8 h-8 rounded-full object-cover"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="w-8 h-8 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm" style="display: none;">
          ${initials}
        </div>
      `;
    } else {
      avatarHtml = `
        <div class="w-8 h-8 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm">
          ${initials}
        </div>
      `;
    }

    return `
      <div class="friend-card flex items-center justify-between bg-gray-700 p-3 rounded">
        <div class="flex items-center">
          <!-- Status Circle -->
          <div class="status-circle w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} mr-3"></div>

          ${avatarHtml}

          <div class="ml-3">
            <p class="friend-name text-sm font-medium text-white">${this.escape(displayName)}</p>
            <p class="friend-username text-xs text-gray-400">@${this.escape(username)}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Message Indicator (hidden by default, shown when messages are pending) -->
          <div class="message-indicator ${pendingCount > 0 ? '' : 'hidden'} bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            <span class="message-count">${pendingCount}</span>
          </div>

          <!-- Chat Icon -->
          <button
            class="chat-friend-btn p-1 hover:opacity-70 transition-opacity duration-300"
            data-username="${this.escape(username)}"
            title="${t('Chat')}"
          >
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </button>

          <!-- Remove/Trash Icon -->
          <button
            class="remove-friend-btn p-1 hover:opacity-70 transition-opacity duration-300"
            data-username="${this.escape(username)}"
            title="${t('Remove Friend')}"
          >
            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private initialsFrom(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() || "")
      .join("");
  }

  private colorFor(identifier: string): string {
    const colors = ["bg-lime-500", "bg-purple-500", "bg-blue-500", "bg-red-500", "bg-yellow-500"];
    if (!identifier) return colors[0];

    // Create a simple hash from the identifier
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  private escape(s: string): string {
    return s.replace(/[&<>"']/g, (c) => {
      switch (c) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return c;
      }
    });
  }

  destroy(): void {
    // Unsubscribe from language changes
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
    }

    // Remove event listeners
    window.removeEventListener('friend-status-change', this.boundHandleFriendStatusChange);
    window.removeEventListener('direct-message-received', this.boundHandleDirectMessageReceived);
    window.removeEventListener('friends-list-changed', this.boundHandleFriendsListChanged);

    // Cleanup request modal
    if (this.requestModal) {
      this.requestModal.destroy();
    }

    // Cleanup general message modal
    if (this.generalMessageModal) {
      this.generalMessageModal.destroy();
      this.generalMessageModal = null;
    }

    // Cleanup all chat modals
    this.chatModals.forEach((modal) => {
      modal.destroy();
    });
    this.chatModals.clear();

    if (this.container) {
      this.container.innerHTML = "";
    }
    this.isRendered = false;
    console.log("FriendsBox component destroyed");
  }
}

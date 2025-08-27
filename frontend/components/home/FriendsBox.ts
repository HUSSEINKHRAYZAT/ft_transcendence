import { languageManager, t } from '../../langs/LanguageManager';
import { RequestModal } from '../modals/RequestModal';
import { authService } from '../../services/AuthService';

export class FriendsBox
{
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;
  private unsubscribeLanguageChange?: () => void;
  private requestModal: RequestModal;

  constructor() {
    this.container = document.getElementById("friends-box");
    this.requestModal = new RequestModal();

    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      if (this.isRendered) {
        this.updateContent();
        this.setupEventListeners();
        this.loadAndRenderFriends().catch(() => {});
      }
    });

    window.addEventListener('friends-list-changed', () => {
      this.loadAndRenderFriends().catch(() => {});
    });
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

  /**
   * Show requests modal using the new RequestModal
   */
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
    // TODO: Implement chat functionality
    console.log(`Chat with ${friendUsername} - functionality to be implemented`);
  }

  /**
   * Update based on authentication state
   */
  updateAuthState(_isAuthenticated: boolean): void {
    if (!this.isRendered) return;
    this.updateContent();
    this.setupEventListeners();
    this.loadAndRenderFriends().catch(() => {});
  }

  /**
   * Load & render friends from backend through AuthService
   */
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
    const profilePath = friend.profilePath || friend.avatar;

    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || username || "Unknown";
    const initials = this.initialsFrom(displayName);
    const isOnline = String(friend.status || "").toLowerCase() === "online";

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
          <div class="w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} mr-3"></div>

          ${avatarHtml}

          <div class="ml-3">
            <p class="friend-name text-sm font-medium text-white">${this.escape(displayName)}</p>
            <p class="friend-username text-xs text-gray-400">@${this.escape(username)}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
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

  /**
   * Cleanup component resources
   */
  destroy(): void {
    // Unsubscribe from language changes
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
    }

    // Cleanup request modal
    if (this.requestModal) {
      this.requestModal.destroy();
    }

    if (this.container) {
      this.container.innerHTML = "";
    }
    this.isRendered = false;
    console.log("FriendsBox component destroyed");
  }
}

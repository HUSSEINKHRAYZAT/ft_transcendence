import { languageManager, t } from '../../langs/LanguageManager';
import { RequestModal } from '../modals/RequestModal';
import { authService } from '../../services/AuthService';

export class FriendsBox {
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

    // Listen for friends list changes (when requests are accepted)
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

  /**
   * Render the friends box
   */
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

  /**
   * Update content based on authentication state
   */
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

  /**
   * Get content for authenticated users
   */
  private getAuthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">Friends</h3>

      <div id="friends-list" class="space-y-3">
        <div id="friends-empty" class="text-sm text-gray-400">
          ${t('Loading friends...')}
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button id="add-friend" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          ${t('Add Friend')}
        </button>
        <button id="friend-requests" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          ${t('Requests')}
        </button>
      </div>

      <div class="mt-2 flex gap-2">
        <button id="remove-friend" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          ${t('Remove Friend')}
        </button>
        <button id="block-user" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          ${t('Block User')}
        </button>
      </div>
    `;
  }

  /**
   * Get content for unauthenticated users
   */
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
    const removeBtn = document.getElementById("remove-friend");
    const blockBtn = document.getElementById("block-user");

    if (signinBtn) {
      signinBtn.addEventListener("click", () => this.showLoginModal());
    }

    if (addFriendBtn) {
      addFriendBtn.addEventListener("click", () => this.showAddFriendModal());
    }

    if (requestsBtn) {
      requestsBtn.addEventListener("click", () => this.showRequestsModal());
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => this.showRemoveFriendModal());
    }

    if (blockBtn) {
      blockBtn.addEventListener("click", () => this.showBlockUserModal());
    }
  }

  /**
   * Show login modal
   */
  private showLoginModal(): void {
    console.log("FriendsBox: Trying to show login modal");
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      console.error("Modal service not available");
      alert(t('Login - Modal service not loaded'));
    }
  }

  /**
   * Show add friend modal
   */
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


  private async showRemoveFriendModal(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.userName) {
      alert(t('Please sign in first.'));
      return;
    }

    const friendUsername = prompt(t('Enter friends username to remove:'));
    if (!friendUsername) return;

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

  /**
   * Show block user modal
   */
  private async showBlockUserModal(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.userName) {
      alert(t('Please sign in first.'));
      return;
    }

    const username = prompt(t('Enter username to block:'));
    if (!username) return;

    if (username === me.userName) {
      alert(t('You cannot block yourself'));
      return;
    }

    try {
      const response = await authService.blockUser(me.userName, username);

      if (response.success) {
        alert(t('User blocked'));
        await this.loadAndRenderFriends();
      } else {
        if (response.message?.includes('404')) {
          alert(t('User not found'));
        } else {
          alert(t('Failed to block user:') + ' ' + response.message);
        }
      }
    } catch (err: any) {
      console.error('Error blocking user:', err);
      alert(t('Failed to block user:') + ' ' + err.message);
    }
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
       ${avatarHtml}
       <div class="ml-3">
         <p class="text-sm font-medium text-white">${this.escape(displayName)}</p>
         <p class="text-xs text-gray-400">@${this.escape(username)}</p>
         <p class="text-xs ${isOnline ? "text-green-400" : "text-gray-400"}">
           ${t(isOnline ? "Online" : "Offline")}
         </p>
       </div>
     </div>
     <button
       class="${isOnline ? "bg-lime-500 hover:bg-lime-600" : "bg-gray-600 cursor-not-allowed"} text-white text-xs px-3 py-1 rounded transition-all duration-300"
       ${isOnline ? "" : "disabled"}
       title="${t(isOnline ? "Invite to play" : "User is offline")}"
     >
       ${t(isOnline ? "Invite" : "Offline")}
     </button>
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

/**
 * Friends box component for FT_PONG
 */
export class FriendsBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;

  // ---- backend + storage helpers ----
  private BASE_URL = "http://localhost:3000";

  private getCurrentUser() {
    try {
      const raw = localStorage.getItem("ft_pong_user_data");
      return raw ? JSON.parse(raw) : null; // expects { id, ... }
    } catch {
      return null;
    }
  }

  private getAuthHeaders() {
    const token = localStorage.getItem("ft_pong_auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async apiFetch(path: string, opts: RequestInit = {}) {
    const res = await fetch(`${this.BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...(opts.headers || {}),
      },
      ...opts,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  private async findUserIdByEmail(email: string): Promise<number | null> {
    const users = await this.apiFetch("/users");
    const u = (users as any[]).find(
      (x) => String(x.email).toLowerCase() === email.toLowerCase()
    );
    return u?.id ?? null;
  }

  constructor() {
    this.container = document.getElementById("friends-box");
  }

  /**
   * Render the friends box
   */
  async render(): Promise<void> {
    if (!this.container) {
      console.error("❌ Friends box container not found");
      return;
    }

    console.log("👥 Rendering FriendsBox component...");

    try {
      this.updateContent();
      this.setupEventListeners();
      this.isRendered = true;
      console.log("✅ FriendsBox component rendered successfully");
    } catch (error) {
      console.error("❌ Error rendering FriendsBox:", error);
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
      // User is logged in - show friends
      this.container.innerHTML = this.getAuthenticatedContent();
    } else {
      // User is not logged in - show login prompt
      this.container.innerHTML = this.getUnauthenticatedContent();
    }
  }

  /**
   * Get content for authenticated users
   */
  private getAuthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">👥 Friends</h3>
      <div class="space-y-3">
        <div class="flex items-center justify-between bg-gray-700 p-3 rounded">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              JD
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-white">John Doe</p>
              <p class="text-xs text-green-400">● Online</p>
            </div>
          </div>
          <button class="bg-lime-500 hover:bg-lime-600 text-white text-xs px-3 py-1 rounded transition-all duration-300">
            Invite
          </button>
        </div>
        <div class="flex items-center justify-between bg-gray-700 p-3 rounded">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              AS
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-white">Alice Smith</p>
              <p class="text-xs text-gray-400">● Offline</p>
            </div>
          </div>
          <button class="bg-gray-600 text-white text-xs px-3 py-1 rounded cursor-not-allowed">
            Offline
          </button>
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button id="add-friend" class="flex-1 bg-dark-green-600 hover:bg-dark-green-700 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          Add Friend
        </button>
        <button id="friend-requests" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          Requests (2)
        </button>
      </div>

      <!-- quick actions -->
      <div class="mt-2 flex gap-2">
        <button id="remove-friend"
          class="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          Remove Friend
        </button>
        <button id="block-user"
          class="flex-1 bg-gray-800 hover:bg-black text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          Block User
        </button>
      </div>
    `;
  }

  /**
   * Get content for unauthenticated users
   */
  private getUnauthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">👥 Friends</h3>
      <p class="text-gray-400">Please log in to view friends</p>
      <button id="friends-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        Sign In
      </button>
    `;
  }

  /**
   * Setup event listeners
   */
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
      requestsBtn.addEventListener("click", () => this.showFriendRequests());
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", async () => {
        const me = this.getCurrentUser();
        if (!me?.id) return alert("Please sign in first.");
        const email = prompt("Enter friend's email to remove:");
        if (!email) return;
        try {
          const otherId = await this.findUserIdByEmail(email);
          if (!otherId) return alert("No user found with that email.");
          await this.removeFriend(otherId);
          alert("🗑️ Friend removed");
        } catch (e: any) {
          alert("Failed to remove: " + (e?.message || "unknown error"));
        }
      });
    }

    if (blockBtn) {
      blockBtn.addEventListener("click", async () => {
        const me = this.getCurrentUser();
        if (!me?.id) return alert("Please sign in first.");
        const email = prompt("Enter user's email to block:");
        if (!email) return;
        try {
          const otherId = await this.findUserIdByEmail(email);
          if (!otherId) return alert("No user found with that email.");
          await this.blockUser(otherId);
          alert("⛔ User blocked");
        } catch (e: any) {
          alert("Failed to block: " + (e?.message || "unknown error"));
        }
      });
    }
  }

  /**
   * Show login modal
   */
  private showLoginModal(): void {
    console.log("🔍 FriendsBox: Trying to show login modal");
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      console.error("❌ Modal service not available");
      alert("Login - Modal service not loaded");
    }
  }

  /**
   * Show add friend modal (checks email exists before sending)
   */
  private async showAddFriendModal(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.id) {
      alert("Please sign in first.");
      return;
    }

    const friendEmail = prompt("Enter friend's email:");
    if (!friendEmail) return;

    try {
      const toUserId = await this.findUserIdByEmail(friendEmail);
      if (!toUserId) {
        alert("No user found with this email.");
        return;
      }
      if (toUserId === me.id) {
        alert("You can’t add yourself 🙂");
        return;
      }

      const body = JSON.stringify({ fromUserId: me.id, toUserId });
      const data = await this.apiFetch("/friends/request", { method: "POST", body });
      console.log("Friend request sent:", data);
      alert("✅ Friend request sent!");
    } catch (err: any) {
      console.error(err);
      alert("❌ Could not send request: " + err.message);
    }
  }

  /**
   * Show friend requests (loads pending + accept one)
   */
  private async showFriendRequests(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.id) {
      alert("Please sign in first.");
      return;
    }

    try {
      const pending = await this.apiFetch(`/friends/pending/${me.id}`);
      if (!Array.isArray(pending) || pending.length === 0) {
        alert("No pending requests.");
        return;
      }

      const list = pending
        .map((r: any) => `• from #${r.requesterId} → you (#${r.addresseeId}) [${r.status}]`)
        .join("\n");

      const chosen = prompt(
        `Pending requests:\n${list}\n\nType the requesterId to accept (or Cancel):`
      );
      if (!chosen) return;

      const requesterId = Number(chosen);
      if (!requesterId) return;

      await this.apiFetch("/friends/accept", {
        method: "POST",
        body: JSON.stringify({ requesterId, addresseeId: me.id }),
      });

      alert("✅ Request accepted!");
    } catch (err: any) {
      console.error(err);
      alert("❌ Could not load/accept requests: " + err.message);
    }
  }

  /**
   * Update based on authentication state
   */
  updateAuthState(_isAuthenticated: boolean): void {
    if (!this.isRendered) return;
    this.updateContent();
    this.setupEventListeners();
  }

  /**
   * Add a friend to the list (UI only)
   */
  addFriend(name: string, isOnline: boolean = false): void {
    if (!this.container || !this.isRendered) return;

    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    const colors = ["bg-lime-500", "bg-purple-500", "bg-blue-500", "bg-red-500", "bg-yellow-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const friendHTML = `
      <div class="flex items-center justify-between bg-gray-700 p-3 rounded">
        <div class="flex items-center">
          <div class="w-8 h-8 ${randomColor} rounded-full flex items-center justify-center text-white font-bold text-sm">
            ${initials}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-white">${name}</p>
            <p class="text-xs ${isOnline ? "text-green-400" : "text-gray-400"}">
              ● ${isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <button class="${isOnline ? "bg-lime-500 hover:bg-lime-600" : "bg-gray-600 cursor-not-allowed"} text-white text-xs px-3 py-1 rounded transition-all duration-300">
          ${isOnline ? "Invite" : "Offline"}
        </button>
      </div>
    `;

    const friendsContainer = this.container.querySelector(".space-y-3");
    if (friendsContainer) {
      friendsContainer.insertAdjacentHTML("beforeend", friendHTML);
    }
  }

  /**
   * Cleanup component resources
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.isRendered = false;
    console.log("🧹 FriendsBox component destroyed");
  }

  // ------------------------------
  // Backend calls for friends ops
  // ------------------------------

  private async removeFriend(otherUserId: number) {
    const me = this.getCurrentUser();
    if (!me?.id) return alert("Please sign in first.");
    await this.apiFetch("/friends/remove", {
      method: "POST",
      body: JSON.stringify({ userId: me.id, otherUserId }),
    });
    alert("🗑️ Friend removed");
  }

  private async blockUser(otherUserId: number) {
    const me = this.getCurrentUser();
    if (!me?.id) return alert("Please sign in first.");
    await this.apiFetch("/friends/block", {
      method: "POST",
      body: JSON.stringify({ userId: me.id, otherUserId }),
    });
    alert("⛔ User blocked");
  }
}

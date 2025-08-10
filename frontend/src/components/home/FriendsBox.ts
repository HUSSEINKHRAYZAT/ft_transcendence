/**
 * Friends box component for FT_PONG
 */
export class FriendsBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;

  // ---- backend + storage helpers ----
  private BASE_URL = "http://localhost:3000";
  // adjust if your backend uses another route
  private FRIENDS_LIST_PATH = (userId: number) => `/friends/list/${userId}`;

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
      await this.refreshRequestsUI();
      await this.loadAndRenderFriends(); // <-- load from DB
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
      this.container.innerHTML = this.getAuthenticatedContent();
    } else {
      this.container.innerHTML = this.getUnauthenticatedContent();
    }
  }

  /**
   * Get content for authenticated users (no hardcoded users!)
   */
  private getAuthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">👥 Friends</h3>

      <div id="friends-list" class="space-y-3">
        <div id="friends-empty" class="text-sm text-gray-400">
          No friends yet.
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button id="add-friend" class="flex-1 bg-dark-green-600 hover:bg-dark-green-700 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          Add Friend
        </button>
        <button id="friend-requests" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded transition-all duration-300">
          Requests <span id="req-count-badge" class="inline-block ml-1 px-2 py-0.5 rounded bg-gray-800 text-white text-xs align-middle">0</span>
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

      <!-- requests modal host -->
      <div id="friend-req-modal-root"></div>
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
      requestsBtn.addEventListener("click", () => this.openRequestsModal());
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
          await this.loadAndRenderFriends(); // refresh list
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
          await this.loadAndRenderFriends(); // refresh list
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
   * Add friend (email must exist)
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
      await this.apiFetch("/friends/request", { method: "POST", body });
      alert("✅ Friend request sent!");
      await this.refreshRequestsUI();
    } catch (err: any) {
      console.error(err);
      alert("❌ Could not send request: " + err.message);
    }
  }

  /**
   * Requests modal (Accept works; refreshes badge and list)
   */
  private async openRequestsModal(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.id) {
      alert("Please sign in first.");
      return;
    }

    let pending: any[] = [];
    try {
      pending = await this.apiFetch(`/friends/pending/${me.id}`);
    } catch (e: any) {
      alert("Failed to load requests: " + (e?.message || "unknown error"));
      return;
    }

    const root = document.getElementById("friend-req-modal-root");
    if (!root) return;

    const listItems =
      pending.length === 0
        ? `<p class="text-sm text-gray-300">No pending requests.</p>`
        : pending
            .map(
              (r) => `
          <div class="flex items-center justify-between bg-gray-700 rounded p-3">
            <div class="text-sm text-white">
              <span class="font-semibold">Request from:</span>
              <span>#${r.requesterId}</span>
              <span class="ml-2 text-xs text-gray-300">[${r.status}]</span>
            </div>
            <div class="flex gap-2">
              <button data-requester="${r.requesterId}"
                class="req-accept bg-lime-600 hover:bg-lime-700 text-white text-xs font-bold px-3 py-1 rounded">
                Accept
              </button>
            </div>
          </div>`
            )
            .join("");

    root.innerHTML = `
      <div id="friend-req-overlay"
           class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div class="w-11/12 max-w-md bg-gray-800 rounded-2xl p-5 shadow-xl">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-lg font-bold text-white">Friend Requests</h4>
            <button id="req-close"
              class="text-white bg-gray-700 hover:bg-gray-600 rounded px-3 py-1 text-sm">
              Close
            </button>
          </div>
          <div class="space-y-3 max-h-80 overflow-auto">
            ${listItems}
          </div>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById("req-close");
    const overlay = document.getElementById("friend-req-overlay");
    const close = () => this.closeRequestsModal();
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
    }

    overlay?.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains("req-accept")) {
        const requesterId = Number(target.getAttribute("data-requester"));
        if (!requesterId) return;

        try {
          await this.apiFetch("/friends/accept", {
            method: "POST",
            body: JSON.stringify({ requesterId, addresseeId: me.id }),
          });
          await this.refreshRequestsUI();
          await this.loadAndRenderFriends(); // accepted -> becomes friend
          this.closeRequestsModal();
          alert("✅ Request accepted!");
        } catch (err: any) {
          console.error(err);
          alert("❌ Could not accept: " + err.message);
        }
      }
    });
  }

  private closeRequestsModal(): void {
    const root = document.getElementById("friend-req-modal-root");
    if (root) root.innerHTML = "";
  }

  /**
   * Update based on authentication state
   */
  updateAuthState(_isAuthenticated: boolean): void {
    if (!this.isRendered) return;
    this.updateContent();
    this.setupEventListeners();
    this.refreshRequestsUI().catch(() => {});
    this.loadAndRenderFriends().catch(() => {});
  }

  /**
   * Load & render friends from backend
   * Expected server shape (example):
   * [
   *   { id: 12, username: "alice", FirstName: "Alice", lastName: "Smith", status: "online" }
   * ]
   */
  private async loadAndRenderFriends(): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.id || !this.container) return;

    const listEl = this.container.querySelector("#friends-list");
    const emptyEl = this.container.querySelector("#friends-empty") as HTMLElement | null;
    if (!listEl) return;

    // clear all friend cards (but keep empty label for now)
    listEl.querySelectorAll(".friend-card").forEach((n) => n.remove());

    try {
      const friends = await this.apiFetch(this.FRIENDS_LIST_PATH(me.id));
      const arr: any[] = Array.isArray(friends) ? friends : [];

      if (arr.length === 0) {
        if (emptyEl) emptyEl.style.display = "block";
        return;
      }
      if (emptyEl) emptyEl.style.display = "none";

      for (const f of arr) {
        const card = this.renderFriendCard(f);
        listEl.insertAdjacentHTML("beforeend", card);
      }
    } catch (e) {
      console.error("Failed to load friends:", e);
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.textContent = "Could not load friends.";
      }
    }
  }

  private renderFriendCard(friend: any): string {
    const id = Number(friend.friendId ?? friend.id ?? 0);
    const first = (friend.FirstName || "").toString();
    const last = (friend.lastName || "").toString();
    const username = (friend.username || "").toString();
    const displayName =
      [first, last].filter(Boolean).join(" ").trim() || username || `#${id}`;
    const initials = this.initialsFrom(displayName);
    const isOnline = String(friend.status || "").toLowerCase() === "online";

    const color = this.colorFor(id);

    return `
      <div class="friend-card flex items-center justify-between bg-gray-700 p-3 rounded">
        <div class="flex items-center">
          <div class="w-8 h-8 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm">
            ${initials}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-white">${this.escape(displayName)}</p>
            <p class="text-xs ${isOnline ? "text-green-400" : "text-gray-400"}">
              ● ${isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <button
          class="${isOnline ? "bg-lime-500 hover:bg-lime-600" : "bg-gray-600 cursor-not-allowed"} text-white text-xs px-3 py-1 rounded transition-all duration-300"
          ${isOnline ? "" : "disabled"}
          title="${isOnline ? "Invite to play" : "User is offline"}"
        >
          ${isOnline ? "Invite" : "Offline"}
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

  private colorFor(id: number): string {
    const colors = ["bg-lime-500", "bg-purple-500", "bg-blue-500", "bg-red-500", "bg-yellow-500"];
    if (!id) return colors[0];
    return colors[id % colors.length];
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
  }

  private async blockUser(otherUserId: number) {
    const me = this.getCurrentUser();
    if (!me?.id) return alert("Please sign in first.");
    await this.apiFetch("/friends/block", {
      method: "POST",
      body: JSON.stringify({ userId: me.id, otherUserId }),
    });
  }

  // ------------------------------
  // Requests badge / visibility
  // ------------------------------

  private async refreshRequestsUI(): Promise<void> {
    const me = this.getCurrentUser();
    const badge = document.getElementById("req-count-badge");
    if (!me?.id || !badge) return;

    try {
      const pending = await this.apiFetch(`/friends/pending/${me.id}`);
      const count = Array.isArray(pending) ? pending.length : 0;
      badge.textContent = String(count);
      (badge as HTMLElement).style.display = count > 0 ? "inline-block" : "none";
    } catch {
      (badge as HTMLElement).style.display = "none";
    }
  }
}

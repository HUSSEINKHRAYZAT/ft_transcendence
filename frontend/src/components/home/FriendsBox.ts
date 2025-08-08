/**
 * Friends box component for FT_PONG
 */
export class FriendsBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;

  constructor() {
    this.container = document.getElementById('friends-box');
  }

  /**
   * Render the friends box
   */
  async render(): Promise<void> {
    if (!this.container) {
      console.error('❌ Friends box container not found');
      return;
    }

    console.log('👥 Rendering FriendsBox component...');

    try {
      this.updateContent();
      this.setupEventListeners();
      this.isRendered = true;
      console.log('✅ FriendsBox component rendered successfully');
    } catch (error) {
      console.error('❌ Error rendering FriendsBox:', error);
    }
  }

  /**
   * Update content based on authentication state
   */
  private updateContent(): void {
    if (!this.container) return;

    const authToken = localStorage.getItem('ft_pong_auth_token');
    const userData = localStorage.getItem('ft_pong_user_data');

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
    const signinBtn = document.getElementById('friends-signin');
    const addFriendBtn = document.getElementById('add-friend');
    const requestsBtn = document.getElementById('friend-requests');

    if (signinBtn) {
      signinBtn.addEventListener('click', () => this.showLoginModal());
    }

    if (addFriendBtn) {
      addFriendBtn.addEventListener('click', () => this.showAddFriendModal());
    }

    if (requestsBtn) {
      requestsBtn.addEventListener('click', () => this.showFriendRequests());
    }
  }

  /**
   * Show login modal
   */
  private showLoginModal(): void {
    console.log('🔍 FriendsBox: Trying to show login modal');
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      console.error('❌ Modal service not available');
      alert('Login - Modal service not loaded');
    }
  }

  /**
   * Show add friend modal
   */
  private showAddFriendModal(): void {
    const friendEmail = prompt('Enter friend\'s email:');
    if (friendEmail) {
      alert(`Friend request sent to ${friendEmail}!`);
      // TODO: Implement actual friend request functionality
    }
  }

  /**
   * Show friend requests
   */
  private showFriendRequests(): void {
    alert('Friend requests feature coming soon!');
    // TODO: Implement friend requests modal
  }

  /**
   * Update based on authentication state
   */
  updateAuthState(isAuthenticated: boolean): void {
    if (!this.isRendered) return;
    this.updateContent();
    this.setupEventListeners();
  }

  /**
   * Add a friend to the list
   */
  addFriend(name: string, isOnline: boolean = false): void {
    if (!this.container || !this.isRendered) return;

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const colors = ['bg-lime-500', 'bg-purple-500', 'bg-blue-500', 'bg-red-500', 'bg-yellow-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const friendHTML = `
      <div class="flex items-center justify-between bg-gray-700 p-3 rounded">
        <div class="flex items-center">
          <div class="w-8 h-8 ${randomColor} rounded-full flex items-center justify-center text-white font-bold text-sm">
            ${initials}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-white">${name}</p>
            <p class="text-xs ${isOnline ? 'text-green-400' : 'text-gray-400'}">
              ● ${isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <button class="${isOnline ? 'bg-lime-500 hover:bg-lime-600' : 'bg-gray-600 cursor-not-allowed'} text-white text-xs px-3 py-1 rounded transition-all duration-300">
          ${isOnline ? 'Invite' : 'Offline'}
        </button>
      </div>
    `;

    const friendsContainer = this.container.querySelector('.space-y-3');
    if (friendsContainer) {
      friendsContainer.insertAdjacentHTML('beforeend', friendHTML);
    }
  }

  /**
   * Cleanup component resources
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isRendered = false;
    console.log('🧹 FriendsBox component destroyed');
  }
}

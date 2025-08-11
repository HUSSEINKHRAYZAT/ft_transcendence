/**
 * Notification box component for FT_PONG
 */
export class NotificationBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;

  constructor() {
    this.container = document.getElementById('notifications-box');
  }

  /**
   * Render the notification box
   */
  async render(): Promise<void> {
    if (!this.container) {
      console.error('❌ Notification box container not found');
      return;
    }

    console.log('📢 Rendering NotificationBox component...');

    try {
      this.updateContent();
      this.setupEventListeners();
      this.isRendered = true;
      console.log('✅ NotificationBox component rendered successfully');
    } catch (error) {
      console.error('❌ Error rendering NotificationBox:', error);
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
      // User is logged in - show notifications
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
      <h3 class="text-xl font-bold mb-4 text-lime-500">📢 Notifications</h3>
      <div class="space-y-3">
        <div class="bg-gray-700 p-3 rounded border-l-4 border-lime-500">
          <p class="text-sm text-gray-300">Welcome to FT_PONG! Ready to play?</p>
          <span class="text-xs text-gray-500">Just now</span>
        </div>
        <div class="bg-gray-700 p-3 rounded border-l-4 border-blue-500">
          <p class="text-sm text-gray-300">New game features available!</p>
          <span class="text-xs text-gray-500">2 hours ago</span>
        </div>
      </div>
      <button id="clear-notifications" class="mt-4 text-sm text-gray-400 hover:text-lime-500 transition-colors duration-300">
        Clear all notifications
      </button>
    `;
  }

  /**
   * Get content for unauthenticated users
   */
  private getUnauthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">📢 Notifications</h3>
      <p class="text-gray-400">Please log in to view notifications</p>
      <button id="notify-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        Sign In
      </button>
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const signinBtn = document.getElementById('notify-signin');
    const clearBtn = document.getElementById('clear-notifications');

    if (signinBtn) {
      signinBtn.addEventListener('click', () => this.showLoginModal());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearNotifications());
    }
  }

  /**
   * Show login modal
   */
  private showLoginModal(): void {
    console.log('🔍 NotificationBox: Trying to show login modal');
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      console.error('❌ Modal service not available');
      alert('Login - Modal service not loaded');
    }
  }

  /**
   * Clear notifications
   */
  private clearNotifications(): void {
    if (this.container) {
      this.container.innerHTML = `
        <h3 class="text-xl font-bold mb-4 text-lime-500">📢 Notifications</h3>
        <p class="text-gray-400">No new notifications</p>
      `;
    }
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
   * Add a new notification
   */
  addNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if (!this.container || !this.isRendered) return;

    const colorMap = {
      info: 'border-blue-500',
      success: 'border-lime-500',
      warning: 'border-yellow-500',
      error: 'border-red-500'
    };

    const notificationHTML = `
      <div class="bg-gray-700 p-3 rounded border-l-4 ${colorMap[type]} mb-3">
        <p class="text-sm text-gray-300">${message}</p>
        <span class="text-xs text-gray-500">Just now</span>
      </div>
    `;

    // Find the space-y-3 container and prepend the new notification
    const notificationContainer = this.container.querySelector('.space-y-3');
    if (notificationContainer) {
      notificationContainer.insertAdjacentHTML('afterbegin', notificationHTML);
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
    console.log('🧹 NotificationBox component destroyed');
  }
}

/**
 * Notification box component for FT_PONG with i18n support
 */
import { languageManager, t } from '../../langs/LanguageManager';

export class NotificationBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;
  private unsubscribeLanguageChange?: () => void;

  constructor() {
    this.container = document.getElementById('notifications-box');

    // Listen for language changes to update UI
    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      if (this.isRendered) {
        this.updateContent();
        this.setupEventListeners();
      }
    });
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
      <h3 class="text-xl font-bold mb-4 text-lime-500">📢 ${t('Notifications')}</h3>
      <div class="space-y-3">
        <div class="bg-gray-700 p-3 rounded border-l-4 border-lime-500">
          <p class="text-sm text-gray-300">${t('Welcome to FT_PONG! Ready to play?')}</p>
          <span class="text-xs text-gray-500">${t('Just now')}</span>
        </div>
        <div class="bg-gray-700 p-3 rounded border-l-4 border-blue-500">
          <p class="text-sm text-gray-300">${t('New game features available!')}</p>
          <span class="text-xs text-gray-500">${t('2 hours ago')}</span>
        </div>
      </div>
      <button id="clear-notifications" class="mt-4 text-sm text-gray-400 hover:text-lime-500 transition-colors duration-300">
        ${t('Clear all notifications')}
      </button>
    `;
  }

  /**
   * Get content for unauthenticated users
   */
  private getUnauthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">📢 ${t('Notifications')}</h3>
      <p class="text-gray-400">${t('Please log in to view notifications')}</p>
      <button id="notify-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        ${t('Sign In')}
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
      alert(t('Login - Modal service not loaded'));
    }
  }

  /**
   * Clear notifications
   */
  private clearNotifications(): void {
    if (this.container) {
      this.container.innerHTML = `
        <h3 class="text-xl font-bold mb-4 text-lime-500">📢 ${t('Notifications')}</h3>
        <p class="text-gray-400">${t('No new notifications')}</p>
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

    // Translate the message if it's a known key, otherwise use as-is
    const translatedMessage = this.translateMessage(message);

    const notificationHTML = `
      <div class="bg-gray-700 p-3 rounded border-l-4 ${colorMap[type]} mb-3">
        <p class="text-sm text-gray-300">${translatedMessage}</p>
        <span class="text-xs text-gray-500">${t('Just now')}</span>
      </div>
    `;

    // Find the space-y-3 container and prepend the new notification
    const notificationContainer = this.container.querySelector('.space-y-3');
    if (notificationContainer) {
      notificationContainer.insertAdjacentHTML('afterbegin', notificationHTML);
    }
  }

  /**
   * Try to translate a message, return original if no translation found
   */
  private translateMessage(message: string): string {
    // Check if the message is a translation key
    if (languageManager.hasTranslation(message)) {
      return t(message);
    }
    // Return original message if no translation found
    return message;
  }

  /**
   * Add a notification with translation key
   */
  addTranslatedNotification(messageKey: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', replacements?: Record<string, string | number>): void {
    const translatedMessage = t(messageKey, replacements);
    this.addNotification(translatedMessage, type);
  }

  /**
   * Show a welcome notification for new users
   */
  showWelcomeNotification(userName?: string): void {
    if (userName) {
      this.addTranslatedNotification('Welcome back, {name}!', 'success', { name: userName });
    } else {
      this.addTranslatedNotification('Welcome to FT_PONG! Ready to play?', 'success');
    }
  }

  /**
   * Show game-related notifications
   */
  showGameNotification(type: 'start' | 'win' | 'lose' | 'invite', data?: any): void {
    switch (type) {
      case 'start':
        this.addTranslatedNotification('Game started!', 'info');
        break;
      case 'win':
        this.addTranslatedNotification('You Win!', 'success');
        break;
      case 'lose':
        this.addTranslatedNotification('You Lose!', 'error');
        break;
      case 'invite':
        if (data?.playerName) {
          this.addTranslatedNotification('Game invite from {name}', 'info', { name: data.playerName });
        } else {
          this.addTranslatedNotification('New game invitation!', 'info');
        }
        break;
    }
  }

  /**
   * Show system notifications
   */
  showSystemNotification(type: 'maintenance' | 'update' | 'feature'): void {
    switch (type) {
      case 'maintenance':
        this.addTranslatedNotification('Scheduled maintenance in progress', 'warning');
        break;
      case 'update':
        this.addTranslatedNotification('New game features available!', 'info');
        break;
      case 'feature':
        this.addTranslatedNotification('Check out our new tournament mode!', 'success');
        break;
    }
  }

  /**
   * Cleanup component resources
   */
  destroy(): void {
    // Unsubscribe from language changes
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
    }

    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isRendered = false;
    console.log('🧹 NotificationBox component destroyed');
  }
}

import { languageManager, t } from '../../langs/LanguageManager';

export class NotificationBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;
  private unsubscribeLanguageChange?: () => void;

  constructor() {
    this.container = document.getElementById('notifications-box');

    (window as any).notifyBox = this;

    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      if (this.isRendered) {
        this.updateContent();
        this.setupEventListeners();
      }
    });
  }

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

  private updateContent(): void {
    if (!this.container) return;

    const authToken = localStorage.getItem('ft_pong_auth_token');
    const userData = localStorage.getItem('ft_pong_user_data');

    if (authToken && userData) {
      // User is logged in - show notifications
      this.container.innerHTML = this.getAuthenticatedContent();
    }
    else
    {
      // User is not logged in - show login prompt
      this.container.innerHTML = this.getUnauthenticatedContent();
    }
  }

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

  private getUnauthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">📢 ${t('Notifications')}</h3>
      <p class="text-gray-400">${t('Please log in to view notifications')}</p>
      <button id="notify-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        ${t('Sign In')}
      </button>
    `;
  }

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

  private showLoginModal(): void {
    console.log('🔍 NotificationBox: Trying to show login modal');
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      console.error('❌ Modal service not available');
      alert(t('Login - Modal service not loaded'));
    }
  }

  private clearNotifications(): void {
    if (this.container) {
      this.container.innerHTML = `
        <h3 class="text-xl font-bold mb-4 text-lime-500">📢 ${t('Notifications')}</h3>
        <p class="text-gray-400">${t('No new notifications')}</p>
      `;
    }
  }


  updateAuthState(isAuthenticated: boolean): void {
    if (!this.isRendered) return;
    this.updateContent();
    this.setupEventListeners();
  }


  addNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if (!this.container || !this.isRendered) return;

    const colorMap = {
      info: 'border-blue-500',
      success: 'border-lime-500',
      warning: 'border-yellow-500',
      error: 'border-red-500'
    };

    const translatedMessage = this.translateMessage(message);

    const notificationHTML = `
      <div class="bg-gray-700 p-3 rounded border-l-4 ${colorMap[type]} mb-3">
        <p class="text-sm text-gray-300">${translatedMessage}</p>
        <span class="text-xs text-gray-500">${t('Just now')}</span>
      </div>
    `;

    const notificationContainer = this.container.querySelector('.space-y-3');
    if (notificationContainer) {
      notificationContainer.insertAdjacentHTML('afterbegin', notificationHTML);
    }
  }

  private translateMessage(message: string): string
  {
    if (languageManager.hasTranslation(message))
      return t(message);
    return message;
  }

  addTranslatedNotification(messageKey: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', replacements?: Record<string, string | number>): void {
    const translatedMessage = t(messageKey, replacements);
    this.addNotification(translatedMessage, type);
  }

  showWelcomeNotification(userName?: string): void {
    if (userName) {
      this.addTranslatedNotification('Welcome back, {name}!', 'success', { name: userName });
    } else {
      this.addTranslatedNotification('Welcome to FT_PONG! Ready to play?', 'success');
    }
  }

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
        this.addGameInviteNotification(data);
        break;
    }
  }

  private addGameInviteNotification(data: any): void {
    if (!this.container || !this.isRendered) return;

    const playerName = data?.playerName || 'Someone';
    const roomCode = data?.roomCode || '';
    const gameMode = data?.gameMode || '2p';

    const inviteHTML = `
      <div class="bg-blue-700 p-4 rounded border-l-4 border-blue-400 mb-3">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <p class="text-sm font-semibold text-blue-100 mb-1">🎮 Game Invitation</p>
            <p class="text-sm text-blue-200">${playerName} invited you to join a ${gameMode.toUpperCase()} game</p>
            ${roomCode ? `<p class="text-xs text-blue-300 mt-1">Room Code: <span class="font-mono font-bold">${roomCode}</span></p>` : ''}
            <span class="text-xs text-blue-400">${t('Just now')}</span>
          </div>
          <div class="flex gap-2 ml-3">
            <button class="join-game-btn px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors" data-room-code="${roomCode}" data-game-mode="${gameMode}">
              ${t('Join')}
            </button>
            <button class="ignore-invite-btn px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors">
              ${t('Ignore')}
            </button>
          </div>
        </div>
      </div>
    `;

    const notificationContainer = this.container.querySelector('.space-y-3');
    if (notificationContainer) {
      notificationContainer.insertAdjacentHTML('afterbegin', inviteHTML);

      // Add event listeners for the new buttons
      const joinBtn = notificationContainer.querySelector('.join-game-btn[data-room-code="' + roomCode + '"]') as HTMLButtonElement;
      const ignoreBtn = notificationContainer.querySelector('.ignore-invite-btn') as HTMLButtonElement;

      if (joinBtn) {
        joinBtn.onclick = () => {
          this.handleJoinGameInvite(roomCode, gameMode);
          joinBtn.closest('.bg-blue-700')?.remove();
        };
      }

      if (ignoreBtn) {
        ignoreBtn.onclick = () => {
          ignoreBtn.closest('.bg-blue-700')?.remove();
        };
      }
    }
  }

  private async handleJoinGameInvite(roomCode: string, gameMode: string): Promise<void> {
    try {
      // Import the join room function and trigger it
      const { joinSocketIORoom } = await import('../../menu/MenuActions');

      // Get current user data
      const userData = localStorage.getItem('ft_pong_user_data');
      const currentUser = userData ? JSON.parse(userData) : null;

      if (!currentUser) {
        alert('Please log in to join the game.');
        return;
      }

      // Call the join room function directly
      await joinSocketIORoom(gameMode as '2p' | '4p', currentUser, () => {
        // Game config resolved, game will start
        console.log('Joined game from invitation');
      });

    } catch (error) {
      console.error('Error joining game from invite:', error);
      alert('Failed to join the game. Please try again or join manually.');
    }
  }


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

  destroy(): void
  {
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

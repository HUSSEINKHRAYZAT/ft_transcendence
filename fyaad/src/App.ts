// Main application controller for FT_PONG
import { Navbar } from '@/components/navbar/Navbar';
import { Jumbotron } from '@/components/home/Jumbotron';
import { NotificationBox } from '@/components/home/NotificationBox';
import { FriendsBox } from '@/components/home/FriendsBox';
import { SettingsBox } from '@/components/home/SettingsBox';
import { BaseModal } from '@/components/modals/BaseModal';
import { LoginModal } from '@/components/modals/LoginModal';
import { SignupModal } from '@/components/modals/SignupModal';
import { InfoModal } from '@/components/modals/InfoModal';
import { PongGame } from '@/components/game/PongGame';

import { authService } from '@/services/AuthService';
import { gameService } from '@/services/GameService';
import { globalEventManager, globalKeyboardManager, AppEvent } from '@/utils/EventManager';
import { ModalType } from '@/utils/Constants';
import { findElement } from '@/utils/DOMHelpers';

/**
 * Main application class that orchestrates all components
 */
export class App {
  // Component instances
  private navbar!: Navbar;
  private jumbotron!: Jumbotron;
  private notificationBox!: NotificationBox;
  private friendsBox!: FriendsBox;
  private settingsBox!: SettingsBox;
  private pongGame!: PongGame;

  // Modal instances
  private loginModal!: LoginModal;
  private signupModal!: SignupModal;
  private infoModal!: InfoModal;
  private activeModal: BaseModal | null = null;

  // Application state
  private isInitialized: boolean = false;
  private currentView: 'home' | 'game' = 'home';

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('App is already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing FT_PONG application...');

      // Initialize services
      await this.initializeServices();

      // Initialize components
      await this.initializeComponents();

      // Initialize modals
      this.initializeModals();

      // Setup event listeners
      this.setupEventListeners();

      // Initial render
      await this.render();

      // Verify authentication
      await this.verifyAuthentication();

      this.isInitialized = true;
      console.log('✅ FT_PONG application initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Initialize services
   */
  private async initializeServices(): Promise<void> {
    console.log('🔧 Initializing services...');

    // Authentication service is already initialized as singleton
    // Game service is already initialized as singleton

    // Start keyboard manager for game controls
    globalKeyboardManager.start();

    console.log('✅ Services initialized');
  }

  /**
   * Initialize components
   */
  private async initializeComponents(): Promise<void> {
    console.log('🧩 Initializing components...');

    // Initialize navbar
    this.navbar = new Navbar();

    // Initialize home components
    this.jumbotron = new Jumbotron();
    this.notificationBox = new NotificationBox();
    this.friendsBox = new FriendsBox();
    this.settingsBox = new SettingsBox();

    // Initialize game component
    this.pongGame = new PongGame();

    console.log('✅ Components initialized');
  }

  /**
   * Initialize modals
   */
  private initializeModals(): void {
    console.log('🔳 Initializing modals...');

    this.loginModal = new LoginModal();
    this.signupModal = new SignupModal();
    this.infoModal = new InfoModal();

    console.log('✅ Modals initialized');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    console.log('👂 Setting up event listeners...');

    // Authentication events
    globalEventManager.on(AppEvent.AUTH_LOGIN, this.handleAuthLogin.bind(this));
    globalEventManager.on(AppEvent.AUTH_LOGOUT, this.handleAuthLogout.bind(this));
    globalEventManager.on(AppEvent.AUTH_SIGNUP, this.handleAuthSignup.bind(this));

    // Modal events
    globalEventManager.on(AppEvent.MODAL_OPEN, this.handleModalOpen.bind(this));
    globalEventManager.on(AppEvent.MODAL_CLOSE, this.handleModalClose.bind(this));

    // Game events
    globalEventManager.on(AppEvent.GAME_START, this.handleGameStart.bind(this));
    globalEventManager.on(AppEvent.GAME_END, this.handleGameEnd.bind(this));

    // Keyboard shortcuts
    globalKeyboardManager.onKeyDown('Escape', this.handleEscapeKey.bind(this));

    console.log('✅ Event listeners setup complete');
  }

  /**
   * Render the application
   */
  private async render(): Promise<void> {
    console.log('🎨 Rendering application...');

    try {
      // Render navbar
      await this.navbar.render();

      // Render home components
      await this.jumbotron.render();
      await this.notificationBox.render();
      await this.friendsBox.render();
      await this.settingsBox.render();

      // Update UI based on auth state
      this.updateUIForAuthState();

      console.log('✅ Application rendered successfully');

    } catch (error) {
      console.error('❌ Error rendering application:', error);
      throw error;
    }
  }

  /**
   * Verify authentication on app start
   */
  private async verifyAuthentication(): Promise<void> {
    console.log('🔐 Verifying authentication...');

    try {
      if (authService.isAuthenticated()) {
        const isValid = await authService.verifyToken();
        if (!isValid) {
          console.log('Token invalid, logging out...');
          await authService.logout();
        }
      }
    } catch (error) {
      console.error('Authentication verification failed:', error);
    }
  }

  /**
   * Update UI based on authentication state
   */
  private updateUIForAuthState(): void {
    const isAuthenticated = authService.isAuthenticated();
    const user = authService.getUser();

    // Update navbar profile section
    this.navbar.updateAuthState(isAuthenticated, user);

    // Update jumbotron button
    this.jumbotron.updateAuthState(isAuthenticated);

    // Update content boxes
    this.notificationBox.updateAuthState(isAuthenticated);
    this.friendsBox.updateAuthState(isAuthenticated);
    this.settingsBox.updateAuthState(isAuthenticated);

    // Update debug panel
    this.updateDebugPanel();
  }

  /**
   * Update debug panel information
   */
  private updateDebugPanel(): void {
    if (!import.meta.env.DEV) return;

    const authStatusEl = findElement('#debug-auth-status');
    const currentViewEl = findElement('#debug-current-view');
    const modalCountEl = findElement('#debug-modal-count');

    if (authStatusEl) {
      const isAuth = authService.isAuthenticated();
      const user = authService.getUser();
      authStatusEl.textContent = `Auth: ${isAuth ? `Yes (${user?.firstName})` : 'No'}`;
    }

    if (currentViewEl) {
      currentViewEl.textContent = `View: ${this.currentView}`;
    }

    if (modalCountEl) {
      const modalCount = document.querySelectorAll('.modal-backdrop').length;
      modalCountEl.textContent = `Modals: ${modalCount}`;
    }
  }

  // Event Handlers

  /**
   * Handle user login
   */
  private handleAuthLogin(user: any): void {
    console.log('👤 User logged in:', user.firstName);
    this.updateUIForAuthState();
    this.hideModal();

    // Show success message
    this.showToast('success', 'Welcome back!', `Hello ${user.firstName}!`);
  }

  /**
   * Handle user logout
   */
  private handleAuthLogout(): void {
    console.log('👋 User logged out');
    this.updateUIForAuthState();

    // Return to home view if in game
    if (this.currentView === 'game') {
      this.showHomeView();
    }

    this.showToast('info', 'Logged out', 'See you next time!');
  }

  /**
   * Handle user signup
   */
  private handleAuthSignup(user: any): void {
    console.log('🎉 User signed up:', user.firstName);
    this.updateUIForAuthState();
    this.hideModal();

    this.showToast('success', 'Welcome!', `Account created for ${user.firstName}!`);
  }

  /**
   * Handle modal open event
   */
  private handleModalOpen(modalType: ModalType): void {
    this.showModal(modalType);
  }

  /**
   * Handle modal close event
   */
  private handleModalClose(): void {
    this.hideModal();
  }

  /**
   * Handle game start
   */
  private handleGameStart(gameData: any): void {
    console.log('🎮 Game started:', gameData);
    this.showGameView();
  }

  /**
   * Handle game end
   */
  private handleGameEnd(result: any): void {
    console.log('🏁 Game ended:', result);
    this.showHomeView();

    // Show game result
    const winner = result.winner === 'player1' ? 'You' : 'Opponent';
    this.showToast('info', 'Game Over', `${winner} won! Final score: ${result.finalScore.player1}-${result.finalScore.player2}`);
  }

  /**
   * Handle escape key press
   */
  private handleEscapeKey(): void {
    if (this.activeModal) {
      this.hideModal();
    } else if (this.currentView === 'game' && gameService.isGameInProgress()) {
      // Pause game
      gameService.pauseGame();
    }
  }

  // Public Methods

  /**
   * Show modal by type
   */
  showModal(type: string): void {
    // Close any existing modal
    if (this.activeModal) {
      this.hideModal();
    }

    switch (type) {
      case ModalType.LOGIN:
        this.activeModal = this.loginModal;
        break;
      case ModalType.SIGNUP:
        this.activeModal = this.signupModal;
        break;
      case ModalType.HOME_INFO:
      case ModalType.ABOUT_INFO:
      case ModalType.PROJECT_INFO:
        this.infoModal.setContent(type);
        this.activeModal = this.infoModal;
        break;
      default:
        console.warn('Unknown modal type:', type);
        return;
    }

    if (this.activeModal) {
      this.activeModal.show();
      this.updateDebugPanel();
    }
  }

  /**
   * Hide current modal
   */
  hideModal(): void {
    if (this.activeModal) {
      this.activeModal.hide();
      this.activeModal = null;
      this.updateDebugPanel();
    }
  }

  /**
   * Show home view
   */
  showHomeView(): void {
    this.currentView = 'home';

    const homeContent = findElement('#home-content');
    const gameContainer = findElement('#game-container');

    if (homeContent) homeContent.classList.remove('hidden');
    if (gameContainer) gameContainer.classList.add('hidden');

    this.updateDebugPanel();
  }

  /**
   * Show game view
   */
  showGameView(): void {
    this.currentView = 'game';

    const homeContent = findElement('#home-content');
    const gameContainer = findElement('#game-container');

    if (homeContent) homeContent.classList.add('hidden');
    if (gameContainer) {
      gameContainer.classList.remove('hidden');
      // Initialize game canvas
      this.pongGame.render();
    }

    this.updateDebugPanel();
  }

  /**
   * Show toast notification
   */
  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    const toastContainer = findElement('#toast-container');
    if (!toastContainer) return;

    const toastId = `toast-${Date.now()}`;
    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const colorMap = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-yellow-600',
      info: 'bg-blue-600'
    };

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `${colorMap[type]} text-white p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="text-xl mr-3">${iconMap[type]}</div>
        <div class="flex-1">
          <div class="font-bold">${title}</div>
          <div class="text-sm opacity-90">${message}</div>
        </div>
        <button class="ml-3 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }, 5000);
  }

  // Getter methods for services (for debugging)

  /**
   * Get auth service instance
   */
  getAuthService() {
    return authService;
  }

  /**
   * Get game service instance
   */
  getGameService() {
    return gameService;
  }

  /**
   * Get current view
   */
  getCurrentView(): string {
    return this.currentView;
  }

  /**
   * Check if app is initialized
   */
  isAppInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    console.log('🧹 Cleaning up application...');

    // Stop keyboard manager
    globalKeyboardManager.stop();

    // Remove event listeners
    globalEventManager.removeAllListeners();

    // Destroy components
    if (this.pongGame) {
      this.pongGame.destroy();
    }

    // Hide any active modal
    this.hideModal();

    this.isInitialized = false;
    console.log('✅ Application cleanup complete');
  }
}

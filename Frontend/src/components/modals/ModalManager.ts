// ModalManager.ts - Main modal manager that coordinates all modals
import { LoginModal } from './LoginModal';
import { SignupModal } from './SignupModal';
import { InfoModal } from './InfoModal';
import { GameModal } from './GameModal';
import { MiniModal } from './MiniModal';
import { StatisticsModal } from './StatisticsModal';
import { RequestModal } from './RequestModal';
import { BlockedUsersModal } from './BlockedUsersModal';
import { ProfileModal } from './ProfileModal';

type InfoType = 'about' | 'project' | 'home';

export class ModalManager {
  private loginModal: LoginModal;
  private signupModal: SignupModal;
  private infoModal: InfoModal;
  private gameModal: GameModal;
  private statisticsModal: StatisticsModal;
  private requestModal: RequestModal;
  private blockedUsersModal: BlockedUsersModal;
  private profileModal: ProfileModal;

  constructor() {
    this.signupModal = new SignupModal(() => this.showLoginModal());
    this.loginModal = new LoginModal(() => this.showSignupModal());
    this.infoModal = new InfoModal();
    this.gameModal = new GameModal();
    this.statisticsModal = new StatisticsModal();
    this.requestModal = new RequestModal();
    this.blockedUsersModal = new BlockedUsersModal();
    this.profileModal = new ProfileModal();

    // Ensure URL starts at #/ so back doesn't exit the site
    if (!window.location.hash) {
      window.history.replaceState({}, '', '#/');
    }

    // Set up hash-based history listener for browser back/forward buttons
    this.setupHistoryListener();
  }

  /**
   * Listen for browser back/forward navigation using hashchange
   */
  private setupHistoryListener(): void {
    const handle = () => {
      const path = window.location.hash.slice(1) || '/';
      this.handleRouteChange(path);
    };

    window.addEventListener('hashchange', handle);
    // Handle initial hash on load
    handle();
  }

  /**
   * Handle route changes from browser navigation
   */
  private handleRouteChange(path: string): void {
    // Close all modals WITHOUT modifying URL
    this.closeAllModalsWithoutHistory();

    // Open the appropriate modal based on the path
    switch (path) {
      case '/login':
        this.loginModal.showModal();
        break;
      case '/signup':
        this.signupModal.showModal();
        break;
      case '/profile':
        // Open the full ProfileModal UI
        this.profileModal.showModal();
        break;
      case '/statistics':
        this.statisticsModal.showModal();
        break;
      case '/requests':
        this.requestModal.showRequests();
        break;
      case '/blocked':
        this.blockedUsersModal.showBlockedUsers();
        break;
      case '/about':
        this.infoModal.showModal('about');
        break;
      case '/project':
        this.infoModal.showModal('project');
        break;
      case '/home-info':
        this.infoModal.showModal('home');
        break;
      case '/':
      default:
        // Home - all modals closed
        break;
    }
  }

  // Routes: switch to hash navigation (do not open modal directly; let router handle it)
  showLoginModal(): void {
    window.location.hash = '/login';
  }

  showSignupModal(): void {
    window.location.hash = '/signup';
  }

  showInfoModal(type: InfoType): void {
    const path = type === 'about' ? '/about' : type === 'project' ? '/project' : '/home-info';
    window.location.hash = path;
  }

  showStatisticsModal(): void {
    window.location.hash = '/statistics';
  }

  showRequestsModal(): void {
    window.location.hash = '/requests';
  }

  showBlockedUsersModal(): void {
    window.location.hash = '/blocked';
  }

  showPlayGameModal(): void {
    this.closeAllModals();
    this.gameModal.showModal();
  }

  showMiniModal(config: {
    type: 'logout' | 'add' | 'confirm' | 'delete';
    message: string;
    title?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    inputType?: 'text' | 'email' | 'password';
    required?: boolean;
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
  }): void {
    const miniModal = new MiniModal();
    miniModal.showModal(config);
  }

  // Profile modal from non-routing contexts should navigate as well
  showProfileModal(): void {
    window.location.hash = '/profile';
  }

  closeAllModals(): void {
    this.closeAllModalsWithoutHistory();
    // Do not modify URL here; callers should set location.hash if needed
  }

  /**
   * Close all modals without updating browser history
   */
  private closeAllModalsWithoutHistory(): void {
    if (this.loginModal.isOpen()) this.loginModal.close();
    if (this.signupModal.isOpen()) this.signupModal.close();
    if (this.infoModal.isOpen()) this.infoModal.close();
    if (this.gameModal.isOpen()) this.gameModal.close();
    if (this.statisticsModal.isOpen()) this.statisticsModal.close();
    if (this.requestModal.isOpen()) this.requestModal.close();
    if (this.blockedUsersModal.isOpen()) this.blockedUsersModal.close();
    if (this.profileModal.isOpen()) this.profileModal.close();
  }

  closeModal(): void {
    this.closeAllModals();
  }

  isModalOpen(): boolean {
    return this.loginModal.isOpen() ||
           this.signupModal.isOpen() ||
           this.infoModal.isOpen() ||
           this.gameModal.isOpen() ||
           this.statisticsModal.isOpen() ||
           this.requestModal.isOpen() ||
           this.blockedUsersModal.isOpen() ||
           this.profileModal.isOpen();
  }

  getActiveModal(): string | null {
    if (this.loginModal.isOpen()) return 'login';
    if (this.signupModal.isOpen()) return 'signup';
    if (this.infoModal.isOpen()) return 'info';
    if (this.gameModal.isOpen()) return 'game';
    if (this.statisticsModal.isOpen()) return 'statistics';
    if (this.requestModal.isOpen()) return 'requests';
    if (this.blockedUsersModal.isOpen()) return 'blocked';
    if (this.profileModal.isOpen()) return 'profile';
    return null;
  }

  private createBasicProfileModal(user: any): void {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm bg-black/75 opacity-0 transition-opacity duration-300';
    backdrop.id = 'profile-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all duration-300 scale-95 opacity-0';

    modal.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-lime-500">Profile</h2>
        <button id="profile-modal-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
      </div>

      <div class="text-center mb-6">
        <div class="w-20 h-20 rounded-full bg-lime-500 flex items-center justify-center text-2xl font-bold text-gray-900 mx-auto mb-3">
          ${(user.firstName || user.userName || 'U').charAt(0).toUpperCase()}
        </div>
        <h3 class="text-xl font-bold text-white">${user.firstName || ''} ${user.lastName || ''}</h3>
        <p class="text-gray-400">${user.email || 'No email'}</p>
        ${user.userName ? `<p class="text-lime-400">@${user.userName}</p>` : ''}
      </div>

      <div class="space-y-3 mb-6">
        <div class="bg-gray-700 p-3 rounded">
          <span class="text-gray-400">Games Played:</span>
          <span class="text-white ml-2">${user.gamesPlayed !== undefined ? user.gamesPlayed : '0'}</span>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <span class="text-gray-400">Wins:</span>
          <span class="text-lime-500 ml-2 font-bold">${user.wins !== undefined ? user.wins : '0'}</span>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <span class="text-gray-400">Losses:</span>
          <span class="text-red-400 ml-2 font-bold">${user.losses !== undefined ? user.losses : '0'}</span>
        </div>
      </div>

      <button id="profile-close-btn" class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        Close
      </button>
    `;

    backdrop.appendChild(modal);
    modalContainer.appendChild(backdrop);

    const closeBtn = modal.querySelector('#profile-modal-close');
    const closeBtnBottom = modal.querySelector('#profile-close-btn');

    const closeAndBack = () => {
      // Animate out then go back
      backdrop.classList.add('opacity-0');
      modal.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        if (backdrop.parentElement) backdrop.remove();
        window.history.back();
      }, 300);
    };

    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeAndBack(); });
    if (closeBtnBottom) closeBtnBottom.addEventListener('click', (e) => { e.preventDefault(); closeAndBack(); });

    // Disable backdrop click-to-close and ESC to close
    // backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeAndBack(); });
    // const escapeHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') { closeAndBack(); document.removeEventListener('keydown', escapeHandler); } };
    // document.addEventListener('keydown', escapeHandler);

    setTimeout(() => {
      backdrop.classList.add('opacity-100');
      modal.classList.remove('scale-95', 'opacity-0');
      modal.classList.add('scale-100', 'opacity-100');
    }, 10);
  }

  /**
   * Show profile modal without closing other modals or updating history
   * Used during route changes
   */
  private showProfileModalWithoutClosing(): void {
    const userData = localStorage.getItem('ft_pong_user_data');
    let user = null;

    try {
      user = userData ? JSON.parse(userData) : null;
    } catch (error) {

    }

    if (!user) {
      this.showToast('error', 'No profile data found');
      return;
    }

    this.createBasicProfileModal(user);
  }

  private showToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed top-20 right-4 z-50 space-y-2';
      document.body.appendChild(toastContainer);
    }

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
          <div class="font-bold">${message}</div>
        </div>
        <button class="ml-3 text-white hover:text-gray-200 transition-colors duration-300" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    }, 100);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
          if (toast.parentElement) {
            toast.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  destroy(): void {
    this.closeAllModals();
    this.loginModal.destroy();
    this.signupModal.destroy();
    this.infoModal.destroy();
    this.gameModal.destroy();
    this.statisticsModal.destroy();
    this.requestModal.destroy();
    this.blockedUsersModal.destroy();
    this.profileModal.destroy();
  }
}

export const modalManager = new ModalManager();

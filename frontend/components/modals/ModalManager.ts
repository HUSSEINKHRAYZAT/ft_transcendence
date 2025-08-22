// ModalManager.ts - Main modal manager that coordinates all modals
import { LoginModal } from './LoginModal';
import { SignupModal } from './SignupModal';
import { InfoModal } from './InfoModal';
import { GameModal } from './GameModal';
import { MiniModal } from './MiniModal';

type InfoType = 'about' | 'project' | 'home';

export class ModalManager {
  private loginModal: LoginModal;
  private signupModal: SignupModal;
  private infoModal: InfoModal;
  private gameModal: GameModal;

  constructor() {
    // Initialize modals with cross-references for switching between login/signup
    this.signupModal = new SignupModal(() => this.showLoginModal());
    this.loginModal = new LoginModal(() => this.showSignupModal());
    this.infoModal = new InfoModal();
    this.gameModal = new GameModal();

    console.log('🔑 ModalManager initialized with all modal components');
  }

  /**
   * Show login modal
   */
  showLoginModal(): void {
    this.closeAllModals();
    this.loginModal.showModal();
  }

  /**
   * Show signup modal
   */
  showSignupModal(): void {
    this.closeAllModals();
    this.signupModal.showModal();
  }

  /**
   * Show info modal
   */
  showInfoModal(type: InfoType): void {
    this.closeAllModals();
    this.infoModal.showModal(type);
  }

  /**
   * Show game modal
   */
  showPlayGameModal(): void {
    this.closeAllModals();
    this.gameModal.showModal();
  }

  /**
   * Show mini modal
   */
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
    // Don't close other modals for mini modals - they can appear on top
    const miniModal = new MiniModal();
    miniModal.showModal(config);
  }

  /**
   * Show profile modal (basic implementation)
   */
  showProfileModal(): void {
    this.closeAllModals();

    const userData = localStorage.getItem('ft_pong_user_data');
    let user = null;

    try {
      user = userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
    }

    if (!user) {
      this.showToast('error', 'No profile data found');
      return;
    }

    // Create a simple profile modal using the base modal pattern
    this.createBasicProfileModal(user);
  }

  /**
   * Close all modals
   */
  closeAllModals(): void {
    if (this.loginModal.isOpen()) this.loginModal.close();
    if (this.signupModal.isOpen()) this.signupModal.close();
    if (this.infoModal.isOpen()) this.infoModal.close();
    if (this.gameModal.isOpen()) this.gameModal.close();
  }

  /**
   * Close current modal
   */
  closeModal(): void {
    this.closeAllModals();
  }

  /**
   * Check if any modal is open
   */
  isModalOpen(): boolean {
    return this.loginModal.isOpen() ||
           this.signupModal.isOpen() ||
           this.infoModal.isOpen() ||
           this.gameModal.isOpen();
  }

  /**
   * Get active modal type
   */
  getActiveModal(): string | null {
    if (this.loginModal.isOpen()) return 'login';
    if (this.signupModal.isOpen()) return 'signup';
    if (this.infoModal.isOpen()) return 'info';
    if (this.gameModal.isOpen()) return 'game';
    return null;
  }

  /**
   * Create basic profile modal
   */
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

    // Setup event listeners
    const closeBtn = modal.querySelector('#profile-modal-close');
    const closeBtnBottom = modal.querySelector('#profile-close-btn');

    const closeModal = () => {
      backdrop.classList.add('opacity-0');
      modal.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        if (backdrop.parentElement) {
          backdrop.remove();
        }
      }, 300);
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeBtnBottom) closeBtnBottom.addEventListener('click', closeModal);

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Close on Escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Animate in
    setTimeout(() => {
      backdrop.classList.add('opacity-100');
      modal.classList.remove('scale-95', 'opacity-0');
      modal.classList.add('scale-100', 'opacity-100');
    }, 10);
  }

  /**
   * Show toast notification
   */
  private showToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    // Create toast container if it doesn't exist
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

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    }, 100);

    // Auto remove after 3 seconds
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

  /**
   * Cleanup and destroy all modals
   */
  destroy(): void {
    this.closeAllModals();
    this.loginModal.destroy();
    this.signupModal.destroy();
    this.infoModal.destroy();
    this.gameModal.destroy();
    console.log('🧹 ModalManager destroyed');
  }
}

// Export singleton instance
export const modalManager = new ModalManager();

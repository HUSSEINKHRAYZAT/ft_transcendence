import { findElement, createElement } from '../../utils/DOMHelpers';
import { globalEventManager, AppEvent } from '../../utils/EventManager';
import { languageManager, t } from '../../langs/LanguageManager';

export abstract class BaseModal {
  protected modalContainer: HTMLElement | null = null;
  protected backdropElement: HTMLElement | null = null;
  protected activeModal: string | null = null;
  private unsubscribeLanguageChange?: () => void;

  constructor() {
    this.modalContainer = document.body;

    // Listen for language changes
    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      if (this.isOpen()) {
        this.updateContent();
        this.setupEventListeners();
      }
    });
  }

  protected abstract getModalContent(): string;

  protected abstract setupEventListeners(): void;

  protected getModalTitle(): string {
    return t('Modal');
  }

  protected getModalClasses(): string {
    return 'bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all duration-300 scale-95 opacity-0';
  }

  protected updateContent(): void {
    if (!this.activeModal || !this.backdropElement) return;

    // Update the modal content with new translations
    const modalContent = this.backdropElement.querySelector('.transform');
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-lime-500">${this.getModalTitle()}</h2>
          <button id="modal-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
        </div>
        ${this.getModalContent()}
      `;
    }
  }

  show(modalId: string): void {
    console.log(`🔍 Opening ${modalId} modal...`);
    this.close();

    if (!this.modalContainer) {
      console.error('❌ Modal container not found');
      return;
    }

    this.activeModal = modalId;
    this.createBackdrop();

    const modalContent = createElement('div', {
      className: this.getModalClasses(),
      innerHTML: `
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-lime-500">${this.getModalTitle()}</h2>
          <button id="modal-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
        </div>
        ${this.getModalContent()}
      `
    });

    if (this.backdropElement) {
      this.backdropElement.appendChild(modalContent);
    }

    this.setupBaseEventListeners();
    this.setupEventListeners();
    this.animateIn();
  }

  close(): void {
    if (!this.activeModal || !this.modalContainer) return;

    console.log('❌ Closing modal:', this.activeModal);

    this.animateOut(() => {
      if (this.backdropElement && this.modalContainer) {
        this.modalContainer.removeChild(this.backdropElement);
        this.backdropElement = null;
      }
      this.activeModal = null;
    });

    globalEventManager.emit(AppEvent.MODAL_CLOSE);
  }

  protected createBackdrop(): void {
    if (!this.modalContainer) return;

    this.backdropElement = createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm bg-black/75 opacity-0 transition-opacity duration-300'
    });

    this.backdropElement.addEventListener('click', (e) => {
      if (e.target === this.backdropElement) {
        this.close();
      }
    });

    document.addEventListener('keydown', this.handleEscapeKey);

    this.modalContainer.appendChild(this.backdropElement);
  }

  protected handleEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.activeModal) {
      this.close();
    }
  };

  protected setupBaseEventListeners(): void {
    const closeBtn = findElement('#modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  protected animateIn(): void {
    if (!this.backdropElement) return;

    setTimeout(() => {
      if (this.backdropElement) {
        this.backdropElement.classList.remove('opacity-0');
        this.backdropElement.classList.add('opacity-100');

        const modalContent = this.backdropElement.querySelector('.transform');
        if (modalContent) {
          modalContent.classList.remove('scale-95', 'opacity-0');
          modalContent.classList.add('scale-100', 'opacity-100');
        }
      }
    }, 10);
  }

  protected animateOut(callback: () => void): void {
    if (!this.backdropElement) {
      callback();
      return;
    }

    this.backdropElement.classList.remove('opacity-100');
    this.backdropElement.classList.add('opacity-0');

    const modalContent = this.backdropElement.querySelector('.transform');
    if (modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }

    setTimeout(() => {
      document.removeEventListener('keydown', this.handleEscapeKey);
      callback();
    }, 300);
  }

  protected showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    // Create toast container if it doesn't exist
    let toastContainer = findElement('#toast-container');
    if (!toastContainer) {
      toastContainer = createElement('div', {
        id: 'toast-container',
        className: 'fixed top-20 right-4 z-50 space-y-2'
      });
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

    const toast = createElement('div', {
      id: toastId,
      className: `${colorMap[type]} text-white p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`,
      innerHTML: `
        <div class="flex items-start">
          <div class="text-xl mr-3">${iconMap[type]}</div>
          <div class="flex-1">
            <div class="font-bold">${t(title)}</div>
            <div class="text-sm opacity-90">${t(message)}</div>
          </div>
          <button class="ml-3 text-white hover:text-gray-200 transition-colors duration-300" onclick="this.parentElement.parentElement.remove()">
            ✕
          </button>
        </div>
      `
    });

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

  protected showError(errorId: string, message: string): void {
    const errorDiv = findElement(`#${errorId}`);
    if (errorDiv) {
      errorDiv.textContent = t(message);
      errorDiv.classList.remove('hidden');
    }
  }

  protected triggerAuthUpdate(isAuthenticated: boolean, user?: any): void {
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated, user }
    }));

    setTimeout(() => {
      if (typeof (window as any).addBasicNavbar === 'function') {
        (window as any).addBasicNavbar();
      }
    }, 100);
  }

  protected getCurrentUser(): any {
    try {
      const userData = localStorage.getItem('ft_pong_user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  isOpen(): boolean {
    return this.activeModal !== null;
  }

  getActiveModalId(): string | null {
    return this.activeModal;
  }

  destroy(): void {
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
    }

    this.close();
    document.removeEventListener('keydown', this.handleEscapeKey);
  }
}

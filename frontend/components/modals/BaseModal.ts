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
    // Note: Language listener will be setup in show() method
    // to avoid conflicts between multiple modal instances
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

    // Update the modal content with new translations (no X button)
    const modalContent = this.backdropElement.querySelector('.transform');
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-lime-500">${this.getModalTitle()}</h2>
        </div>
        ${this.getModalContent()}
      `;
    }
  }

  async show(modalId: string): Promise<void> {
    console.log(`🔐 Opening ${modalId} modal...`);

    // Wait for any existing modal to close completely
    await this.close();

    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 50));

    if (!this.modalContainer) {
      console.error('❌ Modal container not found');
      return;
    }

    this.activeModal = modalId;

    // Re-setup language listener for the new modal
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
    }

    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      console.log('🌐 Language changed for modal:', this.activeModal);
      if (this.isOpen()) {
        this.updateContent();
        // IMPORTANT: Reattach base event listeners after content update
        this.setupBaseEventListeners();
        this.setupEventListeners();
      }
    });

    this.createBackdrop();

    const modalContent = createElement('div', {
      className: this.getModalClasses(),
      innerHTML: `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-lime-500">${this.getModalTitle()}</h2>
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

    console.log('✅ Modal opened:', modalId);
  }

  // Synchronous version for backward compatibility
  showSync(modalId: string): void {
    console.log(`🔐 Opening ${modalId} modal (sync)...`);

    this.closeSync();

    if (!this.modalContainer) {
      console.error('❌ Modal container not found');
      return;
    }

    // Small delay to let close animation finish
    setTimeout(() => {
      this.activeModal = modalId;

      // Re-setup language listener for the new modal
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
      }

      this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
        if (this.isOpen()) {
          this.updateContent();
          this.setupBaseEventListeners();
          this.setupEventListeners();
        }
      });

      this.createBackdrop();

      const modalContent = createElement('div', {
        className: this.getModalClasses(),
        innerHTML: `
          <div class="mb-6">
            <h2 class="text-2xl font-bold text-lime-500">${this.getModalTitle()}</h2>
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
    }, 100);
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.activeModal || !this.modalContainer) {
        resolve();
        return;
      }

      console.log('❌ Closing modal:', this.activeModal);

      // Clean up language listener IMMEDIATELY when closing
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = undefined;
        console.log('🧹 Language listener cleaned up for:', this.activeModal);
      }

      this.animateOut(() => {
        if (this.backdropElement && this.modalContainer) {
          this.modalContainer.removeChild(this.backdropElement);
          this.backdropElement = null;
        }
        this.activeModal = null;
        console.log('✅ Modal fully closed and cleaned up');
        resolve();
      });

      globalEventManager.emit(AppEvent.MODAL_CLOSE);
    });
  }

  // Synchronous version for backward compatibility
  closeSync(): void {
    if (!this.activeModal || !this.modalContainer) return;

    console.log('❌ Closing modal (sync):', this.activeModal);

    // Clean up language listener IMMEDIATELY when closing
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
      this.unsubscribeLanguageChange = undefined;
    }

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
    // No X button to set up listeners for anymore
    // Click outside to close is handled by backdrop click in createBackdrop()
    console.log('✅ Base modal listeners setup (click outside to close)');
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

  protected showToast(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ): void {
    // Make sure your NotificationBox instance is available
    if ((window as any).notifyBox) {
      const notifyBox = (window as any).notifyBox;

      // Compose the full message (optional: include title)
      const fullMessage = title ? `${title}: ${message}` : message;

      // Add notification
      notifyBox.addNotification(fullMessage, type);
    } else {
      console.warn('NotificationBox instance not found. Please initialize notifyBox globally.');
    }
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

  /**
   * Show modal - sync version for backward compatibility
   */
  showModal(): void {
    this.showSync('base');
  }

  /**
   * Show modal - async version for new code
   */
  async showModalAsync(): Promise<void> {
    await this.show('base');
  }

  isOpen(): boolean {
    return this.activeModal !== null;
  }

  getActiveModalId(): string | null {
    return this.activeModal;
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

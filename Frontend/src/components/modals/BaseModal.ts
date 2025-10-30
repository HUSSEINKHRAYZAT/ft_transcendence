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

    await this.close();

    await new Promise(resolve => setTimeout(resolve, 50));

    if (!this.modalContainer) {

      return;
    }

    this.activeModal = modalId;

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

  }

  showSync(modalId: string): void {

    this.closeSync();

    if (!this.modalContainer) {

      return;
    }

    setTimeout(() => {
      this.activeModal = modalId;

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

        resolve();
      });

      globalEventManager.emit(AppEvent.MODAL_CLOSE);
    });
  }

  closeSync(): void {
    if (!this.activeModal || !this.modalContainer) return;

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

    // Disabled: backdrop click-to-close and ESC-to-close. Use browser back instead.
    // this.backdropElement.addEventListener('click', (e) => {
    //   if (e.target === this.backdropElement) {
    //     this.close();
    //   }
    // });
    // document.addEventListener('keydown', this.handleEscapeKey);

    this.modalContainer.appendChild(this.backdropElement);
  }

  protected handleEscapeKey = (e: KeyboardEvent): void => {
    // Disabled: ESC key no longer closes modals. Use browser back.
    return;
  };

  protected setupBaseEventListeners(): void {
    // No close button here. Backdrop and ESC are disabled; close via browser back only.
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
    if ((window as any).notifyBox) {
      const notifyBox = (window as any).notifyBox;

      const fullMessage = title ? `${title}: ${message}` : message;

      // Add notification
      notifyBox.addNotification(fullMessage, type);
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

      return null;
    }
  }

  showModal(): void {
    this.showSync('base');
  }

  async showModalAsync(): Promise<void> {
    await this.show('base');
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

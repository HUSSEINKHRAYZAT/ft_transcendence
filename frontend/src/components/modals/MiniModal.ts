// MiniModal.ts - Mini modal component that extends BaseModal
import { BaseModal } from './BaseModal';
import { findElement } from '../../utils/DOMHelpers';

type MiniModalType = 'logout' | 'add' | 'confirm' | 'delete';

interface MiniModalConfig {
  type: MiniModalType;
  message: string;
  title?: string;
  placeholder?: string; // For 'add' type
  confirmText?: string;
  cancelText?: string;
  inputType?: 'text' | 'email' | 'password';
  required?: boolean;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

export class MiniModal extends BaseModal {
  private config: MiniModalConfig | null = null;

  protected getModalTitle(): string {
    if (!this.config) return 'Confirm';

    const defaultTitles = {
      logout: 'Confirm Logout',
      add: 'Add Item',
      confirm: 'Confirm Action',
      delete: 'Confirm Delete'
    };

    return this.config.title || defaultTitles[this.config.type];
  }

  protected getModalClasses(): string {
    // Smaller modal for mini modals
    return 'bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-6 transform transition-all duration-300 scale-95 opacity-0 border border-gray-700';
  }

  protected getModalContent(): string {
    if (!this.config) return '';

    const { type, message, placeholder, confirmText, cancelText, inputType, required } = this.config;

    // Get icon and colors based on type
    const typeConfig = this.getTypeConfig(type);

    if (type === 'add') {
      return `
        <div>
          <div class="w-12 h-12 mx-auto mb-4 ${typeConfig.iconBg} rounded-full flex items-center justify-center">
            ${typeConfig.icon}
          </div>
          <p class="text-gray-300 mb-4 text-center">${message}</p>
          <form id="mini-modal-form">
            <input
              type="${inputType || 'text'}"
              id="mini-modal-input"
              placeholder="${placeholder || 'Enter value...'}"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300 mb-4"
              ${required !== false ? 'required' : ''}
            >
            <div class="flex space-x-3">
              <button type="button" id="mini-modal-cancel" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-300">
                ${cancelText || 'Cancel'}
              </button>
              <button type="submit" id="mini-modal-confirm" class="flex-1 px-4 py-2 ${typeConfig.confirmBtn} text-white rounded-lg transition-colors duration-300">
                ${confirmText || 'Add'}
              </button>
            </div>
          </form>
        </div>
      `;
    } else {
      // Confirmation type modals (logout, confirm, delete)
      const defaultConfirmText = type === 'logout' ? 'Yes, Logout' :
                                 type === 'delete' ? 'Yes, Delete' : 'Confirm';

      return `
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-4 ${typeConfig.iconBg} rounded-full flex items-center justify-center">
            ${typeConfig.icon}
          </div>
          <p class="text-gray-300 mb-6">${message}</p>
          <div class="flex space-x-3">
            <button id="mini-modal-cancel" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-300">
              ${cancelText || 'Cancel'}
            </button>
            <button id="mini-modal-confirm" class="flex-1 px-4 py-2 ${typeConfig.confirmBtn} text-white rounded-lg transition-colors duration-300">
              ${confirmText || defaultConfirmText}
            </button>
          </div>
        </div>
      `;
    }
  }

  protected setupEventListeners(): void {
    const confirmBtn = findElement('#mini-modal-confirm') as HTMLButtonElement;
    const cancelBtn = findElement('#mini-modal-cancel') as HTMLButtonElement;
    const input = findElement('#mini-modal-input') as HTMLInputElement;
    const form = findElement('#mini-modal-form') as HTMLFormElement;

    // Handle confirm
    const handleConfirm = () => {
      if (this.config?.type === 'add') {
        const value = input?.value.trim();
        if (this.config.required !== false && !value) {
          this.showError('mini-modal-input', 'This field is required');
          return;
        }
        this.config.onConfirm?.(value);
      } else {
        this.config?.onConfirm?.();
      }
      this.close();
    };

    // Handle cancel
    const handleCancel = () => {
      this.config?.onCancel?.();
      this.close();
    };

    // Event listeners
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleConfirm);
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', handleCancel);
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleConfirm();
      });
    }

    // Focus input for 'add' type
    if (this.config?.type === 'add' && input) {
      setTimeout(() => {
        input.focus();
      }, 100);
    }

    // Clear any previous input errors on typing
    if (input) {
      input.addEventListener('input', () => {
        input.classList.remove('border-red-500');
        const errorMsg = input.parentElement?.querySelector('.error-message');
        if (errorMsg) {
          errorMsg.remove();
        }
      });
    }
  }

  /**
   * Get configuration for different modal types
   */
  private getTypeConfig(type: MiniModalType) {
    const configs = {
      logout: {
        iconBg: 'bg-red-100',
        confirmBtn: 'bg-red-600 hover:bg-red-700',
        icon: `<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>`
      },
      add: {
        iconBg: 'bg-lime-100',
        confirmBtn: 'bg-lime-600 hover:bg-lime-700',
        icon: `<svg class="w-6 h-6 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>`
      },
      confirm: {
        iconBg: 'bg-blue-100',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700',
        icon: `<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>`
      },
      delete: {
        iconBg: 'bg-red-100',
        confirmBtn: 'bg-red-600 hover:bg-red-700',
        icon: `<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>`
      }
    };

    return configs[type];
  }

  /**
   * Show error for input validation
   */
  private showError(inputId: string, message: string): void {
    const input = findElement(`#${inputId}`) as HTMLInputElement;
    if (input) {
      input.classList.add('border-red-500');

      // Remove existing error message
      const existingError = input.parentElement?.querySelector('.error-message');
      if (existingError) {
        existingError.remove();
      }

      // Add new error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message text-red-400 text-sm mt-1';
      errorDiv.textContent = message;
      input.parentElement?.insertBefore(errorDiv, input.nextSibling);
    }
  }

  /**
   * Show mini modal with configuration
   */
  showModal(config: MiniModalConfig): void {
    this.config = config;

    // Make sure the title is set before calling show
    console.log('🔍 MiniModal config:', config);
    console.log('🔍 MiniModal title will be:', this.getModalTitle());

    this.show(`mini-${config.type}`);
  }

  /**
   * Static method for quick usage (similar to confirm/prompt)
   */
  static show(config: MiniModalConfig): MiniModal {
    const miniModal = new MiniModal();
    miniModal.showModal(config);
    return miniModal;
  }

  /**
   * Override close to reset config
   */
  close(): void {
    super.close();
    this.config = null;
  }
}

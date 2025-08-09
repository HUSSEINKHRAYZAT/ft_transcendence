// ModalService.ts - Updated to use the new modular modal structure
import { modalManager } from './ModalManager';

/**
 * ModalService - Provides a clean interface that matches the existing API
 * while using the new modular modal structure underneath
 */
export class ModalService {
  constructor() {
    console.log('🔑 ModalService initialized with modular structure');
  }

  /**
   * Show login modal
   */
  showLoginModal(): void {
    modalManager.showLoginModal();
  }

  /**
   * Show signup modal
   */
  showSignupModal(): void {
    modalManager.showSignupModal();
  }

  /**
   * Show profile modal
   */
  showProfileModal(): void {
    modalManager.showProfileModal();
  }

  /**
   * Show info modal
   */
  showInfoModal(type: 'about' | 'project' | 'home'): void {
    modalManager.showInfoModal(type);
  }

  /**
   * Show play game modal
   */
  showPlayGameModal(): void {
    modalManager.showPlayGameModal();
  }

  /**
   * Show play game modal test (alias for compatibility)
   */
  showPlayGameModalTest(): void {
    modalManager.showPlayGameModal();
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
    modalManager.showMiniModal(config);
  }

  /**
   * Close current modal
   */
  closeModal(): void {
    modalManager.closeModal();
  }

  /**
   * Check if any modal is open
   */
  isModalOpen(): boolean {
    return modalManager.isModalOpen();
  }

  /**
   * Get active modal type
   */
  getActiveModal(): string | null {
    return modalManager.getActiveModal();
  }

  /**
   * Cleanup and destroy modal service
   */
  destroy(): void {
    modalManager.destroy();
    console.log('🧹 ModalService destroyed');
  }
}

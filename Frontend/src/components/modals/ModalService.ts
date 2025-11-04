// ModalService.ts - Updated to use the new modular modal structure
import { modalManager } from './ModalManager';

export class ModalService {
  constructor() {

  }

  showLoginModal(): void {
    modalManager.showLoginModal();
  }

  showSignupModal(): void {
    modalManager.showSignupModal();
  }

  showProfileModal(): void {
    modalManager.showProfileModal();
  }

  showInfoModal(type: 'about' | 'project' | 'home'): void {
    modalManager.showInfoModal(type);
  }

  showPlayGameModal(): void {
    // Fire and forget - don't block caller
    modalManager.showPlayGameModal().catch(console.error);
  }

  showPlayGameModalTest(): void {
    // Fire and forget - don't block caller
    modalManager.showPlayGameModal().catch(console.error);
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
    modalManager.showMiniModal(config);
  }

  showStatisticsModal(): void {
    modalManager.showStatisticsModal();
  }

  showRequestsModal(): void {
    modalManager.showRequestsModal();
  }

  showBlockedUsersModal(): void {
    modalManager.showBlockedUsersModal();
  }

  closeModal(): void {
    // Fire and forget - don't block caller
    modalManager.closeModal().catch(console.error);
  }

  isModalOpen(): boolean {
    return modalManager.isModalOpen();
  }

  getActiveModal(): string | null {
    return modalManager.getActiveModal();
  }

  destroy(): void {
    // Fire and forget - cleanup on best effort basis
    modalManager.destroy().catch(console.error);
  }
}


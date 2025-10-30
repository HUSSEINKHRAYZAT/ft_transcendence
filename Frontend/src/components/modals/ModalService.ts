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
    modalManager.showPlayGameModal();
  }

  showPlayGameModalTest(): void {
    modalManager.showPlayGameModal();
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
    modalManager.closeModal();
  }

  isModalOpen(): boolean {
    return modalManager.isModalOpen();
  }

  getActiveModal(): string | null {
    return modalManager.getActiveModal();
  }

  destroy(): void {
    modalManager.destroy();

  }
}


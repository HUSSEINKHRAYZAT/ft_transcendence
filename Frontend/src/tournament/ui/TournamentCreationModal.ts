/**
 * Tournament Creation Modal
 *
 * Allows users to create tournaments with:
 * - Size selection (4 players)
 * - Auto-start timer (optional)
 * - Share via link or QR code
 */

import { newTournamentService, TournamentSize, TournamentData } from '../NewTournamentService';
import { showConfirmDialog } from '../../components/modals/ConfirmDialog';
import { languageManager, t } from '../../langs/LanguageManager';

export class TournamentCreationModal {
  private container: HTMLElement | null = null;
  private selectedSize: TournamentSize = 4;
  private isCreating: boolean = false;
  private unsubscribeLanguageChange?: () => void;
  private boundHandleThemeChange?: () => void;

  constructor() {
    // Listen to language changes
    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      if (this.container) {
        this.refresh();
      }
    });

    // Listen to theme changes
    this.boundHandleThemeChange = () => {
      if (this.container) {
        // Theme changes are handled by CSS, but we can trigger refresh if needed

      }
    };
    window.addEventListener('theme-changed', this.boundHandleThemeChange);
    window.addEventListener('background-theme-changed', this.boundHandleThemeChange);
  }

  // ==================== CREATION ====================

  /**
   * Show the tournament creation modal
   */
  public show(): void {
    if (this.container) {
      return; // Already showing
    }

    this.container = document.createElement('div');
    this.container.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    this.container.innerHTML = this.getModalHTML();
    document.body.appendChild(this.container);

    this.attachEventListeners();
  }

  /**
   * Hide the modal
   */
  public hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  /**
   * Refresh the modal content (for language changes)
   */
  private refresh(): void {
    if (!this.container) return;

    const currentSize = this.selectedSize;
    const wasCreating = this.isCreating;

    // Save scroll position
    const modalBody = this.container.querySelector('.overflow-y-auto') as HTMLElement;
    const scrollTop = modalBody?.scrollTop || 0;

    // Update HTML
    this.container.innerHTML = this.getModalHTML();
    this.attachEventListeners();

    // Restore state
    this.selectedSize = currentSize;
    this.isCreating = wasCreating;

    // Restore scroll position
    const newModalBody = this.container.querySelector('.overflow-y-auto') as HTMLElement;
    if (newModalBody) {
      newModalBody.scrollTop = scrollTop;
    }
  }

  // ==================== HTML GENERATION ====================

  private getModalHTML(): string {
    return `
      <div class="bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-lime-400/30 max-w-md w-full mx-4 p-8 max-h-[90vh] overflow-y-auto transform transition-all">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8 border-b border-gray-700 pb-4">
          <h2 class="text-3xl font-extrabold text-lime-400 drop-shadow-lg tracking-wide flex items-center gap-2">
            <span class="text-2xl">🏆</span> ${t('Create Tournament')}
          </h2>
          <button class="text-gray-400 hover:text-white text-3xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400/60 rounded-full px-2" data-action="close">
            ×
          </button>
        </div>

        <!-- Body -->
        <div class="space-y-8">
          <!-- Size Selection -->
          <div>
            <label class="block text-base font-semibold text-gray-200 mb-4 tracking-wide">${t('Tournament Size')}</label>
            <div class="flex justify-center">
              ${this.getSizeButtonHTML(4)}
            </div>
          </div>

          <!-- Game Settings -->
          <div>
            <label class="block text-base font-semibold text-gray-200 mb-4 tracking-wide">${t('Game Settings')}</label>
            <div class="bg-gray-700/70 rounded-xl p-5 space-y-4 shadow-inner">
              <div class="flex items-center gap-3">
                <span class="text-2xl">⚽</span>
                <span class="text-gray-200 font-medium">${t('First to 5 goals wins')}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-2xl">🏁</span>
                <span class="text-gray-200 font-medium">${t('Single elimination bracket')}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-4 pt-4">
            <button class="flex-1 bg-gray-700/80 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow focus:outline-none focus:ring-2 focus:ring-lime-400/60" data-action="cancel">
              ${t('Cancel')}
            </button>
            <button class="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-lime-400/60" data-action="create" id="createBtn">
              <span>🎮</span>
              <span>${t('Create Tournament')}</span>
            </button>
          </div>

          <!-- Loading State -->
          <div class="hidden text-center py-6" id="loadingState">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-lime-500 mb-3"></div>
            <p class="text-gray-300">${t('Creating tournament...')}</p>
          </div>

          <!-- Error State -->
          <div class="hidden" id="errorState">
            <div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-xl">
              <p id="errorMessage"></p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getSizeButtonHTML(size: TournamentSize): string {
    const isSelected = size === this.selectedSize;
    const rounds = this.getRoundsForSize(size);

    return `
      <button
        class="
          relative p-6 rounded-2xl border-2 transition-all duration-300 font-semibold text-lg
          ${isSelected
            ? 'bg-lime-500/90 border-lime-400 shadow-xl text-white scale-105 ring-4 ring-lime-400/40 drop-shadow-lg'
            : 'bg-gray-700/80 border-gray-500 text-gray-200 hover:border-lime-400 hover:bg-gray-600/80'
          }
          focus:outline-none focus:ring-2 focus:ring-lime-400/60
        "
        data-size="${size}"
        style="min-width: 110px; min-height: 110px;"
      >
        <div class="text-4xl font-extrabold mb-1">${size}</div>
        <div class="text-base font-medium mb-1 tracking-wide">${t('Players')}</div>
        <div class="text-xs opacity-80">${rounds} ${t('rounds')}</div>
        ${isSelected ? '<div class="absolute top-2 right-2 text-2xl animate-pulse">✓</div>' : ''}
      </button>
    `;
  }

  private getRoundsForSize(size: TournamentSize): number {
    switch (size) {
      case 4: return 2;
    }
    return 2;
  }

  // ==================== EVENT LISTENERS ====================

  private attachEventListeners(): void {
    if (!this.container) return;

    // Close button
    const closeBtn = this.container.querySelector('[data-action="close"]');
    closeBtn?.addEventListener('click', () => this.handleClose());

    // Cancel button
    const cancelBtn = this.container.querySelector('[data-action="cancel"]');
    cancelBtn?.addEventListener('click', () => this.handleClose());

    // Create button
    const createBtn = this.container.querySelector('[data-action="create"]');
    createBtn?.addEventListener('click', () => this.handleCreate());

    // Size buttons
    const sizeButtons = this.container.querySelectorAll('[data-size]');
    sizeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const size = parseInt(target.dataset.size!) as TournamentSize;
        this.handleSizeChange(size);
      });
    });

    // Close on overlay click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.handleClose();
      }
    });
  }

  private async handleClose(): Promise<void> {
    const confirmed = await showConfirmDialog(
      t('Return to main menu?'),
      t('Leave Tournament Creation'),
      t('Yes, Leave'),
      t('Stay Here')
    );
    if (confirmed) {
      this.hide();
      // Dispatch event to return to menu
      window.dispatchEvent(new CustomEvent('ft:pong:returnToMenu', {
        detail: { reason: 'tournament-modal-closed' }
      }));
    }
  }

  private handleSizeChange(size: TournamentSize): void {
    this.selectedSize = size;

    // Refresh to update UI
    this.refresh();
  }

  private async handleCreate(): Promise<void> {
    if (this.isCreating) return;

    this.isCreating = true;
    this.showLoading(true);
    this.showError('');

    try {
      const tournament = await newTournamentService.createTournament({
        size: this.selectedSize,
        autoStartMinutes: 0  // No auto-start
      });

      // Hide creation modal
      this.hide();

      // Show lobby with share options
      this.showTournamentLobby(tournament);

    } catch (error: any) {

      this.showError(t(error.message) || t('Failed to create tournament'));
    } finally {
      this.isCreating = false;
      this.showLoading(false);
    }
  }

  // ==================== UI STATE ====================

  private showLoading(show: boolean): void {
    const loadingState = this.container?.querySelector('#loadingState') as HTMLElement;
    const createBtn = this.container?.querySelector('#createBtn') as HTMLButtonElement;

    if (loadingState) {
      if (show) {
        loadingState.classList.remove('hidden');
        loadingState.classList.add('block');
      } else {
        loadingState.classList.add('hidden');
        loadingState.classList.remove('block');
      }
    }

    if (createBtn) {
      createBtn.disabled = show;
      if (show) {
        createBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        createBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  private showError(message: string): void {
    const errorState = this.container?.querySelector('#errorState') as HTMLElement;
    const errorMessage = this.container?.querySelector('#errorMessage') as HTMLElement;

    if (errorState && errorMessage) {
      if (message) {
        errorMessage.textContent = message;
        errorState.classList.remove('hidden');
        errorState.classList.add('block');
      } else {
        errorState.classList.add('hidden');
        errorState.classList.remove('block');
      }
    }
  }

  private showTournamentLobby(tournament: TournamentData): void {
    // This will be handled by the main app
    // Dispatch custom event for main app to handle
    window.dispatchEvent(new CustomEvent('tournament-created', {
      detail: { tournament }
    }));
  }

  // ==================== CLEANUP ====================

  public destroy(): void {
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
    }

    if (this.boundHandleThemeChange) {
      window.removeEventListener('theme-changed', this.boundHandleThemeChange);
      window.removeEventListener('background-theme-changed', this.boundHandleThemeChange);
    }

    this.hide();

  }
}

// Export singleton
export const tournamentCreationModal = new TournamentCreationModal();

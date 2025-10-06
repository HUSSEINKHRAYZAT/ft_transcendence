/**
 * Tournament Creation Modal
 * 
 * Allows users to create tournaments with:
 * - Size selection (4, 8, or 16 players)
 * - Auto-start timer (optional)
 * - Share via link or QR code
 */

import { newTournamentService, TournamentSize, TournamentData } from '../../tournament/NewTournamentService';
import { showConfirmDialog } from '../modals/ConfirmDialog';

export class TournamentCreationModal {
  private container: HTMLElement | null = null;
  private selectedSize: TournamentSize = 8;
  private isCreating: boolean = false;

  // ==================== CREATION ====================

  /**
   * Show the tournament creation modal
   */
  public show(): void {
    if (this.container) {
      return; // Already showing
    }

    this.container = document.createElement('div');
    this.container.className = 'tournament-modal-overlay';
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

  // ==================== HTML GENERATION ====================

  private getModalHTML(): string {
    return `
      <div class="tournament-modal">
        <div class="tournament-modal-header">
          <h2>🏆 Create Tournament</h2>
          <button class="close-btn" data-action="close">×</button>
        </div>

        <div class="tournament-modal-body">
          <!-- Size Selection -->
          <div class="form-section">
            <label class="form-label">Tournament Size</label>
            <div class="size-selector">
              ${this.getSizeButtonHTML(4)}
              ${this.getSizeButtonHTML(8)}
              ${this.getSizeButtonHTML(16)}
            </div>
            <p class="form-hint">Choose the number of players for your tournament</p>
          </div>

          <!-- Game Settings -->
          <div class="form-section">
            <label class="form-label">Game Settings</label>
            <div class="settings-info">
              <div class="setting-item">
                <span class="setting-icon">⚽</span>
                <span class="setting-text">First to 5 goals wins</span>
              </div>
              <div class="setting-item">
                <span class="setting-icon">🏁</span>
                <span class="setting-text">Single elimination bracket</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="modal-actions">
            <button class="btn btn-secondary" data-action="cancel">
              Cancel
            </button>
            <button class="btn btn-primary" data-action="create" id="createBtn">
              <span class="btn-icon">🎮</span>
              Create Tournament
            </button>
          </div>

          <!-- Loading State -->
          <div class="loading-state" id="loadingState" style="display: none;">
            <div class="spinner"></div>
            <p>Creating tournament...</p>
          </div>

          <!-- Error State -->
          <div class="error-state" id="errorState" style="display: none;">
            <p class="error-message" id="errorMessage"></p>
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
        class="size-btn ${isSelected ? 'selected' : ''}" 
        data-size="${size}"
      >
        <div class="size-number">${size}</div>
        <div class="size-label">Players</div>
        <div class="size-rounds">${rounds} rounds</div>
      </button>
    `;
  }

  private getRoundsForSize(size: TournamentSize): number {
    switch (size) {
      case 4: return 2;
      case 8: return 3;
      case 16: return 4;
    }
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
    const sizeButtons = this.container.querySelectorAll('.size-btn');
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
      'Return to main menu?',
      'Leave Tournament Creation',
      'Yes, Leave',
      'Stay Here'
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
    
    // Update UI
    const sizeButtons = this.container?.querySelectorAll('.size-btn');
    sizeButtons?.forEach(btn => {
      const btnSize = parseInt((btn as HTMLElement).dataset.size!);
      if (btnSize === size) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
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

      console.log('✅ Tournament created:', tournament);
      
      // Hide creation modal
      this.hide();
      
      // Show lobby with share options
      this.showTournamentLobby(tournament);

    } catch (error: any) {
      console.error('❌ Failed to create tournament:', error);
      this.showError(error.message || 'Failed to create tournament');
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
      loadingState.style.display = show ? 'flex' : 'none';
    }
    
    if (createBtn) {
      createBtn.disabled = show;
    }
  }

  private showError(message: string): void {
    const errorState = this.container?.querySelector('#errorState') as HTMLElement;
    const errorMessage = this.container?.querySelector('#errorMessage') as HTMLElement;
    
    if (errorState && errorMessage) {
      if (message) {
        errorMessage.textContent = message;
        errorState.style.display = 'block';
      } else {
        errorState.style.display = 'none';
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
}

// Export singleton
export const tournamentCreationModal = new TournamentCreationModal();

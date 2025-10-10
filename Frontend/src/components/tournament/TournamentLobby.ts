/**
 * Tournament Lobby Component
 * 
 * Shows:
 * - Tournament code and share options
 * - Real-time player list with avatars
 * - Empty slots visualization
 * - Countdown timer
 * - Ready status
 * - Start button (for host)
 */

import { newTournamentService, TournamentData, TournamentPlayer } from '../../tournament/NewTournamentService';
import { authService } from '../../services/AuthService';
import { showConfirmDialog } from '../modals/ConfirmDialog';

export class TournamentLobby {
  private container: HTMLElement | null = null;
  private tournament: TournamentData | null = null;
  private countdownInterval: number | null = null;
  private isHost: boolean = false;

  // ==================== CREATION ====================

  /**
   * Show tournament lobby
   */
  public show(tournament: TournamentData): void {
    this.tournament = tournament;
    this.isHost = this.checkIfHost();

    if (this.container) {
      this.update();
      return;
    }

    this.container = document.createElement('div');
    this.container.className = 'tournament-lobby-overlay';
    this.container.innerHTML = this.getLobbyHTML();
    document.body.appendChild(this.container);

    this.attachEventListeners();
    this.startCountdownTimer();
    this.setupRealtimeUpdates();
  }

  /**
   * Hide the lobby
   */
  public hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    this.removeRealtimeUpdates();
  }

  /**
   * Update lobby with new tournament data
   */
  public update(): void {
    if (!this.container || !this.tournament) return;

    // Update player count
    const playerCountElement = this.container.querySelector('#playerCount');
    if (playerCountElement) {
      playerCountElement.textContent = `${this.tournament.players.length} / ${this.tournament.size}`;
      console.log('✅ Player count updated:', this.tournament.players.length, '/', this.tournament.size);
    }

    // Update player list
    const playerGrid = this.container.querySelector('#playerGrid');
    if (playerGrid) {
      playerGrid.innerHTML = this.getPlayerGridHTML();
    }

    // Update status
    const statusBadge = this.container.querySelector('#statusBadge');
    if (statusBadge) {
      statusBadge.innerHTML = this.getStatusBadgeHTML();
    }

    // Update countdown
    this.updateCountdown();

    // Update start button
    this.updateStartButton();
  }

  // ==================== HTML GENERATION ====================

  private getLobbyHTML(): string {
    return `
      <div class="tournament-lobby">
        <!-- Header -->
        <div class="lobby-header">
          <div class="lobby-title">
            <h2>🏆 Tournament Lobby</h2>
            <div id="statusBadge">${this.getStatusBadgeHTML()}</div>
          </div>
          <button class="close-btn" data-action="close">×</button>
        </div>

        <!-- Tournament Info -->
        <div class="lobby-info">
          <div class="info-card">
            <div class="info-label">Tournament Code</div>
            <div class="code-display">
              <span class="code-value">${this.tournament?.code}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="info-label">Players</div>
            <div class="info-value" id="playerCount">
              ${this.tournament?.players.length} / ${this.tournament?.size}
            </div>
          </div>

          <div class="info-card">
            <div class="info-label">Max Goals</div>
            <div class="info-value">
              ⚽ ${this.tournament?.maxGoals}
            </div>
          </div>
        </div>

        <!-- Player Grid -->
        <div class="players-section">
          <h3>Players</h3>
          <div class="player-grid" id="playerGrid">
            ${this.getPlayerGridHTML()}
          </div>
        </div>

        <!-- Actions -->
        <div class="lobby-actions">
          ${this.getActionButtonsHTML()}
        </div>
      </div>
    `;
  }

  private getStatusBadgeHTML(): string {
    if (!this.tournament) return '';

    const status = this.tournament.status;
    const isFull = this.tournament.players.length === this.tournament.size;

    let badgeClass = 'status-badge';
    let badgeText = '';
    let badgeIcon = '';

    if (status === 'completed') {
      badgeClass += ' status-completed';
      badgeIcon = '🏆';
      badgeText = 'Completed';
    } else if (status === 'active') {
      badgeClass += ' status-active';
      badgeIcon = '🎮';
      badgeText = 'In Progress';
    } else if (isFull) {
      badgeClass += ' status-ready';
      badgeIcon = '✅';
      badgeText = 'Ready to Start';
    } else {
      badgeClass += ' status-waiting';
      badgeIcon = '⏳';
      badgeText = 'Waiting for Players';
    }

    return `
      <span class="${badgeClass}">
        ${badgeIcon} ${badgeText}
      </span>
    `;
  }

  private getPlayerGridHTML(): string {
    if (!this.tournament) return '';

    const slots = [];
    const totalSlots = this.tournament.size;
    const players = this.tournament.players;

    // Add player slots
    for (let i = 0; i < totalSlots; i++) {
      const player = players[i];
      if (player) {
        slots.push(this.getPlayerSlotHTML(player, i + 1));
      } else {
        slots.push(this.getEmptySlotHTML(i + 1));
      }
    }

    return slots.join('');
  }

  private getPlayerSlotHTML(player: TournamentPlayer, slotNumber: number): string {
    const isOnline = player.isOnline ? 'online' : 'offline';
    const avatar = player.avatar || this.getDefaultAvatar();

    return `
      <div class="player-slot filled ${isOnline}">
        <div class="slot-number">#${slotNumber}</div>
        <div class="player-avatar">
          <img src="${avatar}" alt="${player.name}" />
          <span class="online-indicator"></span>
        </div>
        <div class="player-info">
          <div class="player-name">${this.escapeHTML(player.name)}</div>
          <div class="player-status">${isOnline === 'online' ? '🟢 Online' : '🔴 Offline'}</div>
        </div>
      </div>
    `;
  }

  private getEmptySlotHTML(slotNumber: number): string {
    return `
      <div class="player-slot empty">
        <div class="slot-number">#${slotNumber}</div>
        <div class="empty-icon">👤</div>
        <div class="empty-text">Waiting...</div>
      </div>
    `;
  }

  private getActionButtonsHTML(): string {
    if (!this.tournament) return '';

    const isFull = this.tournament.players.length === this.tournament.size;
    const canStart = this.isHost && isFull && this.tournament.status === 'waiting';

    return `
      <button class="btn btn-secondary" data-action="leave">
        Leave Tournament
      </button>
      
      ${canStart ? `
        <button class="btn btn-primary btn-start" data-action="start" id="startBtn">
          <span class="btn-icon">🚀</span>
          Start Tournament Now
        </button>
      ` : ''}
    `;
  }

  // ==================== EVENT HANDLERS ====================

  private attachEventListeners(): void {
    if (!this.container) return;

    // Close button
    this.container.querySelector('[data-action="close"]')
      ?.addEventListener('click', () => this.handleLeave());

    // Leave button
    this.container.querySelector('[data-action="leave"]')
      ?.addEventListener('click', () => this.handleLeave());

    // Start button
    this.container.querySelector('[data-action="start"]')
      ?.addEventListener('click', () => this.handleStart());
  }

  private async handleStart(): Promise<void> {
    if (!this.tournament) return;

    try {
      console.log('🚀 Starting tournament manually...');
      await newTournamentService.startTournament(this.tournament.id);
    } catch (error) {
      console.error('❌ Failed to start tournament:', error);
      alert('Failed to start tournament. Please try again.');
    }
  }

  private async handleLeave(): Promise<void> {
    const confirmed = await showConfirmDialog(
      'Are you sure you want to leave this tournament?',
      'Leave Tournament',
      'Yes, Leave',
      'Stay'
    );
    if (confirmed) {
      newTournamentService.leaveTournament();
      this.hide();
      
      // Return to main menu
      window.dispatchEvent(new CustomEvent('ft:pong:returnToMenu', {
        detail: { reason: 'tournament-lobby-left' }
      }));
    }
  }

  // ==================== REAL-TIME UPDATES ====================

  private setupRealtimeUpdates(): void {
    newTournamentService.on('tournament_updated', this.handleTournamentUpdate);
    newTournamentService.on('player_joined', this.handlePlayerJoined);
    newTournamentService.on('tournament_started', this.handleTournamentStarted);
  }

  private removeRealtimeUpdates(): void {
    newTournamentService.off('tournament_updated', this.handleTournamentUpdate);
    newTournamentService.off('player_joined', this.handlePlayerJoined);
    newTournamentService.off('tournament_started', this.handleTournamentStarted);
  }

  private handleTournamentUpdate = (data: any): void => {
    console.log('🔄 TournamentLobby received tournament_updated:', data);
    if (data.tournament && this.tournament && data.tournament.id === this.tournament.id) {
      console.log('🔄 Updating tournament from', this.tournament.players.length, 'to', data.tournament.players.length, 'players');
      this.tournament = data.tournament;
      this.update();
    } else {
      console.warn('⚠️ Tournament update ignored - ID mismatch or missing data');
    }
  };

  private handlePlayerJoined = (data: any): void => {
    if (data.tournament && this.tournament && data.tournament.id === this.tournament.id) {
      this.tournament = data.tournament;
      this.update();
      
      // Show notification
      if (data.player) {
        this.showNotification(`${data.player.name} joined the tournament!`);
      }
    }
  };

  private handleTournamentStarted = (data: any): void => {
    if (data.tournamentId === this.tournament?.id) {
      this.showNotification('Tournament is starting!', 'success');
      
      // Hide lobby and show bracket
      setTimeout(() => {
        this.hide();
        window.dispatchEvent(new CustomEvent('tournament-started', {
          detail: { tournament: this.tournament }
        }));
      }, 2000);
    }
  };

  // ==================== COUNTDOWN TIMER ====================

  private startCountdownTimer(): void {
    // Timer functionality removed
  }

  private updateCountdown(): void {
    // Timer functionality removed
  }

  // ==================== UTILITIES ====================

  private checkIfHost(): boolean {
    const user = authService.getUser();
    if (!user || !this.tournament) return false;

    const userId = user.id || user.email;
    return this.tournament.createdBy === userId;
  }

  private updateStartButton(): void {
    if (!this.isHost) return;

    const startBtn = this.container?.querySelector('#startBtn') as HTMLButtonElement;
    if (!startBtn) {
      // Need to add start button
      const actions = this.container?.querySelector('.lobby-actions');
      if (actions) {
        actions.innerHTML = this.getActionButtonsHTML();
        this.attachEventListeners();
      }
    }
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    // Simple notification - could be enhanced with a proper toast system
    const notification = document.createElement('div');
    notification.className = `tournament-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  private getDefaultAvatar(): string {
    return '/avatars/panda.png'; // Default avatar
  }

  private escapeHTML(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Export singleton
export const tournamentLobby = new TournamentLobby();

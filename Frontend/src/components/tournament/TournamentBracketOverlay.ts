/**
 * Tournament Bracket Overlay Component
 *
 * Automatically displays tournament bracket after each game ends
 * Shows current tournament state, player progression, and next match info
 */

import { TournamentBracket } from '../../tournament/TournamentBracket';

export interface TournamentResultSummary {
  tournamentId: string;
  matchId: string;
  winnerIdx: number;
  scores: number[];
  players?: Array<{ id?: string; name?: string; side?: string }>;
  isWinner: boolean;
}

export class TournamentBracketOverlay {
  private overlay: HTMLElement | null = null;
  private bracketComponent: TournamentBracket | null = null;
  private autoHideTimer: number | null = null;

  /**
   * Show tournament bracket overlay with match result
   */
  public async show(summary: TournamentResultSummary, tournament?: any): Promise<void> {
    console.log('🏆 Showing tournament bracket overlay:', summary);

    // Clean up any existing overlay
    this.hide();

    // Create overlay
    this.createOverlay(summary);

    // Load tournament data if not provided
    if (!tournament) {
      tournament = await this.loadTournamentData(summary.tournamentId);
    }

    // Render the bracket
    if (tournament) {
      this.renderBracket(tournament, summary);
    }

    // Set up auto-hide after 10 seconds (unless user interacts)
    this.setupAutoHide();
  }

  /**
   * Hide the bracket overlay
   */
  public hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    if (this.bracketComponent) {
      this.bracketComponent = null;
    }

    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  /**
   * Update bracket with new tournament data
   */
  public async updateBracket(tournamentId: string): Promise<void> {
    if (!this.overlay) return;

    try {
      const tournament = await this.loadTournamentData(tournamentId);
      if (tournament && this.bracketComponent) {
        this.bracketComponent.updateData(tournament);
      }
    } catch (error) {
      console.error('❌ Failed to update bracket:', error);
    }
  }

  private createOverlay(summary: TournamentResultSummary): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tournament-bracket-overlay';
    this.overlay.innerHTML = this.getOverlayHTML(summary);
    document.body.appendChild(this.overlay);

    // Add event listeners
    this.attachEventListeners();
  }

  private getOverlayHTML(summary: TournamentResultSummary): string {
    const resultText = summary.isWinner ? 'Victory!' : 'Eliminated';
    const resultIcon = summary.isWinner ? '🏆' : '⚰️';
    const resultClass = summary.isWinner ? 'winner' : 'loser';
    const [score1, score2] = summary.scores || [0, 0];

    return `
      <style>
        .tournament-bracket-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.5s ease-out;
        }

        .bracket-header {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          padding: 20px;
          border-bottom: 2px solid #84cc16;
          text-align: center;
        }

        .match-result {
          margin-bottom: 16px;
        }

        .result-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }

        .result-text {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .result-text.winner {
          color: #84cc16;
        }

        .result-text.loser {
          color: #ef4444;
        }

        .match-score {
          font-size: 20px;
          color: #94a3b8;
          font-weight: 600;
        }

        .bracket-title {
          font-size: 24px;
          font-weight: bold;
          color: white;
          margin: 8px 0;
        }

        .bracket-subtitle {
          font-size: 14px;
          color: #94a3b8;
        }

        .bracket-container {
          flex: 1;
          padding: 20px;
          overflow: auto;
          position: relative;
        }

        .bracket-content {
          max-width: 1400px;
          margin: 0 auto;
          min-height: 400px;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 12px;
          padding: 24px;
          border: 1px solid rgba(132, 204, 22, 0.3);
        }

        .bracket-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #94a3b8;
          font-size: 18px;
        }

        .bracket-actions {
          padding: 20px;
          background: rgba(15, 23, 42, 0.9);
          border-top: 1px solid rgba(132, 204, 22, 0.3);
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #65a30d, #4d7c0f);
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .auto-hide-countdown {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.7);
          color: #94a3b8;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .bracket-header {
            padding: 16px;
          }

          .result-icon {
            font-size: 36px;
          }

          .result-text {
            font-size: 20px;
          }

          .match-score {
            font-size: 16px;
          }

          .bracket-title {
            font-size: 20px;
          }

          .bracket-container {
            padding: 12px;
          }

          .bracket-content {
            padding: 16px;
          }

          .bracket-actions {
            flex-direction: column;
            padding: 16px;
          }
        }
      </style>

      <div class="bracket-header">
        <div class="match-result">
          <div class="result-icon">${resultIcon}</div>
          <div class="result-text ${resultClass}">${resultText}</div>
          <div class="match-score">${score1} - ${score2}</div>
        </div>
        <div class="bracket-title">Tournament Bracket</div>
        <div class="bracket-subtitle">Current tournament standings and progression</div>
      </div>

      <div class="bracket-container">
        <div class="auto-hide-countdown" id="autoHideCountdown">
          Auto-continue in <span id="countdownTimer">10</span>s
        </div>
        <div class="bracket-content" id="bracketContent">
          <div class="bracket-loading">
            <div style="margin-right: 12px;">⏳</div>
            Loading tournament bracket...
          </div>
        </div>
      </div>

      <div class="bracket-actions">
        <button class="btn btn-secondary" data-action="continue">
          Continue Tournament
        </button>
        <button class="btn btn-primary" data-action="view-full">
          View Full Bracket
        </button>
        <button class="btn btn-secondary" data-action="close">
          Close
        </button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.overlay) return;

    // Action buttons
    this.overlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;

      switch (action) {
        case 'continue':
          this.handleContinue();
          break;
        case 'view-full':
          this.handleViewFull();
          break;
        case 'close':
          this.hide();
          break;
      }
    });

    // Pause auto-hide on mouse enter
    this.overlay.addEventListener('mouseenter', () => {
      this.pauseAutoHide();
    });

    // Resume auto-hide on mouse leave
    this.overlay.addEventListener('mouseleave', () => {
      this.resumeAutoHide();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.overlay) return;

    switch (e.key) {
      case 'Escape':
        this.hide();
        break;
      case 'Enter':
      case ' ':
        this.handleContinue();
        break;
    }
  };

  private async renderBracket(tournament: any, summary: TournamentResultSummary): Promise<void> {
    const bracketContent = this.overlay?.querySelector('#bracketContent');
    if (!bracketContent) return;

    try {
      // Clear loading state
      bracketContent.innerHTML = '';

      // Import and create tournament bracket
      const { TournamentBracket } = await import('../../tournament/TournamentBracket');
      this.bracketComponent = new TournamentBracket(bracketContent as HTMLElement, tournament);

      // Highlight the completed match
      this.highlightCompletedMatch(summary);

    } catch (error) {
      console.error('❌ Failed to render tournament bracket:', error);
      bracketContent.innerHTML = `
        <div style="text-align: center; color: #ef4444; padding: 40px;">
          <div style="font-size: 24px; margin-bottom: 12px;">❌</div>
          <div>Failed to load tournament bracket</div>
        </div>
      `;
    }
  }

  private highlightCompletedMatch(summary: TournamentResultSummary): void {
    // Add a slight delay to ensure the bracket is rendered
    setTimeout(() => {
      const matchCard = this.overlay?.querySelector(`[data-match-id="${summary.matchId}"]`);
      if (matchCard) {
        matchCard.classList.add('just-completed');

        // Add temporary highlighting style
        const style = document.createElement('style');
        style.textContent = `
          .just-completed {
            animation: highlight 3s ease-in-out;
            border: 2px solid #84cc16 !important;
            box-shadow: 0 0 20px rgba(132, 204, 22, 0.5) !important;
          }
          @keyframes highlight {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `;
        document.head.appendChild(style);

        // Remove highlighting after animation
        setTimeout(() => {
          matchCard.classList.remove('just-completed');
          style.remove();
        }, 3000);
      }
    }, 500);
  }

  private async loadTournamentData(tournamentId: string): Promise<any> {
    try {
      const { tournamentService } = await import('../../tournament/TournamentService');
      return await tournamentService.getTournament(tournamentId);
    } catch (error) {
      console.error('❌ Failed to load tournament data:', error);
      return null;
    }
  }

  private setupAutoHide(): void {
    let countdown = 10;
    const updateCountdown = () => {
      const timer = this.overlay?.querySelector('#countdownTimer');
      if (timer) {
        timer.textContent = countdown.toString();
      }
      countdown--;

      if (countdown < 0) {
        this.handleContinue();
      } else {
        this.autoHideTimer = window.setTimeout(updateCountdown, 1000);
      }
    };

    this.autoHideTimer = window.setTimeout(updateCountdown, 1000);
  }

  private pauseAutoHide(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    const countdown = this.overlay?.querySelector('#autoHideCountdown');
    if (countdown) {
      countdown.textContent = 'Paused - move mouse away to resume';
    }
  }

  private resumeAutoHide(): void {
    this.setupAutoHide();
  }

  private handleContinue(): void {
    this.hide();

    // Dispatch event to continue tournament progression
    window.dispatchEvent(new CustomEvent('ft:tournament:continueFromBracket', {
      detail: { action: 'continue' }
    }));
  }

  private handleViewFull(): void {
    this.hide();

    // Dispatch event to show full tournament view
    window.dispatchEvent(new CustomEvent('ft:tournament:showFullBracket', {
      detail: { action: 'view_full' }
    }));
  }

  // Clean up event listeners
  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.hide();
  }
}

// Export singleton instance
export const tournamentBracketOverlay = new TournamentBracketOverlay();
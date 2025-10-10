import { TournamentService, CreateTournamentRequest, TournamentListItem } from './TournamentService';
import { TournamentBracket, TournamentBracketData, TournamentMatch, TournamentPlayer } from './TournamentBracket';
import { tournamentService } from './TournamentService';
import { TournamentMatchService } from './TournamentMatchService';

interface TournamentResultSummary {
  tournamentId: string;
  matchId: string;
  winnerIdx: number;
  scores: number[];
  players?: Array<{ id?: string; name?: string; side?: string }>;
  isWinner: boolean;
}

type TournamentSummarySource = 'event-auto' | 'event-action' | 'storage';

export interface TournamentHubConfig {
  container: HTMLElement;
  onStartGame?: (gameConfig: any) => void;
  onClose?: () => void;
}

export class TournamentUI {
  private container: HTMLElement;
  private onStartGame?: (gameConfig: any) => void;
  private onClose?: () => void;
  private currentView: 'hub' | 'create' | 'bracket' | 'join' = 'hub';
  private currentTournament?: TournamentBracketData;
  private bracketComponent?: TournamentBracket;
  private refreshInterval?: number;
  private matchService: TournamentMatchService;
  private clickHandler?: (e: Event) => void;
  private lastProcessedMatchId?: string;
  private handleMatchFinished = async (event: Event) => {
    const detail = (event as CustomEvent<{ summary?: TournamentResultSummary; source?: 'auto' | 'action' }>).detail;
    if (!detail?.summary) {
      return;
    }

    const origin: TournamentSummarySource = detail.source === 'action' ? 'event-action' : 'event-auto';
    await this.processTournamentMatchSummary(detail.summary, origin);
  };

  constructor(config: TournamentHubConfig) {
    console.log('🏆 TournamentUI constructor called', config);
    this.container = config.container;
    this.onStartGame = config.onStartGame;
    this.onClose = config.onClose;
    this.matchService = TournamentMatchService.getInstance();

    this.setupEventListeners();
    this.attachEventHandlers();
    
    // Check if returning from a completed match
    this.checkForCompletedMatch();
    
    this.render();
    this.startAutoRefresh();
    console.log('🏆 TournamentUI initialization complete');
  }

  private async checkForCompletedMatch() {
    const matchDataStr = sessionStorage.getItem('ft_pong_tournament_match_ended');
    if (!matchDataStr) return;

    sessionStorage.removeItem('ft_pong_tournament_match_ended');

    try {
      const summary = JSON.parse(matchDataStr) as TournamentResultSummary;
      await this.processTournamentMatchSummary(summary, 'storage');
    } catch (error) {
      console.error('🏆 Failed to process completed match from storage:', error);
    }
  }

  private async processTournamentMatchSummary(summary: TournamentResultSummary, source: TournamentSummarySource) {
    if (!summary?.tournamentId || !summary.matchId) {
      return;
    }

    if (this.lastProcessedMatchId === summary.matchId && source !== 'storage') {
      return;
    }

    this.lastProcessedMatchId = summary.matchId;

    const [scoreLeft = 0, scoreRight = 0] = summary.scores ?? [];

    if (source === 'storage' && summary.isWinner) {
      try {
        const winner = summary.players?.[summary.winnerIdx];
        if (winner?.id) {
          await tournamentService.completeMatch(
            summary.tournamentId,
            summary.matchId,
            winner.id,
            scoreLeft,
            scoreRight
          );
        }
      } catch (error) {
        console.warn('🏆 Fallback match completion failed:', error);
      }
    }

    try {
      const tournament = await tournamentService.getTournament(summary.tournamentId);
      this.currentTournament = tournament;
      this.currentView = 'bracket';
      this.render();

      this.showNotification(`Match completed! Score: ${scoreLeft}-${scoreRight}`);
    } catch (error) {
      console.error('🏆 Failed to refresh tournament after match completion:', error);
    }
  }

  private setupEventListeners() {
    // Listen for tournament events
    tournamentService.on('tournamentCreated', () => this.refreshTournamentList());
    tournamentService.on('playerJoined', () => this.refreshTournamentList());
    tournamentService.on('tournamentUpdated', (tournament: TournamentBracketData) => {
      // Refresh hub view when any tournament updates
      if (this.currentView === 'hub') {
        this.refreshTournamentList();
      }
      // Update current tournament if viewing it
      if (this.currentTournament?.tournamentId === tournament.tournamentId) {
        this.currentTournament = tournament;
        if (this.currentView === 'bracket') {
          this.refreshBracket();
        }
      }
    });
    tournamentService.on('tournamentStarted', (tournament: TournamentBracketData) => {
      if (this.currentTournament?.tournamentId === tournament.tournamentId) {
        this.currentTournament = tournament;
        this.refreshBracket();
      }
      this.refreshTournamentList();
    });
    tournamentService.on('matchStarted', (data: { tournament: TournamentBracketData; match: TournamentMatch }) => {
      if (this.currentTournament?.tournamentId === data.tournament.tournamentId) {
        this.currentTournament = data.tournament;
        this.refreshBracket();

        // Auto-start game for current player
        this.handleMatchStart(data.match);
      }
    });
    tournamentService.on('matchCompleted', () => {
      this.refreshBracket();
      this.refreshTournamentList();
    });
    tournamentService.on('tournamentsCleared', (data: any) => {
      console.log('🧹 Tournaments cleared event received:', data);
      if (data.all) {
        // All tournaments cleared, go back to hub
        this.currentTournament = undefined;
        this.currentView = 'hub';
      }
      this.refreshTournamentList();
    });

    // Auto-start games announced via TournamentService (guest side convenience)
    tournamentService.on('tournamentGameStart', (gameConfig: any) => {
      try {
        this.onStartGame?.(gameConfig);
      } catch (e) {
        console.error('Failed to start tournament game from event:', e);
      }
    });

    // Listen for custom events from bracket
    window.addEventListener('tournamentMatchStartRequest', (e: any) => {
      this.handleMatchStartRequest(e.detail.match);
    });

    // Listen for tournament bracket display requests
    window.addEventListener('showTournamentBracket', (e: any) => {
      this.handleShowTournamentBracket(e.detail);
    });

    // Listen for localStorage changes (cross-user tournament updates)
    // NOTE: storage events only fire in OTHER windows/tabs, not the one making the change
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === 'ft_pong_global_tournaments') {
        console.log('🏆 Global tournaments changed in ANOTHER window/user! Refreshing list...');
        this.refreshTournamentList();
      }
    });

    // Listen for custom storage update events (same-window updates)
    window.addEventListener('tournamentStorageUpdated', ((e: CustomEvent) => {
      console.log('🏆 Tournaments updated in THIS window! Refreshing list...', e.detail.count, 'tournaments');
      this.refreshTournamentList();
    }) as EventListener);

    window.addEventListener('ft:tournament:matchFinished', this.handleMatchFinished as EventListener);
  }

  private startAutoRefresh() {
    // Refresh tournament list every 3 seconds when in hub view (faster refresh)
    this.refreshInterval = window.setInterval(() => {
      if (this.currentView === 'hub') {
        this.refreshTournamentList();
      } else if (this.currentView === 'bracket' && this.currentTournament) {
        this.refreshBracket();
      }
    }, 3000); // Reduced from 5s to 3s for better responsiveness
  }

  public destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Cleanup match service
    this.matchService.cleanup();

    // Remove event listeners
    tournamentService.off('tournamentCreated', () => this.refreshTournamentList());
    tournamentService.off('playerJoined', () => this.refreshTournamentList());
    tournamentService.off('tournamentUpdated', () => {});
    tournamentService.off('tournamentStarted', () => this.refreshTournamentList());
    tournamentService.off('matchStarted', () => {});
    tournamentService.off('matchCompleted', () => {});

    window.removeEventListener('ft:tournament:matchFinished', this.handleMatchFinished as EventListener);
  }

  private render() {
    console.log('🏆 render() called, currentView:', this.currentView, 'currentTournament:', !!this.currentTournament);
    this.container.innerHTML = this.getCSS() + this.getHTML();

    if (this.currentView === 'hub') {
      this.refreshTournamentList();
    } else if (this.currentView === 'bracket' && this.currentTournament) {
      this.renderBracket();
    }
    
    // Re-attach form-specific handlers after render
    this.attachFormHandlers();
  }

  private getCSS(): string {
    return `
      <style>
        .tournament-hub {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          color: white;
          min-height: 100vh;
          padding: 20px;
          overflow-y: auto;
        }

        .tournament-header-new {
          background: linear-gradient(135deg, rgba(132, 204, 22, 0.1), rgba(132, 204, 22, 0.05));
          border: 1px solid rgba(132, 204, 22, 0.2);
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 30px;
          backdrop-filter: blur(10px);
        }

        .tournament-info-section {
          margin-bottom: 25px;
        }

        .tournament-title-new {
          font-size: 36px;
          font-weight: 900;
          background: linear-gradient(135deg, #84cc16, #65a30d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 15px 0;
          text-shadow: 0 2px 10px rgba(132, 204, 22, 0.3);
        }

        .tournament-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
        }

        .stat-item {
          background: rgba(132, 204, 22, 0.15);
          border: 1px solid rgba(132, 204, 22, 0.3);
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 600;
          color: #84cc16;
          font-size: 14px;
        }

        .progress-bar-new {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill-new {
          height: 100%;
          background: linear-gradient(90deg, #84cc16, #65a30d);
          transition: width 0.3s ease;
        }

        .tournament-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .creator-controls {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .btn-start-tournament {
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
        }

        .btn-start-tournament.enabled:hover {
          background: linear-gradient(135deg, #15803d, #166534);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(22, 163, 74, 0.5);
        }

        .btn-start-tournament.disabled {
          background: rgba(107, 114, 128, 0.5);
          cursor: not-allowed;
          opacity: 0.6;
          box-shadow: none;
        }

        .control-actions {
          display: flex;
          gap: 10px;
        }

        .general-actions {
          display: flex;
          gap: 10px;
        }

        .tournament-nav {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #65a30d, #4d7c0f);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(132, 204, 22, 0.3);
        }

        .btn-secondary {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .btn-secondary:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }

        .btn-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .btn-danger:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          transform: translateY(-2px);
        }

        .tournament-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .tournament-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .tournament-card:hover {
          transform: translateY(-4px);
          border-color: rgba(132, 204, 22, 0.5);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }

        .tournament-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .tournament-name {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #84cc16;
        }

        .tournament-status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-waiting {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .status-active {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-completed {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }

        .tournament-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .tournament-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 600;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 700;
          color: white;
        }

        .tournament-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .form-container {
          max-width: 600px;
          margin: 0 auto;
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 32px;
          backdrop-filter: blur(10px);
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: white;
          font-size: 16px;
          transition: border-color 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #84cc16;
          box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.1);
        }

        .form-select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: white;
          font-size: 16px;
        }

        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 0;
        }

        .form-checkbox input {
          width: 20px;
          height: 20px;
          accent-color: #84cc16;
        }

        .invite-section {
          margin-top: 30px;
          padding: 20px;
          background: rgba(132, 204, 22, 0.1);
          border: 1px solid rgba(132, 204, 22, 0.3);
          border-radius: 12px;
        }

        .invite-code {
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: 700;
          color: #84cc16;
          background: rgba(0,0,0,0.3);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          margin: 16px 0;
          letter-spacing: 2px;
        }

        .join-form {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .join-form input {
          flex: 1;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: center;
        }

        .bracket-container {
          background: rgba(255,255,255,0.02);
          border-radius: 16px;
          padding: 20px;
          margin-top: 20px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #94a3b8;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
          margin: 8px 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #84cc16, #65a30d);
          transition: width 0.3s ease;
        }

        @media (max-width: 768px) {
          .tournament-grid {
            grid-template-columns: 1fr;
          }

          .tournament-header {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .tournament-nav {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      </style>
    `;
  }

  private getHTML(): string {
    switch (this.currentView) {
      case 'create':
        return this.getCreateTournamentHTML();
      case 'join':
        return this.getJoinTournamentHTML();
      case 'bracket':
        return this.getBracketHTML();
      default:
        return this.getHubHTML();
    }
  }

  private getHubHTML(): string {
    return `
      <div class="tournament-hub">
        <div class="tournament-nav">
          <div>
            <h1 class="tournament-title">🏆 Tournament Hub</h1>
            <p style="margin: 8px 0 0 0; color: #94a3b8;">Discover, create, and join live tournaments</p>
          </div>
          <div class="tournament-nav">
            <button class="btn btn-primary" data-action="create">
              ➕ Create Tournament
            </button>
            <button class="btn btn-secondary" data-action="join">
              🔑 Join with Code
            </button>
            <button class="btn btn-secondary" data-action="refresh">
              🔄 Refresh
            </button>
            <button class="btn btn-secondary" data-action="clear-inactive">
              🗑️ Clear Inactive
            </button>
            <button class="btn btn-danger" data-action="close">
              ❌ Close
            </button>
          </div>
        </div>

        <div id="tournaments-grid" class="tournament-grid">
          <!-- Tournaments will be loaded here -->
        </div>
      </div>
    `;
  }

  private getCreateTournamentHTML(): string {
    return `
      <div class="tournament-hub">
        <div class="tournament-header">
          <h1 class="tournament-title">➕ Create Tournament</h1>
          <div class="tournament-nav">
            <button class="btn btn-secondary" data-action="back">
              ← Back to Hub
            </button>
          </div>
        </div>

        <div class="form-container">
          <form id="create-tournament-form">
            <div class="form-group">
              <label class="form-label" for="tournament-name">Tournament Name</label>
              <input
                type="text"
                id="tournament-name"
                class="form-input"
                placeholder="Enter tournament name..."
                required
                maxlength="50"
              >
            </div>

            <div class="form-group">
              <label class="form-label" for="tournament-size">Tournament Size</label>
              <select id="tournament-size" class="form-select" required>
                <option value="4">4 Players (2 rounds)</option>
                <option value="8" selected>8 Players (3 rounds)</option>
                <option value="16">16 Players (4 rounds)</option>
              </select>
            </div>

            <div class="form-group">
              <div class="form-checkbox">
                <input type="checkbox" id="is-public" checked>
                <label for="is-public">Public Tournament (visible to all players)</label>
              </div>
              <div class="form-checkbox">
                <input type="checkbox" id="allow-spectators" checked>
                <label for="allow-spectators">Allow Spectators</label>
              </div>
            </div>

            <div class="tournament-actions">
              <button type="submit" class="btn btn-primary">
                🏆 Create Tournament
              </button>
              <button type="button" class="btn btn-secondary" data-action="back">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private getJoinTournamentHTML(): string {
    return `
      <div class="tournament-hub">
        <div class="tournament-header">
          <h1 class="tournament-title">🔑 Join Tournament</h1>
          <div class="tournament-nav">
            <button class="btn btn-secondary" data-action="back">
              ← Back to Hub
            </button>
          </div>
        </div>

        <div class="form-container">
          <div class="form-group">
            <label class="form-label" for="invite-code">Tournament Invite Code</label>
            <div class="join-form">
              <input
                type="text"
                id="invite-code"
                class="form-input"
                placeholder="Enter 5-letter code..."
                maxlength="5"
                pattern="[A-Z]{5}"
                style="text-transform: uppercase; letter-spacing: 2px; text-align: center; font-family: 'Courier New', monospace;"
              >
              <button type="button" class="btn btn-primary" data-action="join-tournament">
                Join Tournament
              </button>
            </div>
            <p style="margin-top: 12px; color: #94a3b8; font-size: 14px;">
              Enter the 5-letter code provided by the tournament creator
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private getBracketHTML(): string {
    if (!this.currentTournament) {
      return this.getHubHTML();
    }

    const progress = TournamentService.getTournamentProgress(this.currentTournament);
    const currentUser = this.getCurrentUser();

    // Simplified creator check - try multiple comparisons to be safe
    const isCreator = currentUser ? (
      this.currentTournament.createdBy === currentUser.name ||
      this.currentTournament.createdBy === currentUser.id
    ) : true; // If no current user detected, allow manual control for testing

    const canStart = TournamentService.canStartTournament(this.currentTournament);
    const spotsRemaining = this.currentTournament.size - this.currentTournament.players.length;

    // Debug information
    console.log('🏆 Tournament Button Debug:', {
      currentUser: currentUser ? { id: currentUser.id, name: currentUser.name } : null,
      tournamentCreatedBy: this.currentTournament.createdBy,
      isCreator,
      canStart,
      tournamentStatus: this.currentTournament.status,
      playersCount: this.currentTournament.players.length,
      tournamentSize: this.currentTournament.size,
      spotsRemaining,
      buttonConditions: {
        'isCreator && status===waiting': isCreator && this.currentTournament.status === 'waiting',
        'canStart': canStart,
        'spotsRemaining > 0': spotsRemaining > 0
      }
    });

    return `
      <div class="tournament-hub">
        <!-- Clean Tournament Header -->
        <div class="tournament-header-new">
          <div class="tournament-info-section">
            <h1 class="tournament-title-new">${this.currentTournament.name}</h1>
            <div class="tournament-stats">
              <span class="stat-item">👥 ${this.currentTournament.players.length}/${this.currentTournament.size} Players</span>
              <span class="stat-item">📊 ${this.currentTournament.status}</span>
              <span class="stat-item">⚡ ${progress.toFixed(0)}% Complete</span>
            </div>
            <div class="progress-bar-new">
              <div class="progress-fill-new" style="width: ${progress}%"></div>
            </div>
          </div>

          <!-- Control Panel -->
          <div class="tournament-controls">
            ${isCreator && this.currentTournament.status === 'waiting' ? `
              <div class="creator-controls">
                <button class="btn-start-tournament ${canStart ? 'enabled' : 'disabled'}" data-action="start-tournament" ${!canStart ? 'disabled' : ''}>
                  🚀 START TOURNAMENT
                </button>
                <div class="control-actions">
                  <button class="btn btn-primary" data-action="invite-friends">
                    🎯 Invite Players
                  </button>
                </div>
              </div>
            ` : ''}

            <div class="general-actions">
              <button class="btn btn-secondary" data-action="refresh-bracket">
                🔄 Refresh
              </button>
              <button class="btn btn-secondary" data-action="back">
                ← Back to Hub
              </button>
            </div>
          </div>
        </div>

        ${this.currentTournament.status === 'waiting' ? `
          <div class="invite-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="margin: 0; color: #84cc16; font-size: 20px;">🏆 Tournament Lobby</h3>
                <p style="margin: 4px 0 0 0; color: #94a3b8;">
                  ${this.currentTournament.players.length}/${this.currentTournament.size} players joined
                  ${spotsRemaining > 0 ? `• ${spotsRemaining} spot${spotsRemaining > 1 ? 's' : ''} remaining` : ''}
                </p>
              </div>
              ${isCreator ? `
                <button class="btn btn-primary" data-action="invite-friends" style="font-size: 16px;">
                  🎯 Invite Friends
                </button>
              ` : ''}
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-bottom: 16px;">
              <div>
                <label style="display: block; margin-bottom: 8px; color: #e2e8f0; font-weight: 600; font-size: 14px;">
                  Tournament Invite Code
                </label>
                <div class="invite-code" style="margin: 0;">${this.currentTournament.tournamentId}</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-secondary" data-action="share-tournament" style="white-space: nowrap;">
                  🔗 Share
                </button>
              </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px;">
              <h4 style="margin: 0 0 12px 0; color: #e2e8f0; font-size: 16px;">Players in Lobby:</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
                ${this.currentTournament.players.map((player: TournamentPlayer) => `
                  <div style="
                    background: rgba(132, 204, 22, 0.2);
                    border: 1px solid rgba(132, 204, 22, 0.3);
                    padding: 12px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                  ">
                    <span style="font-size: 20px;">👤</span>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 600; color: white; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${player.name}
                      </div>
                      <div style="font-size: 12px; color: #94a3b8;">
                        ${player.isOnline ? '🟢 Online' : '⚫ Offline'}
                      </div>
                    </div>
                  </div>
                `).join('')}
                ${Array(spotsRemaining).fill(0).map(() => `
                  <div style="
                    background: rgba(107, 114, 128, 0.2);
                    border: 1px dashed rgba(107, 114, 128, 0.3);
                    padding: 12px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: #6b7280;
                  ">
                    <span style="font-size: 20px;">➕</span>
                    <span>Waiting...</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <p style="margin: 16px 0 0 0; color: #94a3b8; text-align: center; font-size: 14px;">
              Share the code above or invite friends directly to fill all ${this.currentTournament.size} slots
            </p>
          </div>
        ` : ''}

        <div class="bracket-container">
          <div id="tournament-bracket"></div>
        </div>
      </div>
    `;
  }

  private attachEventHandlers() {
    console.log('🏆 attachEventHandlers called - setting up global click handler');
    
    // Remove old handler if exists
    if (this.clickHandler) {
      this.container.removeEventListener('click', this.clickHandler);
    }
    
    // Create new handler
    this.clickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      console.log('🏆 Click detected:', action, target.tagName, target.className, target.textContent?.substring(0, 20));

      if (!action) return;

      switch (action) {
        case 'create':
          console.log('🏆 Navigating to create view');
          this.currentView = 'create';
          this.render();
          break;
        case 'join':
          console.log('🏆 Navigating to join view');
          this.currentView = 'join';
          this.render();
          break;
        case 'back':
          console.log('🏆 Navigating back to hub');
          this.currentView = 'hub';
          this.currentTournament = undefined;
          this.render();
          break;
        case 'close':
          console.log('🏆 Closing tournament UI');
          this.onClose?.();
          break;
        case 'refresh':
          console.log('🏆 Refreshing tournament list');
          this.refreshTournamentList();
          break;
        case 'clear-inactive':
          console.log('🏆 Clear inactive tournaments clicked');
          this.handleClearInactive();
          break;
        case 'start-tournament':
          console.log('🏆 START TOURNAMENT button clicked!');
          this.handleStartTournament();
          break;
        case 'join-tournament':
          console.log('🏆 JOIN TOURNAMENT button clicked!');
          this.handleJoinWithCode();
          break;
        case 'invite':
        case 'copy-invite':
          console.log('🏆 Copy invite code clicked');
          this.showInviteCode();
          break;
        case 'invite-friends':
          console.log('🏆 Invite friends clicked');
          this.handleInviteFriends();
          break;
        case 'share-tournament':
          console.log('🏆 Share tournament clicked');
          this.handleShareTournament();
          break;
        case 'refresh-bracket':
          if (this.currentTournament) {
            console.log('🏆 Refreshing current bracket');
            this.loadCurrentTournamentFromServer();
          }
          break;
        case 'view-tournament':
          const tournamentId = target.dataset.tournamentId;
          console.log('🏆 View tournament clicked:', tournamentId);
          if (tournamentId) {
            this.viewTournament(tournamentId);
          }
          break;
        case 'join-tournament-card':
          const joinTournamentId = target.dataset.tournamentId;
          console.log('🏆 Join tournament from card clicked:', joinTournamentId);
          if (joinTournamentId) {
            this.handleJoinTournamentFromCard(joinTournamentId);
          }
          break;
        case 'spectate-tournament':
          const spectateTournamentId = target.dataset.tournamentId;
          console.log('🏆 Spectate tournament clicked:', spectateTournamentId);
          if (spectateTournamentId) {
            this.handleSpectateTournament(spectateTournamentId);
          }
          break;
        default:
          console.log('🏆 Unknown action:', action);
      }
    };
    
    // Attach the new handler
    this.container.addEventListener('click', this.clickHandler);
    console.log('🏆 Global click handler attached successfully');
  }
  
  private attachFormHandlers() {
    console.log('🏆 attachFormHandlers called');
    
    // Handle form submission for creating tournament
    const createForm = this.container.querySelector('#create-tournament-form');
    if (createForm) {
      console.log('🏆 Found create tournament form, attaching submit handler');
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('🏆 Create tournament form submitted');
        this.handleCreateTournament();
      });
    }

    // Handle Enter key in join code input
    const inviteCodeInput = this.container.querySelector('#invite-code') as HTMLInputElement;
    if (inviteCodeInput) {
      console.log('🏆 Found invite code input, attaching enter key handler');
      inviteCodeInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          console.log('🏆 Enter key pressed in invite code input');
          this.handleJoinWithCode();
        }
      });
    }
  }

  private async refreshTournamentList() {
    if (this.currentView !== 'hub') return;

    try {
      await tournamentService.requestTournaments();
      const tournaments = await tournamentService.getTournaments();
      this.renderTournamentGrid(tournaments);
    } catch (error) {
      console.error('Failed to refresh tournaments:', error);
    }
  }

  private async loadCurrentTournamentFromServer() {
    if (!this.currentTournament) return;
    try {
      await tournamentService.requestTournaments();
      const updated = await tournamentService.getTournament(this.currentTournament.tournamentId);
      this.currentTournament = updated;
      if (this.currentView === 'bracket') {
        this.renderBracket();
      }
    } catch (error) {
      console.error('Failed to refresh tournament bracket:', error);
    }
  }

  private renderTournamentGrid(tournaments: TournamentListItem[]) {
    const grid = this.container.querySelector('#tournaments-grid');
    if (!grid) return;

    if (tournaments.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-title">No Tournaments Yet</div>
          <p>Create the first tournament or join one with an invite code!</p>
        </div>
      `;
      return;
    }

    const currentUser = this.getCurrentUser();

    grid.innerHTML = tournaments.map(tournament => {
      const canJoin = tournament.status === 'waiting' && 
                     tournament.currentPlayers < tournament.size && 
                     tournament.isPublic;
      
      const isCreator = currentUser && tournament.createdBy === currentUser.name;

      return `
        <div class="tournament-card">
          <div class="tournament-card-header">
            <div>
              <h3 class="tournament-name">${tournament.name}</h3>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                Created by ${tournament.createdBy}
              </p>
            </div>
            <div class="tournament-status status-${tournament.status}">
              ${tournament.status}
            </div>
          </div>

          <div class="tournament-info">
            <div class="tournament-stat">
              <span class="stat-label">Players</span>
              <span class="stat-value">${tournament.currentPlayers}/${tournament.size}</span>
            </div>
            <div class="tournament-stat">
              <span class="stat-label">Type</span>
              <span class="stat-value">${tournament.isPublic ? 'Public' : 'Private'}</span>
            </div>
            <div class="tournament-stat">
              <span class="stat-label">Spectators</span>
              <span class="stat-value">${tournament.allowSpectators ? 'Allowed' : 'No'}</span>
            </div>
            <div class="tournament-stat">
              <span class="stat-label">Created</span>
              <span class="stat-value">${new Date(tournament.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div class="tournament-actions">
            ${canJoin ? `
              <button class="btn btn-primary" data-action="join-tournament-card" data-tournament-id="${tournament.id}">
                ➕ Join Tournament
              </button>
            ` : ''}
            <button class="btn btn-secondary" data-action="view-tournament" data-tournament-id="${tournament.id}">
              👁️ View ${isCreator ? '& Manage' : 'Tournament'}
            </button>
            ${tournament.allowSpectators && tournament.status === 'active' ? `
              <button class="btn btn-secondary" data-action="spectate-tournament" data-tournament-id="${tournament.id}">
                🎬 Spectate
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  private async handleCreateTournament() {
    console.log('🏆 handleCreateTournament called');
    const form = this.container.querySelector('#create-tournament-form') as HTMLFormElement;
    if (!form) {
      console.error('🏆 Form not found!');
      return;
    }

    const nameInput = form.querySelector('#tournament-name') as HTMLInputElement;
    const sizeSelect = form.querySelector('#tournament-size') as HTMLSelectElement;
    const publicCheck = form.querySelector('#is-public') as HTMLInputElement;
    const spectatorsCheck = form.querySelector('#allow-spectators') as HTMLInputElement;

    console.log('🏆 Form elements:', {
      nameInput: !!nameInput,
      sizeSelect: !!sizeSelect,
      publicCheck: !!publicCheck,
      spectatorsCheck: !!spectatorsCheck
    });

    if (!nameInput || !sizeSelect || !publicCheck || !spectatorsCheck) {
      console.error('🏆 Missing form elements');
      this.showNotification('Form error - please try again');
      return;
    }

    const name = nameInput.value;
    const size = parseInt(sizeSelect.value) as 4 | 8 | 16;
    const isPublic = publicCheck.checked;
    const allowSpectators = spectatorsCheck.checked;

    console.log('🏆 Form values:', { name, size, isPublic, allowSpectators });

    if (!name.trim()) {
      console.warn('🏆 Empty tournament name');
      nameInput.focus();
      nameInput.style.borderColor = '#ef4444';
      return;
    }

    try {
      const request: CreateTournamentRequest = {
        name: name.trim(),
        size,
        isPublic,
        allowSpectators
      };

      console.log('🏆 Creating tournament with request:', request);
      const tournament = await tournamentService.createTournament(request);
      console.log('🏆 Tournament created successfully:', tournament);

      this.currentTournament = tournament;
      this.currentView = 'bracket';
      this.render();
    } catch (error) {
      console.error('🏆 Failed to create tournament:', error);
      // Auto-retry on failure
      setTimeout(() => {
        this.refreshTournamentList();
      }, 1000);
    }
  }

  private async handleJoinWithCode() {
    console.log('🏆 handleJoinWithCode called');

    const input = this.container.querySelector('#invite-code') as HTMLInputElement;
    if (!input) {
      console.error('🏆 Invite code input not found!');
      this.showErrorAndReturnToMenu('Error: Input field not found');
      return;
    }

    const code = input.value.trim().toUpperCase();
    console.log('🏆 Attempting to join with code:', code);

    if (!code) {
      console.warn('🏆 Empty tournament code');
      this.showNotification('Please enter a tournament code');
      input.focus();
      input.style.borderColor = '#ef4444';
      return;
    }

    if (code.length !== 6) {
      console.warn('🏆 Invalid tournament code length:', code.length);
      this.showErrorAndReturnToMenu('❌ Invalid tournament code. Code must be exactly 6 characters');
      input.style.borderColor = '#ef4444';
      return;
    }

    // Validate that code contains only alphanumeric characters
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      console.warn('🏆 Invalid tournament code format:', code);
      this.showErrorAndReturnToMenu('❌ Invalid tournament code format. Use only letters and numbers');
      input.style.borderColor = '#ef4444';
      return;
    }

    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.error('🏆 User not available');
        this.showErrorAndReturnToMenu('❌ Error: Please log in first');
        return;
      }

      console.log('🏆 Current user:', currentUser.name);
      console.log('🏆 Joining tournament with request:', {
        tournamentId: code,
        playerId: currentUser.id,
        playerName: currentUser.name
      });

      // Show joining notification
      this.showNotification('🔄 Joining tournament...');

      // Disable input while processing
      input.disabled = true;
      const joinButton = this.container.querySelector('[data-action="join-tournament"]') as HTMLButtonElement;
      if (joinButton) {
        joinButton.disabled = true;
        joinButton.textContent = 'Joining...';
      }

      const tournament = await tournamentService.joinTournament({
        tournamentId: code,
        playerId: currentUser.id,
        playerName: currentUser.name
      });

      console.log('🏆 Successfully joined tournament:', tournament);
      this.showNotification('✅ Joined tournament successfully!');
      this.currentTournament = tournament;
      this.currentView = 'bracket';
      this.render();
    } catch (error) {
      console.error('🏆 Failed to join tournament:', error);
      const errorMessage = (error as Error).message || 'Unknown error';

      // Re-enable input and button
      input.disabled = false;
      const joinButton = this.container.querySelector('[data-action="join-tournament"]') as HTMLButtonElement;
      if (joinButton) {
        joinButton.disabled = false;
        joinButton.textContent = 'Join Tournament';
      }

      input.style.borderColor = '#ef4444';

      // Determine error type and show appropriate message
      let displayMessage = '';
      let shouldReturnToMenu = false;

      if (errorMessage.toLowerCase().includes('timed out') ||
          errorMessage.toLowerCase().includes('timeout')) {
        displayMessage = `❌ Connection timeout. Tournament code '${code}' may not exist or server is unavailable`;
        shouldReturnToMenu = true;
      } else if (errorMessage.toLowerCase().includes('not found') ||
                 errorMessage.toLowerCase().includes('does not exist') ||
                 errorMessage.toLowerCase().includes('invalid')) {
        displayMessage = `❌ Tournament not found. Invalid code: '${code}'`;
        shouldReturnToMenu = true;
      } else if (errorMessage.toLowerCase().includes('full')) {
        displayMessage = '❌ Tournament is full. Cannot join';
        shouldReturnToMenu = true;
      } else if (errorMessage.toLowerCase().includes('already')) {
        displayMessage = '❌ You have already joined this tournament';
        shouldReturnToMenu = true;
      } else if (errorMessage.toLowerCase().includes('closed') ||
                 errorMessage.toLowerCase().includes('started')) {
        displayMessage = '❌ Tournament has already started or is closed';
        shouldReturnToMenu = true;
      } else {
        displayMessage = `❌ Failed to join tournament: ${errorMessage}`;
        shouldReturnToMenu = true;
      }

      if (shouldReturnToMenu) {
        this.showErrorAndReturnToMenu(displayMessage);
      } else {
        this.showNotification(displayMessage);
      }
    }
  }

  /**
   * Show error message and automatically return to main menu
   */
  private showErrorAndReturnToMenu(message: string, delayMs: number = 3000): void {
    console.log('🏠 Showing error and returning to main menu:', message);
    this.showNotification(message);

    setTimeout(() => {
      console.log('🏠 Returning to main menu after error');
      this.onClose?.();

      // Also dispatch a custom event to ensure proper cleanup
      window.dispatchEvent(new CustomEvent('ft:pong:returnToMenu', {
        detail: { reason: 'tournament-join-error', error: message }
      }));
    }, delayMs);
  }

  private async handleSpectateTournament(tournamentId: string) {
    try {
      // Join as spectator and view the tournament
      await tournamentService.joinAsSpectator(tournamentId);
      
      const tournament = await tournamentService.getTournament(tournamentId);
      this.currentTournament = tournament;
      this.currentView = 'bracket';
      this.render();
      
      this.showNotification('Joined as spectator');
    } catch (error) {
      console.error('🏆 Failed to spectate tournament:', error);
      this.showNotification('Failed to join as spectator');
    }
  }

  private async handleJoinTournamentFromCard(tournamentId: string) {
    console.log('🏆 handleJoinTournamentFromCard called with ID:', tournamentId);
    
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.warn('🏆 User not available');
        this.showNotification('User not available - please try again');
        return;
      }

      console.log('🏆 Current user:', currentUser);
      console.log('🏆 Attempting to join tournament:', tournamentId);
      
      this.showNotification('Joining tournament...');
      
      const tournament = await tournamentService.joinTournament({
        tournamentId: tournamentId,
        playerId: currentUser.id,
        playerName: currentUser.name
      });

      console.log('🏆 Successfully joined tournament:', tournament);
      this.currentTournament = tournament;
      this.currentView = 'bracket';
      this.showNotification('Joined successfully!');
      this.render();
    } catch (error) {
      console.error('🏆 Failed to join tournament:', error);
      this.showNotification('Failed to join: ' + (error as Error).message);
    }
  }

  private async viewTournament(tournamentId: string) {
    try {
      const tournament = await tournamentService.getTournament(tournamentId);
      this.currentTournament = tournament;
      this.currentView = 'bracket';
      this.render();
    } catch (error) {
      console.error('🏆 Failed to load tournament:', error);
      this.currentView = 'hub';
      this.render();
    }
  }

  private async handleStartTournament() {
    console.log('🏆 handleStartTournament called');
    console.log('🏆 Current tournament:', this.currentTournament);
    
    if (!this.currentTournament) {
      console.error('🏆 No current tournament to start!');
      this.showNotification('Error: No tournament selected');
      return;
    }

    console.log('🏆 Starting tournament:', this.currentTournament.tournamentId);
    console.log('🏆 Tournament status:', this.currentTournament.status);
    console.log('🏆 Players:', this.currentTournament.players.length);

    try {
      this.showNotification('Starting tournament...');
      const tournament = await tournamentService.startTournament(this.currentTournament.tournamentId);
      console.log('🏆 Tournament started successfully:', tournament);
      this.currentTournament = tournament;
      this.showNotification('Tournament started!');
      this.render();
    } catch (error) {
      console.error('🏆 Failed to start tournament:', error);
      this.showNotification('Failed to start tournament: ' + (error as Error).message);
      this.render();
    }
  }

  // Removed - AI players no longer supported in tournaments

  private async handleClearInactive() {
    console.log('🏆 handleClearInactive called');
    
    try {
      const tournaments = await tournamentService.getTournaments();
      const now = Date.now();
      const twoMinutesAgo = now - (2 * 60 * 1000);
      
      // Find tournaments that are completed or inactive for 2+ minutes
      const toRemove = tournaments.filter(t => 
        t.status === 'completed' || 
        (t.status === 'waiting' && new Date(t.createdAt).getTime() < twoMinutesAgo)
      );
      
      if (toRemove.length === 0) {
        this.showNotification('No inactive tournaments to clear');
        return;
      }
      
      const confirmed = confirm(
        `🗑️ Remove ${toRemove.length} inactive tournament${toRemove.length > 1 ? 's' : ''}?\n\n` +
        `This will remove:\n` +
        `- Completed tournaments\n` +
        `- Waiting tournaments older than 2 minutes\n\n` +
        `This action cannot be undone.`
      );
      
      if (!confirmed) {
        console.log('🏆 Clear cancelled by user');
        return;
      }
      
      // Send clear command to backend
      this.showNotification(`Clearing ${toRemove.length} tournament${toRemove.length > 1 ? 's' : ''}...`);
      
      await tournamentService.clearInactiveTournaments();
      
      this.showNotification(`✅ Cleared ${toRemove.length} inactive tournament${toRemove.length > 1 ? 's' : ''}!`);
      await this.refreshTournamentList();
    } catch (error) {
      console.error('🏆 Failed to clear inactive tournaments:', error);
      this.showNotification('Failed to clear tournaments');
    }
  }

  private refreshBracket() {
    if (this.currentView !== 'bracket' || !this.currentTournament) return;

    this.renderBracket();
  }

  private renderBracket() {
    if (!this.currentTournament) return;

    const bracketContainer = this.container.querySelector('#tournament-bracket');
    if (!bracketContainer) return;

    if (this.bracketComponent) {
      this.bracketComponent.updateData(this.currentTournament);
    } else {
      this.bracketComponent = new TournamentBracket(bracketContainer as HTMLElement, this.currentTournament);
    }
  }

  private async handleMatchStartRequest(match: TournamentMatch) {
    if (!this.currentTournament) return;

    console.log('🏆 Starting tournament match via remote system:', {
      tournamentId: this.currentTournament.tournamentId,
      matchId: match.id,
      player1: match.player1?.name,
      player2: match.player2?.name
    });

    try {
      // Get current user and convert to TournamentPlayer
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('Current user not available');
      }

      const currentPlayer: TournamentPlayer = {
        id: user.id,
        name: user.name,
        isOnline: true,
        isAI: false
      };

      // Use the remote match service to handle the game setup
      // The server will broadcast match_ready when both players are connected
      await this.matchService.startTournamentMatch(
        this.currentTournament,
        match,
        currentPlayer,
        (gameConfig) => {
          console.log('🏆 Remote tournament game starting:', gameConfig);
          this.onStartGame?.(gameConfig);
        }
      );

    } catch (error) {
      console.error('🏆 Failed to start tournament match:', error);
      this.render();
    }
  }

  private async handleMatchStart(match: TournamentMatch) {
    if (!this.currentTournament) return;

    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    // Check if current user is involved in this match
    const isPlayerInMatch = match.player1?.id === currentUser.id || match.player2?.id === currentUser.id;

    if (isPlayerInMatch) {
      console.log('🏆 Auto-starting match for current player:', currentUser.name);

      try {
        // Convert user to TournamentPlayer
        const currentPlayer: TournamentPlayer = {
          id: currentUser.id,
          name: currentUser.name,
          isOnline: true,
          isAI: false
        };

        // Use the remote match service for auto-started matches too
        await this.matchService.startTournamentMatch(
          this.currentTournament,
          match,
          currentPlayer,
          (gameConfig) => {
            console.log('🏆 Auto-started tournament game:', gameConfig);
            this.onStartGame?.(gameConfig);
          }
        );
      } catch (error) {
        console.error('Failed to auto-start tournament match:', error);
      }
    }
  }



  private async handleInviteFriends() {
    if (!this.currentTournament) return;

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('ft_pong_token') || '';
      
      // Import FriendInviteModal dynamically
      const { FriendInviteModal } = await import('../components/modals/FriendInviteModal');
      
      // Create and show the modal
      const friendInviteModal = new FriendInviteModal(token);
      await friendInviteModal.show(
        this.currentTournament.tournamentId,
        'tournament',
        this.currentTournament.name
      );
      
      this.showNotification('Friend invite modal opened');
    } catch (error) {
      console.error('Failed to open friend invite modal:', error);
      
      // Fallback: Just copy the invite code
      this.showInviteCode();
      this.showNotification('Share code: ' + this.currentTournament.tournamentId);
    }
  }

  private handleShareTournament() {
    if (!this.currentTournament) return;

    const tournamentLink = `${window.location.origin}?tournament=${this.currentTournament.tournamentId}`;
    const shareText = `Join my tournament "${this.currentTournament.name}"! Use code: ${this.currentTournament.tournamentId} or click: ${tournamentLink}`;

    // Try Web Share API first
    if (navigator.share) {
      navigator.share({
        title: `Join Tournament: ${this.currentTournament.name}`,
        text: shareText,
        url: tournamentLink
      }).then(() => {
        this.showNotification('Tournament shared successfully!');
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.log('Share failed, falling back to clipboard');
          this.copyToClipboard(shareText);
        }
      });
    } else {
      // Fallback to clipboard
      this.copyToClipboard(shareText);
    }
  }

  private copyToClipboard(text: string) {
    console.log('📋 copyToClipboard called with text:', text);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('✅ Successfully copied to clipboard:', text);
        this.showNotification('Tournament link copied to clipboard!');
      }).catch((err) => {
        console.error('❌ Failed to copy to clipboard:', err);
        this.showNotification('Failed to copy. Code: ' + this.currentTournament?.tournamentId);
      });
    } else {
      // Older browser fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        console.log('✅ Fallback copy succeeded:', text);
        this.showNotification('Tournament link copied!');
      } catch (err) {
        console.error('❌ Fallback copy failed:', err);
        this.showNotification('Failed to copy. Code: ' + this.currentTournament?.tournamentId);
      }
      document.body.removeChild(textarea);
    }
  }

  private showNotification(message: string) {
    console.log('🏆 Notification:', message);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #84cc16, #65a30d);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  private showInviteCode() {
    if (!this.currentTournament) {
      console.warn('🏆 No current tournament when copying invite code');
      return;
    }
    
    const code = this.currentTournament.tournamentId;
    console.log('🏆 Copying tournament invite code:', code);
    console.log('🏆 Full tournament data:', this.currentTournament);
    this.copyToClipboard(code);
    this.showNotification(`Invite code copied: ${code}`);
  }

  private getCurrentUser() {
    // Use the TournamentService's user method to ensure consistency
    return tournamentService.getCurrentUser();
  }

  private async handleShowTournamentBracket(detail: any) {
    console.log('🏆 Show tournament bracket requested:', detail);

    if (detail.tournamentId) {
      try {
        // Load the tournament and switch to bracket view
        const tournament = await tournamentService.getTournament(detail.tournamentId);
        this.currentTournament = tournament;
        this.currentView = 'bracket';
        this.render();

        // Show a notification based on the action
        if (detail.action === 'progression') {
          this.showNotification('🏆 Tournament brackets updated!');
        }
      } catch (error) {
        console.error('🏆 Failed to load tournament for bracket display:', error);
        this.showNotification('Failed to load tournament bracket');
      }
    }
  }

}
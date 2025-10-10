/**
 * Clean Tournament Bracket Display Component
 * 
 * Features:
 * - Displays bracket for 4, 8, 16 player tournaments
 * - Real-time updates as matches complete
 * - Winner auto-advancement visualization
 * - Eliminated player indicators
 * - Current user highlighting
 */

export interface BracketPlayer {
  id: string;
  username: string;
  seed: number;
  isEliminated: boolean;
  placement?: number;
}

export interface BracketMatch {
  id: number;
  tournamentId: number;
  round: number;
  matchNumber: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  scorePlayer1: number;
  scorePlayer2: number;
  status: 'pending' | 'ready' | 'active' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
}

export interface TournamentBracket {
  id: number;
  code: string;
  name: string;
  size: 4 | 8 | 16;
  status: 'waiting' | 'active' | 'completed';
  currentRound: number;
  winnerId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  players: BracketPlayer[];
  matches: BracketMatch[];
}

interface Round {
  number: number;
  name: string;
  matches: BracketMatch[];
}

export class CleanTournamentBracket {
  private container: HTMLElement;
  private bracket: TournamentBracket;
  private currentUserId: string | null = null;

  constructor(container: HTMLElement, bracket: TournamentBracket) {
    this.container = container;
    this.bracket = bracket;
    this.resolveCurrentUser();
    this.render();
  }

  /**
   * Update bracket data and re-render
   */
  public updateBracket(bracket: TournamentBracket): void {
    this.bracket = bracket;
    this.render();
  }

  /**
   * Get current user ID
   */
  private resolveCurrentUser(): void {
    try {
      const authService = (window as any).authService;
      const user = authService?.getUser?.();
      this.currentUserId = user?.id || user?.email || null;
    } catch (error) {
      console.warn('Could not resolve current user:', error);
    }
  }

  /**
   * Organize matches by rounds
   */
  private organizeByRounds(): Round[] {
    const rounds: Round[] = [];
    const totalRounds = Math.log2(this.bracket.size);

    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      const roundMatches = this.bracket.matches.filter(
        match => match.round === roundNum
      ).sort((a, b) => a.matchNumber - b.matchNumber);

      rounds.push({
        number: roundNum,
        name: this.getRoundName(roundNum),
        matches: roundMatches
      });
    }

    return rounds;
  }

  /**
   * Get human-readable round name
   */
  private getRoundName(round: number): string {
    const totalRounds = Math.log2(this.bracket.size);
    const roundsFromEnd = totalRounds - round + 1;

    if (roundsFromEnd === 1) return 'Final';
    if (roundsFromEnd === 2) return 'Semifinals';
    if (roundsFromEnd === 3) return 'Quarterfinals';
    if (roundsFromEnd === 4) return 'Round of 16';
    
    return `Round ${round}`;
  }

  /**
   * Get player by ID
   */
  private getPlayer(playerId: string | null): BracketPlayer | null {
    if (!playerId) return null;
    return this.bracket.players.find(p => p.id === playerId) || null;
  }

  /**
   * Check if player is current user
   */
  private isCurrentUser(playerId: string | null): boolean {
    return playerId === this.currentUserId;
  }

  /**
   * Render the complete bracket
   */
  private render(): void {
    const rounds = this.organizeByRounds();
    
    this.container.innerHTML = `
      <div class="clean-tournament-bracket">
        ${this.renderHeader()}
        <div class="bracket-grid">
          ${rounds.map(round => this.renderRound(round)).join('')}
        </div>
      </div>
      ${this.renderStyles()}
    `;

    this.addEventListeners();
  }

  /**
   * Render bracket header
   */
  private renderHeader(): string {
    const statusEmoji = {
      waiting: '⏳',
      active: '🎮',
      completed: '🏆'
    }[this.bracket.status];

    const statusText = {
      waiting: 'Waiting for players',
      active: `Round ${this.bracket.currentRound} in progress`,
      completed: 'Tournament Complete'
    }[this.bracket.status];

    return `
      <div class="bracket-header">
        <h2 class="bracket-title">
          ${statusEmoji} ${this.bracket.name}
        </h2>
        <div class="bracket-info">
          <span class="info-item">${this.bracket.size} Players</span>
          <span class="info-divider">•</span>
          <span class="info-item">${statusText}</span>
          ${this.bracket.winnerId ? `
            <span class="info-divider">•</span>
            <span class="info-item winner-name">
              Winner: ${this.getPlayer(this.bracket.winnerId)?.username || 'Unknown'}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render a single round
   */
  private renderRound(round: Round): string {
    // Round styling based on progression
    const roundEmojis = ['🎮', '⚔️', '🏅', '🏆'];
    const roundColors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
    const emoji = roundEmojis[round.number - 1] || '🎯';
    const color = roundColors[round.number - 1] || '#84cc16';

    return `
      <div class="bracket-round">
        <div class="round-header" style="
          background: linear-gradient(135deg, ${color}22, ${color}11);
          border: 2px solid ${color}44;
          box-shadow: 0 0 20px ${color}22;
        ">
          <div class="round-emoji">${emoji}</div>
          <div class="round-name" style="color: ${color};">
            ${round.name}
          </div>
          <div class="round-info" style="color: ${color}99;">
            ${round.matches.length} ${round.matches.length === 1 ? 'match' : 'matches'}
          </div>
        </div>
        <div class="round-matches">
          ${round.matches.map(match => this.renderMatch(match)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render a single match
   */
  private renderMatch(match: BracketMatch): string {
    const player1 = this.getPlayer(match.player1Id);
    const player2 = this.getPlayer(match.player2Id);

    // Determine match class
    const statusClass = `match-${match.status}`;
    const userInMatch = this.isCurrentUser(match.player1Id) || this.isCurrentUser(match.player2Id);
    const userMatchClass = userInMatch ? 'match-user' : '';

    return `
      <div class="match ${statusClass} ${userMatchClass}" data-match-id="${match.id}">
        <div class="match-header">
          <span class="match-label">Match ${match.matchNumber + 1}</span>
          ${this.renderMatchBadge(match)}
        </div>
        <div class="match-players">
          ${this.renderPlayer(player1, match.scorePlayer1, match.winnerId, 'player1')}
          <div class="match-divider">VS</div>
          ${this.renderPlayer(player2, match.scorePlayer2, match.winnerId, 'player2')}
        </div>
        ${this.renderMatchActions(match, userInMatch)}
      </div>
    `;
  }

  /**
   * Render match status badge
   */
  private renderMatchBadge(match: BracketMatch): string {
    const badges = {
      pending: '<span class="badge badge-pending">⏳ Waiting</span>',
      ready: '<span class="badge badge-ready">✅ Ready</span>',
      active: '<span class="badge badge-active">🎮 Playing</span>',
      completed: '<span class="badge badge-completed">✓ Complete</span>'
    };

    return badges[match.status] || '';
  }

  /**
   * Render a player slot
   */
  private renderPlayer(
    player: BracketPlayer | null,
    score: number,
    winnerId: string | null,
    slot: 'player1' | 'player2'
  ): string {
    if (!player) {
      return `
        <div class="player player-waiting">
          <span class="player-name">⏳ Waiting for winner...</span>
          <span class="player-score">-</span>
        </div>
      `;
    }

    const isWinner = winnerId === player.id;
    const isLoser = winnerId && winnerId !== player.id;
    const isCurrentUser = this.isCurrentUser(player.id);

    const classes = [
      'player',
      isWinner ? 'player-winner' : '',
      isLoser ? 'player-loser' : '',
      isCurrentUser ? 'player-current-user' : '',
      player.isEliminated ? 'player-eliminated' : ''
    ].filter(Boolean).join(' ');

    return `
      <div class="${classes}">
        <span class="player-name">
          ${isCurrentUser ? '👤 ' : ''}
          ${player.username}
          ${isWinner ? ' 🏆' : ''}
          ${player.isEliminated ? ' ❌' : ''}
        </span>
        <span class="player-score">${score}</span>
      </div>
    `;
  }

  /**
   * Render match actions (start button, etc.)
   */
  private renderMatchActions(match: BracketMatch, userInMatch: boolean): string {
    if (match.status === 'completed') {
      return '';
    }

    if (match.status === 'ready' && userInMatch) {
      return `
        <div class="match-actions">
          <button class="btn-start-match" data-match-id="${match.id}">
            🎮 Start Match
          </button>
        </div>
      `;
    }

    if (match.status === 'active' && userInMatch) {
      return `
        <div class="match-actions">
          <button class="btn-view-match" data-match-id="${match.id}">
            👁️ View Match
          </button>
        </div>
      `;
    }

    return '';
  }

  /**
   * Add event listeners
   */
  private addEventListeners(): void {
    // Start match buttons
    this.container.querySelectorAll('.btn-start-match').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const matchId = (e.target as HTMLElement).dataset.matchId;
        if (matchId) {
          this.onStartMatch(parseInt(matchId));
        }
      });
    });

    // View match buttons
    this.container.querySelectorAll('.btn-view-match').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const matchId = (e.target as HTMLElement).dataset.matchId;
        if (matchId) {
          this.onViewMatch(parseInt(matchId));
        }
      });
    });
  }

  /**
   * Handle start match action
   */
  private onStartMatch(matchId: number): void {
    const match = this.bracket.matches.find(m => m.id === matchId);
    if (!match) return;

    // Dispatch event for game to handle
    window.dispatchEvent(new CustomEvent('tournament:startMatch', {
      detail: {
        tournamentId: this.bracket.id,
        tournamentCode: this.bracket.code,
        matchId: match.id,
        match: match
      }
    }));
  }

  /**
   * Handle view match action
   */
  private onViewMatch(matchId: number): void {
    const match = this.bracket.matches.find(m => m.id === matchId);
    if (!match) return;

    window.dispatchEvent(new CustomEvent('tournament:viewMatch', {
      detail: {
        tournamentId: this.bracket.id,
        matchId: match.id,
        match: match
      }
    }));
  }

  /**
   * Render CSS styles
   */
  private renderStyles(): string {
    return `
      <style>
        .clean-tournament-bracket {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 16px;
          padding: 24px;
          color: white;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }

        .bracket-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .bracket-title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 12px;
          color: #84cc16;
          text-shadow: 0 0 20px rgba(132, 204, 22, 0.5);
        }

        .bracket-info {
          display: flex;
          justify-content: center;
          gap: 12px;
          color: #94a3b8;
          font-size: 14px;
        }

        .info-divider {
          color: #475569;
        }

        .winner-name {
          color: #84cc16;
          font-weight: 600;
        }

        .bracket-grid {
          display: flex;
          gap: 24px;
          overflow-x: auto;
          padding: 16px 0;
        }

        .bracket-round {
          flex: 1;
          min-width: 280px;
        }

        .round-header {
          text-align: center;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .round-emoji {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .round-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .round-info {
          font-size: 12px;
        }

        .round-matches {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .match {
          background: rgba(30, 41, 59, 0.8);
          border: 2px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s;
        }

        .match:hover {
          border-color: rgba(132, 204, 22, 0.4);
          box-shadow: 0 4px 12px rgba(132, 204, 22, 0.2);
        }

        .match-user {
          border-color: rgba(132, 204, 22, 0.6);
          background: rgba(132, 204, 22, 0.1);
        }

        .match-pending {
          opacity: 0.6;
        }

        .match-active {
          border-color: rgba(251, 146, 60, 0.6);
          box-shadow: 0 0 20px rgba(251, 146, 60, 0.3);
        }

        .match-completed {
          border-color: rgba(34, 197, 94, 0.4);
        }

        .match-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .match-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
        }

        .badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .badge-pending {
          background: rgba(100, 116, 139, 0.3);
          color: #94a3b8;
        }

        .badge-ready {
          background: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .badge-active {
          background: rgba(251, 146, 60, 0.3);
          color: #fb923c;
        }

        .badge-completed {
          background: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .match-players {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .match-divider {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          padding: 4px 0;
        }

        .player {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .player-waiting {
          opacity: 0.5;
          font-style: italic;
        }

        .player-current-user {
          border-color: rgba(132, 204, 22, 0.6);
          background: rgba(132, 204, 22, 0.1);
        }

        .player-winner {
          border-color: rgba(132, 204, 22, 0.8);
          background: rgba(132, 204, 22, 0.2);
        }

        .player-loser {
          opacity: 0.5;
          text-decoration: line-through;
        }

        .player-eliminated {
          opacity: 0.4;
        }

        .player-name {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .player-score {
          font-size: 18px;
          font-weight: 700;
          color: #84cc16;
          min-width: 30px;
          text-align: right;
        }

        .match-actions {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }

        .btn-start-match,
        .btn-view-match {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-start-match:hover,
        .btn-view-match:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(132, 204, 22, 0.4);
        }

        .btn-view-match {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
      </style>
    `;
  }
}

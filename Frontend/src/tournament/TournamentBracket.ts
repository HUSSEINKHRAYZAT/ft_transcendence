export interface TournamentPlayer {
  id: string;
  name: string;
  isOnline: boolean;
  isAI?: boolean;
  externalId?: string;
  avatar?: string;
  aiLevel?: 'easy' | 'medium' | 'hard'; // AI difficulty level
  aiType?: 'tournament' | 'practice'; // Type of AI bot
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchIndex: number;
  player1?: TournamentPlayer;
  player2?: TournamentPlayer;
  winner?: TournamentPlayer;
  score1?: number;
  score2?: number;
  isComplete: boolean;
  isActive: boolean;
  nextMatchId?: string;
  scheduledTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
  waitingForOpponent?: boolean;
}

export interface TournamentBracketData {
  tournamentId: string;
  name: string;
  size: 4 | 8 | 16;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  isComplete: boolean;
  winner?: TournamentPlayer;
  createdAt: Date;
  status: 'waiting' | 'active' | 'completed';
  createdBy: string;
  isPublic: boolean;
  allowSpectators: boolean;
}

export class TournamentBracket {
  private container: HTMLElement;
  private data: TournamentBracketData;
  private currentUserId: string | null = null;

  private resolveUserIdFromRecord(record: any): string | null {
    if (!record || typeof record !== 'object') {
      return null;
    }

    const candidates = [
      record.id,
      record.externalId,
      record.userId,
      record.playerId,
      record.email,
      record.username
    ];

    const resolved = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return resolved ? String(resolved) : null;
  }

  private doesIdMatchUser(candidateId: string | undefined | null, userId: string | null | undefined): boolean {
    if (!candidateId || !userId) {
      return false;
    }
    return candidateId === userId;
  }

  private doesPlayerMatchUser(player: TournamentPlayer | undefined, userId: string | null | undefined): boolean {
    if (!player) {
      return false;
    }
    return this.doesIdMatchUser(player.id, userId) || this.doesIdMatchUser(player.externalId, userId);
  }

  private areSamePlayer(a?: TournamentPlayer, b?: TournamentPlayer): boolean {
    if (!a || !b) {
      return false;
    }
    return (
      this.doesIdMatchUser(a.id, b.id) ||
      this.doesIdMatchUser(a.id, b.externalId) ||
      this.doesIdMatchUser(a.externalId, b.id) ||
      this.doesIdMatchUser(a.externalId, b.externalId)
    );
  }

  constructor(container: HTMLElement, data: TournamentBracketData) {
    this.container = container;
    this.data = data;
    this.resolveCurrentUser();
    this.render();
  }

  public updateData(data: TournamentBracketData) {
    this.data = data;
    this.render();
  }

  public destroy() {
    // Clean up polling when component is destroyed
    if (this.pollingInterval) {
      console.log('🧹 Cleaning up auto-polling interval');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false; // Clear polling flag
  }

  private resolveCurrentUser(): void {
    try {
      // Try to get user from auth service or session storage
      const authService = (window as any).authService;
      if (authService && authService.getUser) {
        const user = authService.getUser();
        if (user) {
          this.currentUserId = this.resolveUserIdFromRecord(user);
        }
      }
      
      // Fallback to session storage
      if (!this.currentUserId) {
        const cachedUser = sessionStorage.getItem('ft_pong_current_user');
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            this.currentUserId = this.resolveUserIdFromRecord(parsed);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.warn('Failed to resolve current user for tournament bracket:', error);
    }
  }

  private checkForActiveMatch(): void {
    if (!this.currentUserId) return;

    // Always show the bracket to all players
    console.log('🏆 Tournament bracket displayed for all players');

    // Find active matches that include the current user for highlighting
    const activeMatch = this.data.matches.find(match =>
      match.isActive &&
      !match.isComplete &&
      (this.doesPlayerMatchUser(match.player1, this.currentUserId) || this.doesPlayerMatchUser(match.player2, this.currentUserId))
    );

    if (activeMatch) {
      console.log('🏆 Current user has an active match:', activeMatch);
      // Don't auto-start - just highlight the match for the user to manually start
      return;
    }

    // Check if user just won a match and needs to wait for next round
    const userCompletedMatches = this.data.matches.filter(match =>
      match.isComplete &&
      this.doesPlayerMatchUser(match.winner, this.currentUserId)
    );

    if (userCompletedMatches.length > 0 && !this.data.isComplete && !this.isPolling) {
      // User has won at least one match and tournament isn't complete
      // Find the highest round the user has completed
      const maxCompletedRound = Math.max(...userCompletedMatches.map(m => m.round));
      const nextRound = maxCompletedRound + 1;

      console.log('🏆 User has won matches, checking for next round...');
      console.log(`   Latest completed round: ${maxCompletedRound}, next round: ${nextRound}`);

      // Start auto-polling for the next match
      this.startAutoMatchPolling(nextRound);
    }
  }

  private async startMatchForCurrentUser(match: TournamentMatch): Promise<void> {
    try {
      console.log('🏆 Auto-starting tournament match:', match);
      
      // Import the tournament match service
      const { TournamentMatchService } = await import('./TournamentMatchService');
      const matchService = TournamentMatchService.getInstance();
      
      // Get current user info
      const authService = (window as any).authService;
      const currentUser = authService?.getUser?.();
      if (!currentUser) return;
      const playerId = this.resolveUserIdFromRecord(currentUser);
      if (!playerId) return;
      
      const currentPlayer = {
        id: playerId,
        name: currentUser.userName || currentUser.firstName || currentUser.email,
        isOnline: true,
        isAI: false
      };
      
      // Start the match
      await matchService.startTournamentMatch(
        this.data,
        match,
        currentPlayer,
        async (gameConfig) => {
          console.log('🏆 Starting tournament game:', gameConfig);
          
          // Clear the tournament bracket UI
          const jumbotron = document.getElementById('jumbotron');
          if (jumbotron) {
            jumbotron.innerHTML = `
              <div class="min-h-screen bg-black relative">
                <canvas id="gameCanvas" class="w-full h-full block"></canvas>
              </div>
            `;
          }
          
          // Start the game
          const { Pong3D } = await import('../game/core/Pong3D');
          const gameInstance = new Pong3D(gameConfig);
          (window as any).currentGameInstance = gameInstance;
        }
      );
    } catch (error) {
      console.error('Failed to auto-start tournament match:', error);
    }
  }

  private render() {
    this.container.innerHTML = '';
    
    const bracketDiv = document.createElement('div');
    bracketDiv.className = 'tournament-bracket';
    bracketDiv.innerHTML = this.generateBracketHTML();
    
    this.container.appendChild(bracketDiv);
    this.addEventListeners();
    this.checkForActiveMatch();
  }

  private generateBracketHTML(): string {
    const rounds = this.getRounds();
    const totalRounds = rounds.length || 1;

    return `
      <section class="tournament-bracket-ui" style="--round-count:${totalRounds}">
        ${this.generateBracketHeader(totalRounds)}
        <div class="bracket-grid">
          ${rounds.map((roundMatches, index) => this.generateRoundHTML(roundMatches, index, totalRounds)).join('')}
        </div>
      </section>
      ${this.generateBracketStyles()}
    `;
  }

  private generateBracketHeader(totalRounds: number): string {
    const tournamentName = this.escapeHtml(this.data.name);
    const roundsText = this.data.isComplete
      ? 'All rounds completed'
      : `Round ${Math.max(1, this.data.currentRound)} of ${totalRounds}`;
    const playerCount = `${Math.min(this.data.players.length, this.data.size)}/${this.data.size} players`;
    const spectatorsChip = this.data.allowSpectators
      ? '<span class="info-chip">👀 Spectators allowed</span>'
      : '<span class="info-chip info-chip--muted">🔒 Private lobby</span>';
    const winnerChip = this.data.winner
      ? `<span class="info-chip info-chip--winner">🏆 Winner: ${this.escapeHtml(this.data.winner.name)}</span>`
      : '';

    return `
      <header class="bracket-header">
        <div class="header-titles">
          <h2 class="bracket-title">${tournamentName}</h2>
          <p class="bracket-subtitle">${this.data.size}-player elimination · ${roundsText}</p>
        </div>
        <div class="bracket-meta">
          ${this.renderStatusChip()}
          <span class="info-chip">👥 ${playerCount}</span>
          ${spectatorsChip}
          ${winnerChip}
        </div>
      </header>
    `;
  }

  private renderStatusChip(): string {
    const status = this.data.status;

    if (status === 'completed' || this.data.isComplete) {
      return '<span class="status-chip status-chip--completed">🏆 Tournament completed</span>';
    }
    if (status === 'active') {
      return `<span class="status-chip status-chip--active">🎮 Round ${Math.max(1, this.data.currentRound)}</span>`;
    }
    return '<span class="status-chip status-chip--waiting">⏳ Waiting for players</span>';
  }

  private getRounds(): TournamentMatch[][] {
    const roundsMap = new Map<number, TournamentMatch[]>();

    for (const match of this.data.matches) {
      if (!roundsMap.has(match.round)) {
        roundsMap.set(match.round, []);
      }
      roundsMap.get(match.round)!.push(match);
    }

    return Array.from(roundsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, matches]) => matches.sort((a, b) => (a.matchIndex ?? 0) - (b.matchIndex ?? 0)));
  }

  private generateRoundHTML(matches: TournamentMatch[], roundIndex: number, totalRounds: number): string {
    const roundLabel = this.getRoundLabel(roundIndex, totalRounds);
    const roundIcon = this.getRoundIcon(roundIndex);
    const matchesHtml = matches.length
      ? matches.map(match => this.generateMatchHTML(match, roundIndex, totalRounds)).join('')
      : this.generatePlaceholderMatch(roundIndex, totalRounds);

    return `
      <div class="bracket-column" data-round-index="${roundIndex}">
        <div class="round-label">
          <span class="round-icon">${roundIcon}</span>
          <span>${roundLabel}</span>
        </div>
        <div class="round-matches">
          ${matchesHtml}
        </div>
      </div>
    `;
  }

  private getRoundLabel(roundIndex: number, totalRounds: number): string {
    const labelsByRounds: Record<number, string[]> = {
      2: ['Semifinals', 'Final'],
      3: ['Quarterfinals', 'Semifinals', 'Final'],
      4: ['Round of 16', 'Quarterfinals', 'Semifinals', 'Final']
    };

    const labels = labelsByRounds[totalRounds] ?? Array.from({ length: totalRounds }, (_, i) => `Round ${i + 1}`);
    return labels[roundIndex] || `Round ${roundIndex + 1}`;
  }

  private getRoundIcon(roundIndex: number): string {
    const icons = ['🎮', '⚔️', '🏅', '🏆'];
    return icons[Math.min(roundIndex, icons.length - 1)] || '🎯';
  }

  private generatePlaceholderMatch(roundIndex: number, totalRounds: number): string {
    const hasConnector = roundIndex < totalRounds - 1;
    const classes = ['match-card', 'is-placeholder'];

    if (hasConnector) {
      classes.push('has-connector', 'connector-top');
    }

    return `
      <article class="${classes.join(' ')}" data-round="${roundIndex + 1}">
        <div class="match-meta">
          <span class="match-label">Match TBD</span>
          <span class="match-status" data-state="waiting">⌛ Pending</span>
        </div>
        <div class="match-players">
          ${this.generatePlaceholderPlayer('Awaiting player')}
          ${this.generatePlaceholderPlayer('Awaiting player')}
        </div>
      </article>
    `;
  }

  private generatePlaceholderPlayer(label: string): string {
    return `
      <div class="match-player is-placeholder">
        <div class="player-info">
          <div class="player-name">
            <span class="player-avatar">?</span>
            <span>${this.escapeHtml(label)}</span>
          </div>
          <span class="player-status">TBD</span>
        </div>
        <span class="player-score">-</span>
      </div>
    `;
  }

  private generateMatchHTML(match: TournamentMatch, roundIndex: number, totalRounds: number): string {
    const currentUser = this.getCurrentUser();
    const resolvedUserId = this.resolveUserIdFromRecord(currentUser) || this.currentUserId;

    if (!this.currentUserId && resolvedUserId) {
      this.currentUserId = resolvedUserId;
    }

    const isUserInMatch = Boolean(
      resolvedUserId &&
      (this.doesPlayerMatchUser(match.player1, resolvedUserId) || this.doesPlayerMatchUser(match.player2, resolvedUserId))
    );

    const isActive = match.isActive && !match.isComplete;
    const playersPresent = Boolean(match.player1) && Boolean(match.player2);
    const isPending = !match.isComplete && playersPresent && !isActive;
    const waitingForOpponent = !match.isComplete && (!playersPresent || Boolean(match.waitingForOpponent));
    const hasConnector = roundIndex < totalRounds - 1;
    const matchIndex = match.matchIndex ?? 0;

    const cardClasses: string[] = ['match-card'];

    if (match.isComplete) {
      cardClasses.push('is-complete');
    } else if (isActive) {
      cardClasses.push('is-active');
    } else if (isPending) {
      cardClasses.push('is-ready');
    }

    if (waitingForOpponent) {
      cardClasses.push('is-waiting');
    }

    if (isUserInMatch) {
      cardClasses.push('is-user-match');
    }

    if (hasConnector) {
      cardClasses.push('has-connector');
      cardClasses.push(matchIndex % 2 === 0 ? 'connector-top' : 'connector-bottom');
    }

    return `
      <article class="${cardClasses.join(' ')}" data-match-id="${match.id}" data-round="${roundIndex + 1}" data-index="${matchIndex}">
        <div class="match-meta">
          <span class="match-label">Match ${matchIndex + 1}</span>
          ${this.getMatchStatusBadge(match, isUserInMatch, waitingForOpponent)}
        </div>
        <div class="match-players">
          ${this.generatePlayerHTML(match.player1, match.score1, match.winner, resolvedUserId)}
          ${this.generatePlayerHTML(match.player2, match.score2, match.winner, resolvedUserId)}
        </div>
        ${this.getMatchActionsHTML(match, isActive, isPending, isUserInMatch)}
      </article>
    `;
  }

  private getMatchStatusBadge(match: TournamentMatch, isUserInMatch: boolean, waitingForOpponent: boolean): string {
    if (match.isComplete) {
      return '<span class="match-status" data-state="completed">🏆 Complete</span>';
    }
    if (match.isActive) {
      return `<span class="match-status" data-state="active">${isUserInMatch ? '🎮 In progress' : '🎮 Live'}</span>`;
    }
    if (waitingForOpponent) {
      return `<span class="match-status" data-state="waiting">${isUserInMatch ? '⌛ Waiting for opponent' : '⌛ Awaiting opponent'}</span>`;
    }
    if (match.player1 && match.player2) {
      return `<span class="match-status" data-state="${isUserInMatch ? 'user-ready' : 'ready'}">${isUserInMatch ? '🚀 Your turn' : '✅ Ready'}</span>`;
    }
    return '<span class="match-status" data-state="waiting">⌛ Pending</span>';
  }

  private getMatchActionsHTML(match: TournamentMatch, isActive: boolean, isPending: boolean, isUserInMatch: boolean): string {
    const hasPlayer1 = Boolean(match.player1);
    const hasPlayer2 = Boolean(match.player2);
    const waitingForOpponent = !match.isComplete && (Boolean(match.waitingForOpponent) || (hasPlayer1 !== hasPlayer2));
    const currentUser = this.getCurrentUser();
    const resolvedUserId = this.resolveUserIdFromRecord(currentUser) || this.currentUserId;

    if (match.isComplete) {
      if (resolvedUserId && this.doesPlayerMatchUser(match.winner, resolvedUserId)) {
        return `
          <div class="match-actions">
            <div class="action-message action-message--success">🏆 You won this match</div>
            <span class="action-subtext">Waiting for the next round...</span>
          </div>
        `;
      }
      return '';
    }

    if (waitingForOpponent) {
      return `
        <div class="match-actions">
          <div class="action-message">${isUserInMatch ? '⌛ Waiting for your opponent to be ready...' : '⌛ Awaiting opponent assignment'}</div>
        </div>
      `;
    }

    if (!hasPlayer1 && !hasPlayer2) {
      return `
        <div class="match-actions">
          <div class="action-message action-message--muted">Players will populate shortly</div>
        </div>
      `;
    }

    if (isActive) {
      if (isUserInMatch) {
        return `
          <div class="match-actions">
            <button type="button" class="btn-view-match" data-match-id="${match.id}">
              👀 Rejoin match
            </button>
          </div>
        `;
      }
      return `
        <div class="match-actions">
          <div class="action-message action-message--muted">Match in progress</div>
        </div>
      `;
    }

    if (isPending && isUserInMatch) {
      return `
        <div class="match-actions">
          <button type="button" class="btn-start-match" data-match-id="${match.id}">
            🚀 Start match
          </button>
        </div>
      `;
    }

    if (isPending && !isUserInMatch) {
      return `
        <div class="match-actions">
          <div class="action-message action-message--muted">Players are preparing to start</div>
        </div>
      `;
    }

    return '';
  }

  private getCurrentUser() {
    // Get current user from auth service or localStorage
    try {
      const userData = localStorage.getItem('ft_pong_user_data');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  private generatePlayerHTML(
    player: TournamentPlayer | undefined,
    score: number | undefined,
    winner: TournamentPlayer | undefined,
    resolvedUserId: string | null | undefined
  ): string {
    if (!player) {
      return `
        <div class="match-player is-placeholder">
          <div class="player-info">
            <div class="player-name">
              <span class="player-avatar">?</span>
              <span>${this.escapeHtml('TBD')}</span>
            </div>
            <span class="player-status">TBD</span>
          </div>
          <span class="player-score">-</span>
        </div>
      `;
    }

    const isWinner = Boolean(winner && this.areSamePlayer(winner, player));
    const isLoser = Boolean(winner && !this.areSamePlayer(winner, player));
    const isCurrentUser = Boolean(resolvedUserId && this.doesPlayerMatchUser(player, resolvedUserId));
    const statusTokens: string[] = [];

    if (player.isAI) {
      statusTokens.push(player.aiLevel ? `${player.aiLevel.charAt(0).toUpperCase()}${player.aiLevel.slice(1)} bot` : 'AI opponent');
    }

    if (!player.isOnline && !player.isAI) {
      statusTokens.push('Offline');
    }

    const statusHtml = statusTokens.length ? `<span class="player-status">${statusTokens.join(' • ')}</span>` : '';
    const scoreDisplay = typeof score === 'number' ? score : '-';
    const initial = player.name ? player.name.trim().charAt(0).toUpperCase() : '?';
    const avatarUrl = player.avatar ? encodeURI(player.avatar) : null;
    const avatar = avatarUrl
      ? `<span class="player-avatar player-avatar--image" style="background-image: url('${avatarUrl}');"></span>`
      : `<span class="player-avatar">${initial}</span>`;

    const badges: string[] = [];
    if (isCurrentUser) {
      badges.push('<span class="player-badge player-badge--you">YOU</span>');
    }
    if (player.isAI) {
      badges.push('<span class="player-badge player-badge--ai">AI</span>');
    }

    const classes = ['match-player'];
    if (isWinner) {
      classes.push('is-winner');
    } else if (isLoser) {
      classes.push('is-loser');
    }
    if (isCurrentUser) {
      classes.push('is-current');
    }

    return `
      <div class="${classes.join(' ')}">
        <div class="player-info">
          <div class="player-name">
            ${avatar}
            <span>${this.escapeHtml(player.name)}</span>
            ${badges.join('')}
          </div>
          ${statusHtml}
        </div>
        <span class="player-score">${scoreDisplay}</span>
      </div>
    `;
  }

  private escapeHtml(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateBracketStyles(): string {
    return `
      <style>
        .tournament-bracket {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: none;
        }

        .tournament-bracket-ui {
          --round-count: 3;
          --round-gap: clamp(24px, 3vw, 40px);
          --connector-color: rgba(148, 163, 184, 0.32);
          position: relative;
          color: #e2e8f0;
          background:
            radial-gradient(circle at top left, rgba(132, 204, 22, 0.15), transparent 45%),
            radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 40%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98));
          border-radius: 28px;
          padding: 32px clamp(24px, 4vw, 40px);
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 32px 56px rgba(15, 23, 42, 0.45);
          overflow: hidden;
        }

        .tournament-bracket-ui::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at center, rgba(132, 204, 22, 0.08), transparent 60%);
          opacity: 0.6;
        }

        .bracket-header {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .header-titles {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 240px;
        }

        .bracket-title {
          margin: 0;
          font-size: clamp(26px, 3vw, 32px);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #f8fafc;
        }

        .bracket-subtitle {
          margin: 0;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: rgba(148, 163, 184, 0.85);
        }

        .bracket-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .status-chip,
        .info-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(15, 23, 42, 0.65);
          color: rgba(226, 232, 240, 0.92);
        }

        .status-chip--waiting {
          border-color: rgba(148, 163, 184, 0.35);
        }

        .status-chip--active {
          border-color: rgba(251, 146, 60, 0.45);
          background: rgba(251, 146, 60, 0.18);
          color: #fb923c;
        }

        .status-chip--completed {
          border-color: rgba(34, 197, 94, 0.45);
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .info-chip--winner {
          border-color: rgba(132, 204, 22, 0.55);
          background: rgba(132, 204, 22, 0.18);
          color: #84cc16;
        }

        .info-chip--muted {
          border-color: rgba(148, 163, 184, 0.25);
          color: rgba(148, 163, 184, 0.7);
        }

        .bracket-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(var(--round-count), minmax(220px, 1fr));
          gap: var(--round-gap);
          overflow-x: auto;
          padding-bottom: 12px;
        }

        .bracket-column {
          position: relative;
          min-width: min(260px, 100%);
          display: flex;
          flex-direction: column;
          gap: clamp(20px, 2.4vw, 36px);
        }

        .round-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          align-self: flex-start;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(15, 23, 42, 0.65);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(226, 232, 240, 0.85);
        }

        .round-icon {
          font-size: 16px;
        }

        .round-matches {
          display: flex;
          flex-direction: column;
          gap: clamp(24px, 3.5vw, 56px);
        }

        .match-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: clamp(16px, 2vw, 20px);
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 18px;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.35);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .match-card:hover {
          transform: translateY(-4px);
          border-color: rgba(148, 163, 184, 0.42);
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.45);
        }

        .match-card.is-user-match {
          border-color: rgba(132, 204, 22, 0.75);
          box-shadow: 0 18px 36px rgba(132, 204, 22, 0.2);
        }

        .match-card.is-active {
          border-color: rgba(249, 115, 22, 0.75);
          box-shadow: 0 18px 36px rgba(249, 115, 22, 0.22);
        }

        .match-card.is-ready {
          border-color: rgba(56, 189, 248, 0.5);
          background: rgba(56, 189, 248, 0.12);
        }

        .match-card.is-complete {
          border-color: rgba(34, 197, 94, 0.65);
          background: linear-gradient(145deg, rgba(34, 197, 94, 0.2), rgba(15, 23, 42, 0.78));
        }

        .match-card.is-waiting {
          opacity: 0.88;
        }

        .match-card.is-placeholder {
          border-style: dashed;
          color: rgba(148, 163, 184, 0.7);
          background: rgba(15, 23, 42, 0.45);
        }

        .match-card.has-connector::after {
          content: '';
          position: absolute;
          top: 50%;
          right: -28px;
          width: 28px;
          height: 2px;
          background: var(--connector-color);
        }

        .match-card.connector-top::before,
        .match-card.connector-bottom::before {
          content: '';
          position: absolute;
          right: -28px;
          width: 2px;
          background: var(--connector-color);
        }

        .match-card.connector-top::before {
          top: 50%;
          height: calc(50% + clamp(10px, 3vw, 32px));
          transform: translateY(-100%);
        }

        .match-card.connector-bottom::before {
          bottom: 50%;
          height: calc(50% + clamp(10px, 3vw, 32px));
          transform: translateY(100%);
        }

        .match-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.85);
        }

        .match-label {
          font-weight: 700;
        }

        .match-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.6);
          font-weight: 700;
        }

        .match-status[data-state="active"] {
          color: #fb923c;
          border-color: rgba(251, 146, 60, 0.5);
          background: rgba(251, 146, 60, 0.18);
        }

        .match-status[data-state="completed"] {
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.5);
          background: rgba(34, 197, 94, 0.2);
        }

        .match-status[data-state="ready"],
        .match-status[data-state="user-ready"] {
          color: #38bdf8;
          border-color: rgba(56, 189, 248, 0.48);
          background: rgba(56, 189, 248, 0.18);
        }

        .match-status[data-state="user-ready"] {
          color: #84cc16;
          border-color: rgba(132, 204, 22, 0.5);
          background: rgba(132, 204, 22, 0.2);
        }

        .match-status[data-state="waiting"] {
          color: rgba(148, 163, 184, 0.85);
        }

        .match-players {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .match-player {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(15, 23, 42, 0.7);
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }

        .match-player.is-current {
          border-color: rgba(132, 204, 22, 0.75);
          box-shadow: 0 0 18px rgba(132, 204, 22, 0.25);
        }

        .match-player.is-winner {
          border-color: rgba(34, 197, 94, 0.5);
          background: rgba(34, 197, 94, 0.18);
        }

        .match-player.is-loser {
          opacity: 0.6;
        }

        .match-player.is-placeholder {
          border-style: dashed;
          color: rgba(148, 163, 184, 0.7);
          background: rgba(15, 23, 42, 0.45);
        }

        .player-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .player-name {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          color: #f8fafc;
        }

        .player-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(148, 163, 184, 0.25);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .player-avatar--image {
          background-size: cover;
          background-position: center;
          border: 2px solid rgba(148, 163, 184, 0.35);
        }

        .player-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .player-badge--you {
          background: rgba(132, 204, 22, 0.92);
          color: #0f172a;
        }

        .player-badge--ai {
          background: rgba(56, 189, 248, 0.88);
          color: #0f172a;
        }

        .player-status {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: rgba(148, 163, 184, 0.78);
        }

        .player-score {
          font-size: 20px;
          font-weight: 700;
          min-width: 32px;
          text-align: right;
          color: #f8fafc;
        }

        .match-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid rgba(148, 163, 184, 0.22);
          padding-top: 12px;
        }

        .action-message {
          font-size: 12px;
          color: rgba(148, 163, 184, 0.85);
        }

        .action-message--success {
          color: #84cc16;
          font-weight: 600;
        }

        .action-message--muted {
          color: rgba(148, 163, 184, 0.7);
        }

        .action-subtext {
          font-size: 11px;
          color: rgba(148, 163, 184, 0.75);
        }

        .btn-start-match,
        .btn-view-match {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .btn-start-match {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: #0f172a;
        }

        .btn-view-match {
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          color: #f8fafc;
        }

        .btn-start-match:hover,
        .btn-view-match:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 22px rgba(15, 23, 42, 0.35);
        }

        @media (max-width: 1024px) {
          .tournament-bracket-ui {
            padding: 28px;
          }

          .bracket-grid {
            grid-template-columns: repeat(var(--round-count), minmax(220px, 1fr));
          }
        }

        @media (max-width: 720px) {
          .tournament-bracket-ui {
            padding: 24px;
          }

          .bracket-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .bracket-grid {
            grid-auto-flow: column;
            overflow-x: auto;
          }

          .match-card.has-connector::after,
          .match-card.connector-top::before,
          .match-card.connector-bottom::before {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .tournament-bracket-ui {
            padding: 20px;
            border-radius: 20px;
          }

          .player-name {
            font-size: 13px;
          }

          .player-status {
            font-size: 9px;
          }

          .player-score {
            font-size: 18px;
          }
        }
      </style>
    `;
  }

  private addEventListeners() {
    // Add click handlers for match cards if needed
    const matchCards = this.container.querySelectorAll('.match-card');
    matchCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const matchId = (e.currentTarget as HTMLElement).dataset.matchId;
        if (matchId) {
          this.onMatchClick(matchId);
        }
      });
    });

    // Auto-polling will handle tournament advancement - no manual continue button needed
  }

  private onMatchClick(matchId: string) {
    // Handle match click - could open match details, start game, etc.
    const match = this.data.matches.find(m => m.id === matchId);
    if (match) {
      console.log('Match clicked:', match);
      
      // If match is ready to start, emit event
      if (!match.isComplete && match.player1 && match.player2 && !match.isActive) {
        this.emitMatchStartRequest(match);
      } else if (match.isActive) {
        this.emitMatchViewRequest(match);
      }
    }
  }

  private emitMatchStartRequest(match: TournamentMatch) {
    const event = new CustomEvent('tournamentMatchStartRequest', {
      detail: { 
        tournamentId: this.data.tournamentId,
        match: match 
      }
    });
    window.dispatchEvent(event);
  }

  private emitMatchViewRequest(match: TournamentMatch) {
    const event = new CustomEvent('tournamentMatchViewRequest', {
      detail: {
        tournamentId: this.data.tournamentId,
        match: match
      }
    });
    window.dispatchEvent(event);
  }

  private pollingInterval: number | null = null;
  private isPolling: boolean = false; // Flag to prevent duplicate polling

  private startAutoMatchPolling(targetRound: number) {
    // Check if already polling to prevent duplicates
    if (this.isPolling) {
      console.log('⚠️ Already polling for next match - ignoring duplicate request');
      return;
    }

    // Clear any existing polling to prevent duplicates
    if (this.pollingInterval) {
      console.log('⚠️ Clearing existing polling interval before starting new one');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Set polling flag
    this.isPolling = true;

    const currentUser = this.getCurrentUser();
    const resolvedUserId = this.resolveUserIdFromRecord(currentUser) || this.currentUserId;

    if (!resolvedUserId) {
      console.log('❌ Cannot start polling - no current user');
      return;
    }

    if (!this.currentUserId) {
      this.currentUserId = resolvedUserId;
    }

    console.log('🎯 Auto-polling started: checking for match in Round', targetRound, 'for user', resolvedUserId);
    
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 2 minutes (60 polls × 2 seconds)

    this.pollingInterval = window.setInterval(async () => {
      pollCount++;
      
      try {
        // Fetch fresh tournament data
        const { tournamentService } = await import('./TournamentService');
        const freshTournament = await tournamentService.getTournament(this.data.tournamentId);
        
        console.log(`🔄 Auto-polling #${pollCount}: Tournament state:`, {
          tournamentCurrentRound: freshTournament.currentRound,
          searchingForRound: targetRound,
          totalMatches: freshTournament.matches.length,
          status: freshTournament.status
        });
        
        // Update internal state
        this.data = freshTournament;

        // CRITICAL: Check if ALL matches in the previous round are complete
        // The backend won't assign winners to next round until ALL sibling matches finish
        const previousRound = targetRound - 1;
        const previousRoundMatches = freshTournament.matches.filter(m => m.round === previousRound);
        const allPreviousRoundComplete = previousRoundMatches.length === 0 ? true : previousRoundMatches.every(m => m.isComplete);

        if (!allPreviousRoundComplete) {
          const completedCount = previousRoundMatches.filter(m => m.isComplete).length;
          console.log(`⏳ Auto-polling #${pollCount}: Waiting for other matches in Round ${previousRound}... (${completedCount}/${previousRoundMatches.length} complete)`);
        } else {
          console.log(`✅ Auto-polling #${pollCount}: All Round ${previousRound} matches complete! Looking for Round ${targetRound} match...`);
        }

        // Look for ANY match where current user is assigned (not just target round)
        // This handles cases where backend already advanced to next round
        const allMatchesWithUser = freshTournament.matches.filter(m =>
          (this.doesPlayerMatchUser(m.player1, resolvedUserId) || this.doesPlayerMatchUser(m.player2, resolvedUserId)) &&
          !m.isComplete
        );

        console.log(`🔍 Auto-polling #${pollCount}: Found ${allMatchesWithUser.length} incomplete matches with user`);

        // DEBUG: Log ALL matches to see what's in the tournament
        console.log(`🔍 DEBUG: All tournament matches:`, freshTournament.matches.map(m => ({
          id: m.id,
          round: m.round,
          player1: m.player1?.name || 'null',
          player1Id: m.player1?.id || 'null',
          player2: m.player2?.name || 'null',
          player2Id: m.player2?.id || 'null',
          status: m.isComplete ? 'completed' : (m.isActive ? 'active' : 'pending'),
          isActive: m.isActive,
          isComplete: m.isComplete
        })));
  console.log(`🔍 DEBUG: Current user ID:`, resolvedUserId);

        if (allMatchesWithUser.length > 0) {
          allMatchesWithUser.forEach(m => {
            console.log(`  📋 Match: Round ${m.round}, ${m.player1?.name} vs ${m.player2?.name}, Active: ${m.isActive}`);
          });
        }

        // Find the next active match for this user
        const nextMatch = allMatchesWithUser.find(m => m.isActive);

        if (nextMatch) {
          console.log('✅ Auto-polling: Active match found!', {
            matchId: nextMatch.id,
            round: nextMatch.round,
            player1: nextMatch.player1?.name,
            player2: nextMatch.player2?.name,
            isActive: nextMatch.isActive
          });

          console.log('🏆 Auto-polling: Active match ready - showing bracket with Start button');
          
          // Stop polling - match is ready
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          this.isPolling = false; // Clear polling flag
          
          // Just refresh the bracket to show the Start Match button
          // Players must manually click to start
          return; // Exit the interval
        } else if (allMatchesWithUser.length > 0) {
          console.log(`⏳ Auto-polling #${pollCount}: Match found but not active yet`);
        } else {
          console.log(`🔄 Auto-polling #${pollCount}/${maxPolls}: No match with user assigned yet`);
        }

        // Check if tournament completed
        if (freshTournament.isComplete) {
          console.log('🏆 Auto-polling: Tournament complete - stopping');
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          this.isPolling = false; // Clear polling flag
        }

        // Stop after max polls
        if (pollCount >= maxPolls) {
          console.log('⏰ Auto-polling: Reached max polls - stopping');
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          this.isPolling = false; // Clear polling flag
        }
      } catch (error) {
        console.error('❌ Auto-polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  }

  private findNextMatchForWinner(completedMatch: TournamentMatch): TournamentMatch | null {
    // Find the next round match that this winner should be in
    const nextRound = completedMatch.round + 1;
    const currentUserRecord = this.getCurrentUser();
    const resolvedUserId = this.resolveUserIdFromRecord(currentUserRecord) || this.currentUserId;

    if (!resolvedUserId) {
      console.log('❌ No current user found');
      return null;
    }

    console.log('🔍 Looking for next match:', {
      currentRound: completedMatch.round,
      nextRound,
      userId: resolvedUserId,
      totalMatches: this.data.matches.length
    });

    // Log all matches in the next round for debugging
    const nextRoundMatches = this.data.matches.filter(m => m.round === nextRound);
    console.log('📋 Matches in next round:', nextRoundMatches.map(m => ({
      id: m.id,
      round: m.round,
      player1: `${m.player1?.name || 'TBD'} (ID: ${m.player1?.id || 'none'})`,
      player2: `${m.player2?.name || 'TBD'} (ID: ${m.player2?.id || 'none'})`,
      isActive: m.isActive,
      isComplete: m.isComplete
    })));

    console.log('🔑 Searching for user ID:', resolvedUserId, '(type:', typeof resolvedUserId + ')');

    // Look for matches in the next round where the current user is a participant
    // OR matches that are active/pending (user might be assigned)
    const nextMatch = this.data.matches.find(match =>
      match.round === nextRound &&
      (this.doesPlayerMatchUser(match.player1, resolvedUserId) || this.doesPlayerMatchUser(match.player2, resolvedUserId))
    );

    console.log('🎯 Match search result:', nextMatch ? 'Found' : 'Not found');
    if (!nextMatch && nextRoundMatches.length > 0) {
      // Check if it's a type mismatch issue
      const player1 = nextRoundMatches[0].player1;
      const player2 = nextRoundMatches[0].player2;
      console.log('🔍 Type comparison check:');
      console.log('  User ID:', resolvedUserId, 'Type:', typeof resolvedUserId);
      console.log('  Match player1 IDs:', player1?.id, '/', player1?.externalId);
      console.log('  Match player2 IDs:', player2?.id, '/', player2?.externalId);
      console.log('  Player1 matches user:', this.doesPlayerMatchUser(player1, resolvedUserId));
      console.log('  Player2 matches user:', this.doesPlayerMatchUser(player2, resolvedUserId));
    }

    if (nextMatch) {
      console.log('✅ Found next match with user already assigned:', {
        matchId: nextMatch.id,
        player1: nextMatch.player1?.name,
        player2: nextMatch.player2?.name
      });
    } else {
      console.log('⚠️ User not found in any next round match');
      
      // Check if there are any active/pending matches in next round
      const activeNextRound = this.data.matches.find(m =>
        m.round === nextRound && 
        (m.isActive || !m.isComplete) &&
        m.player1 && m.player2
      );
      
      if (activeNextRound) {
        console.log('ℹ️ Found active match in next round (but user not assigned):', {
          matchId: activeNextRound.id,
          player1: activeNextRound.player1?.name,
          player2: activeNextRound.player2?.name
        });
      }
    }

    return nextMatch || null;
  }

  private showTournamentProgression() {
    // Dispatch event to show full tournament bracket
    const event = new CustomEvent('showTournamentBracket', {
      detail: {
        tournamentId: this.data.tournamentId,
        action: 'progression'
      }
    });
    window.dispatchEvent(event);
  }

  // Method to generate initial bracket from player list
  public static generateInitialBracket(
    tournamentId: string, 
    size: 4 | 8 | 16, 
    players: TournamentPlayer[], 
    createdBy: string,
    name: string = 'Tournament',
    isPublic: boolean = true,
    allowSpectators: boolean = true
  ): TournamentBracketData {
    const matches: TournamentMatch[] = [];
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5); // Shuffle for random bracket
    
    // Generate first round matches
    const firstRoundMatches = size / 2;
    for (let i = 0; i < firstRoundMatches; i++) {
      const player1 = shuffledPlayers[i * 2];
      const player2 = shuffledPlayers[i * 2 + 1];
      
      matches.push({
        id: `round1-match${i}`,
        round: 1,
        matchIndex: i,
        player1,
        player2,
        isComplete: false,
        isActive: i === 0, // First match is active initially
      });
    }
    
    // Generate subsequent rounds (empty for now)
    const totalRounds = size === 16 ? 4 : size === 8 ? 3 : 2;
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: `round${round}-match${i}`,
          round,
          matchIndex: i,
          isComplete: false,
          isActive: false,
        });
      }
    }
    
    return {
      tournamentId,
      name,
      size,
      players: shuffledPlayers,
      matches,
      currentRound: 1,
      isComplete: false,
      createdAt: new Date(),
      status: 'waiting',
      createdBy,
      isPublic,
      allowSpectators,
    };
  }
}

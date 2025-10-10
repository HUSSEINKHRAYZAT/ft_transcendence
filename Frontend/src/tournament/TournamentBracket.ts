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
    
    return `
      <div class="bracket-container">
        <div class="bracket-header">
          <h2 class="tournament-title">🏆 Tournament Bracket (${this.data.size} Players)</h2>
          <div class="tournament-status">
            ${this.data.isComplete
              ? `<span class="status-complete">✅ Tournament Complete - Winner: ${this.data.winner?.name || 'TBD'}</span>`
              : `<span class="status-active">⚡ Round ${this.data.currentRound} in progress - Live for all players</span>`
            }
          </div>
          <div class="bracket-info">
            <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">
              📺 All players can view the tournament brackets in real-time
            </p>
          </div>
        </div>
        
        <div class="bracket-rounds">
          ${rounds.map((round, index) => this.generateRoundHTML(round, index)).join('')}
        </div>
      </div>
      
      <style>
        .tournament-bracket {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 16px;
          padding: 24px;
          color: white;
          max-width: 1200px;
          margin: 0 auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        .bracket-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .tournament-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 12px 0;
          background: linear-gradient(135deg, #84cc16, #65a30d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .tournament-status {
          font-size: 16px;
          font-weight: 600;
        }
        
        .status-complete {
          color: #10b981;
        }
        
        .status-active {
          color: #f59e0b;
        }
        
        .bracket-rounds {
          display: flex;
          justify-content: space-between;
          gap: 32px;
          overflow-x: auto;
          padding: 16px 0;
        }
        
        .bracket-round {
          flex: 1;
          min-width: 220px;
        }
        
        .round-header {
          text-align: center;
          margin-bottom: 20px;
          padding: 12px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
        }
        
        .round-matches {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .match-card {
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .match-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
          border-color: rgba(132, 204, 22, 0.5);
        }
        
        .match-card.completed {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }
        
        .match-card.active {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          animation: pulse 2s infinite;
        }

        .match-card.waiting {
          border-color: rgba(148, 163, 184, 0.4);
          background: rgba(148, 163, 184, 0.12);
        }
        
        @keyframes pulse {
          0%, 100% { border-color: #f59e0b; }
          50% { border-color: #fbbf24; }
        }
        
        .match-header {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 12px;
          text-align: center;
          font-weight: 600;
        }
        
        .match-players {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .player {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(0,0,0,0.2);
          font-weight: 600;
        }
        
        .player.winner {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        
        .player.loser {
          opacity: 0.6;
          text-decoration: line-through;
        }
        
        .player.current-user {
          border: 2px solid #84cc16;
          background: rgba(132, 204, 22, 0.15);
          box-shadow: 0 0 12px rgba(132, 204, 22, 0.3);
          font-weight: 700;
        }
        
        .player.current-user.winner {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.25);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
        }
        
        .player-name {
          flex: 1;
        }
        
        .player-score {
          font-weight: 800;
          font-size: 18px;
        }
        
        .player-status {
          font-size: 10px;
          color: #64748b;
        }
        
        .tbd-player {
          color: #64748b;
          font-style: italic;
        }
        
        .match-vs {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          margin: 4px 0;
          font-weight: 600;
        }
        
        .connection-lines {
          position: absolute;
          top: 50%;
          right: -16px;
          width: 32px;
          height: 2px;
          background: rgba(255,255,255,0.2);
          transform: translateY(-50%);
        }
        
        .connection-lines::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          width: 8px;
          height: 8px;
          background: rgba(255,255,255,0.3);
          border-radius: 50%;
          transform: translate(50%, -50%);
        }
        .connection-lines::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          width: 8px;
          height: 8px;
          background: rgba(255,255,255,0.3);
          border-radius: 50%;
          transform: translate(50%, -50%);
        }
        
        .match-actions {
          margin-top: 12px;
          text-align: center;
        }
        
        .btn-start-match {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-start-match:hover {
          background: linear-gradient(135deg, #65a30d, #4d7c0f);
          transform: translateY(-1px);
        }

        .winner-info {
          margin-bottom: 8px;
          text-align: center;
        }

        .winner-text {
          font-size: 12px;
          color: #10b981;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          animation: celebrate 2s ease-in-out infinite;
        }

        @keyframes celebrate {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* Match Status Badges */
        .match-status {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          margin-left: 8px;
        }

        .match-status.completed {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .match-status.active {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          animation: pulse 2s infinite;
        }

        .match-status.user-ready {
          background: rgba(132, 204, 22, 0.2);
          color: #84cc16;
          animation: pulse 2s infinite;
        }

        .match-status.ready {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .match-status.waiting {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }

        /* User Match Highlighting */
        .match-card.user-match {
          border: 2px solid #84cc16;
          box-shadow: 0 0 20px rgba(132, 204, 22, 0.3);
        }

        .match-card.user-match.pending {
          animation: glow 3s ease-in-out infinite;
        }

        /* Auto-start Info */
        .auto-start-info {
          text-align: center;
          margin-bottom: 8px;
        }

        .auto-start-text {
          font-size: 11px;
          color: #84cc16;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(132, 204, 22, 0.3); }
          50% { box-shadow: 0 0 30px rgba(132, 204, 22, 0.6); }
        }
      </style>
    `;
  }

  private getRounds(): TournamentMatch[][] {
    const rounds: TournamentMatch[][] = [];
    const maxRound = this.data.size === 16 ? 4 : this.data.size === 8 ? 3 : 2; // 16 players = 4 rounds, 8 players = 3 rounds, 4 players = 2 rounds
    
    for (let round = 1; round <= maxRound; round++) {
      const roundMatches = this.data.matches.filter(match => match.round === round);
      rounds.push(roundMatches);
    }
    
    return rounds;
  }

  private generateRoundHTML(matches: TournamentMatch[], roundIndex: number): string {
    const roundNames = this.data.size === 16 
      ? ['Round of 16', 'Quarterfinals', 'Semifinals', 'Final']
      : this.data.size === 8
      ? ['Quarterfinals', 'Semifinals', 'Final']
      : ['Semifinals', 'Final']; // For 4 players
    
    // Enhanced round visuals with emojis and colors
    const roundEmojis = ['🎮', '⚔️', '🏅', '🏆'];
    const roundColors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
    const roundEmoji = roundEmojis[roundIndex] || '🎯';
    const roundColor = roundColors[roundIndex] || '#84cc16';
    
    const roundName = roundNames[roundIndex] || `Round ${roundIndex + 1}`;
    
    return `
      <div class="bracket-round">
        <div class="round-header" style="background: linear-gradient(135deg, ${roundColor}22, ${roundColor}11); border: 2px solid ${roundColor}44; box-shadow: 0 0 20px ${roundColor}22;">
          <div style="font-size: 24px; margin-bottom: 4px;">${roundEmoji}</div>
          <div style="color: ${roundColor}; text-shadow: 0 0 10px ${roundColor}88;">${roundName}</div>
          <div style="font-size: 11px; color: ${roundColor}99; margin-top: 2px;">
            ${matches.length} ${matches.length === 1 ? 'match' : 'matches'}
          </div>
        </div>
        <div class="round-matches">
          ${matches.map(match => this.generateMatchHTML(match)).join('')}
        </div>
      </div>
    `;
  }

  private generateMatchHTML(match: TournamentMatch): string {
    const currentUser = this.getCurrentUser();
    const resolvedUserId = this.resolveUserIdFromRecord(currentUser) || this.currentUserId;

    if (!this.currentUserId && resolvedUserId) {
      this.currentUserId = resolvedUserId;
    }

    const isUserInMatch: boolean = this.doesPlayerMatchUser(match.player1, resolvedUserId) || this.doesPlayerMatchUser(match.player2, resolvedUserId);

    const isActive: boolean = match.isActive && !match.isComplete;
    const isPending: boolean = !match.isComplete && !!match.player1 && !!match.player2 && !isActive;
    const hasPlayer1 = Boolean(match.player1);
    const hasPlayer2 = Boolean(match.player2);
    const waitingForOpponent = !match.isComplete && (Boolean(match.waitingForOpponent) || (hasPlayer1 !== hasPlayer2));

    const cardClassParts: string[] = [];
    if (match.isComplete) {
      cardClassParts.push('completed');
    } else if (isActive) {
      cardClassParts.push('active');
    } else if (isPending) {
      cardClassParts.push('pending');
    }

    if (waitingForOpponent) {
      cardClassParts.push('waiting');
    }

    if (isUserInMatch) {
      cardClassParts.push('user-match');
    }

    const cardClass = cardClassParts.join(' ');

    return `
      <div class="match-card ${cardClass}" data-match-id="${match.id}">
        <div class="match-header">
          Match ${match.matchIndex + 1}
          ${this.getMatchStatusBadge(match, isUserInMatch, waitingForOpponent)}
        </div>
        <div class="match-players">
          ${this.generatePlayerHTML(match.player1, match.score1, match.winner)}
          <div class="match-vs">VS</div>
          ${this.generatePlayerHTML(match.player2, match.score2, match.winner)}
        </div>
        ${this.getMatchActionsHTML(match, isActive, isPending, isUserInMatch)}
        ${!match.isComplete && match.round < this.getRounds().length ? '<div class="connection-lines"></div>' : ''}
      </div>
    `;
  }

  private getMatchStatusBadge(match: TournamentMatch, isUserInMatch: boolean, waitingForOpponent: boolean): string {
    if (match.isComplete) {
      return '<span class="match-status completed">✅ Complete</span>';
    }
    if (match.isActive) {
      return '<span class="match-status active">🎮 Playing</span>';
    }
    if (waitingForOpponent) {
      if (isUserInMatch) {
        return '<span class="match-status waiting">⌛ Waiting for opponent</span>';
      }
      return '<span class="match-status waiting">⌛ Opponent pending</span>';
    }
    if (match.player1 && match.player2) {
      if (isUserInMatch) {
        return '<span class="match-status user-ready">🚀 Your Turn</span>';
      }
      return '<span class="match-status ready">⏳ Ready</span>';
    }
    return '<span class="match-status waiting">⌛ Waiting</span>';
  }

  private getMatchActionsHTML(match: TournamentMatch, isActive: boolean, isPending: boolean, isUserInMatch: boolean): string {
    const hasPlayer1 = Boolean(match.player1);
    const hasPlayer2 = Boolean(match.player2);
    const waitingForOpponent = !match.isComplete && (Boolean(match.waitingForOpponent) || (hasPlayer1 !== hasPlayer2));
    const currentUser = this.getCurrentUser();
    const resolvedUserId = this.resolveUserIdFromRecord(currentUser) || this.currentUserId;

    if (match.isComplete) {
      // No button for completed matches - auto-polling will handle advancement
      if (resolvedUserId && this.doesPlayerMatchUser(match.winner, resolvedUserId)) {
        return `
          <div class="match-actions">
            <div class="winner-info">
              <span class="winner-text">🏆 You won this match!</span>
            </div>
            <div style="color: #64748b; font-size: 12px; margin-top: 8px;">
              Waiting for next round to begin...
            </div>
          </div>
        `;
      }
      return '';
    }

    if (waitingForOpponent) {
      if (isUserInMatch) {
        return `
          <div class="match-actions">
            <div class="auto-start-info">
              <span class="auto-start-text">⌛ Waiting for your opponent to finish their match...</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="match-actions">
          <div class="auto-start-info">
            <span class="auto-start-text">⌛ Awaiting opponent assignment</span>
          </div>
        </div>
      `;
    }

    if (isActive && isUserInMatch) {
      const matchData = JSON.stringify(match).replace(/"/g, '&quot;');
      return `
        <div class="match-actions">
          <div class="auto-start-info">
            <span class="auto-start-text">🎮 Your match is ready!</span>
          </div>
          <button class="btn-start-match" onclick="this.dispatchEvent(new CustomEvent('tournamentMatchStartRequest', {bubbles: true, detail: {match: ${matchData}}}))">
            Start Match
          </button>
        </div>
      `;
    }

    if (isPending && isUserInMatch) {
      const matchData = JSON.stringify(match).replace(/"/g, '&quot;');
      return `
        <div class="match-actions">
          <div class="auto-start-info">
            <span class="auto-start-text">🚀 Your turn to play!</span>
          </div>
          <button class="btn-start-match" onclick="this.dispatchEvent(new CustomEvent('tournamentMatchStartRequest', {bubbles: true, detail: {match: ${matchData}}}))">
            Start Match
          </button>
        </div>
      `;
    }

    if (isPending) {
      const matchData = JSON.stringify(match).replace(/"/g, '&quot;');
      return `
        <div class="match-actions">
          <button class="btn-start-match" onclick="this.dispatchEvent(new CustomEvent('tournamentMatchStartRequest', {bubbles: true, detail: {match: ${matchData}}}))">
            Start Match
          </button>
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

  private generatePlayerHTML(player: TournamentPlayer | undefined, score: number | undefined, winner: TournamentPlayer | undefined): string {
    if (!player) {
      return `
        <div class="player tbd-player">
          <span class="player-name">TBD</span>
          <span class="player-score">-</span>
        </div>
      `;
    }
    
    const isWinner = Boolean(winner && this.areSamePlayer(winner, player));
    const isLoser = Boolean(winner && !this.areSamePlayer(winner, player));
    const isCurrentUser = this.doesPlayerMatchUser(player, this.currentUserId);
    const playerClass = isWinner ? 'winner' : (isLoser ? 'loser' : '');
    const currentUserClass = isCurrentUser ? 'current-user' : '';
    const aiIcon = player.isAI ? '🤖 ' : '';
    const youBadge = isCurrentUser ? '<span style="margin-left: 6px; padding: 2px 8px; background: #84cc16; color: black; font-size: 10px; font-weight: bold; border-radius: 4px;">YOU</span>' : '';
    const offlineText = !player.isOnline && !player.isAI ? ' (offline)' : '';
    
    return `
      <div class="player ${playerClass} ${currentUserClass}">
        <span class="player-name">
          ${aiIcon}${player.name}${offlineText}${youBadge}
        </span>
        <span class="player-score">${score !== undefined ? score : '-'}</span>
      </div>
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

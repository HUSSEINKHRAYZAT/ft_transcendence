export interface TournamentPlayer {
  id: string;
  name: string;
  isOnline: boolean;
  isAI?: boolean;
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
          this.currentUserId = user.id || user.email;
        }
      }
      
      // Fallback to session storage
      if (!this.currentUserId) {
        const cachedUser = sessionStorage.getItem('ft_pong_current_user');
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            this.currentUserId = parsed.id;
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

    // Always show the bracket to all players - don't auto-start matches
    // The user must click the "Start Match" button to begin playing
    console.log('🏆 Tournament bracket displayed for all players');

    // Find active matches that include the current user for highlighting
    const activeMatch = this.data.matches.find(match =>
      match.isActive &&
      !match.isComplete &&
      ((match.player1?.id === this.currentUserId) || (match.player2?.id === this.currentUserId))
    );

    if (activeMatch) {
      console.log('🏆 Current user has an active match:', activeMatch);
      // Don't auto-start - just highlight the match for the user to manually start
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
      
      const currentPlayer = {
        id: currentUser.id || currentUser.email,
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

        .btn-continue-tournament {
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px rgba(22, 163, 74, 0.4);
        }

        .btn-continue-tournament:hover {
          background: linear-gradient(135deg, #15803d, #166534);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(22, 163, 74, 0.5);
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
    const isActive: boolean = match.isActive && !match.isComplete;
    const isPending: boolean = !match.isComplete && !!match.player1 && !!match.player2 && !isActive;
    const cardClass = match.isComplete ? 'completed' : (isActive ? 'active' : (isPending ? 'pending' : ''));

    // Check if current user is in this match
    const currentUser = this.getCurrentUser();
    const isUserInMatch: boolean = !!(currentUser && (match.player1?.id === currentUser.id || match.player2?.id === currentUser.id));

    return `
      <div class="match-card ${cardClass} ${isUserInMatch ? 'user-match' : ''}" data-match-id="${match.id}">
        <div class="match-header">
          Match ${match.matchIndex + 1}
          ${this.getMatchStatusBadge(match, isUserInMatch)}
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

  private getMatchStatusBadge(match: TournamentMatch, isUserInMatch: boolean): string {
    if (match.isComplete) {
      return '<span class="match-status completed">✅ Complete</span>';
    }
    if (match.isActive) {
      return '<span class="match-status active">🎮 Playing</span>';
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
    if (match.isComplete) {
      // Show continue button for winners of completed matches
      const currentUser = this.getCurrentUser();
      if (currentUser && match.winner?.id === currentUser.id) {
        const matchData = JSON.stringify(match).replace(/"/g, '&quot;');
        return `
          <div class="match-actions">
            <div class="winner-info">
              <span class="winner-text">🏆 You won this match!</span>
            </div>
            <button class="btn-continue-tournament" onclick="this.dispatchEvent(new CustomEvent('tournamentContinueRequest', {bubbles: true, detail: {match: ${matchData}}}))">
              🚀 Continue to Next Round
            </button>
          </div>
        `;
      }
      return '';
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
    
    const isWinner = winner && winner.id === player.id;
    const isLoser = winner && winner.id !== player.id;
    const isCurrentUser = this.currentUserId && player.id === this.currentUserId;
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

    // Listen for tournament continue requests
    this.container.addEventListener('tournamentContinueRequest', (e: any) => {
      this.handleContinueRequest(e.detail.match);
    });
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

  private async handleContinueRequest(match: TournamentMatch) {
    // ✅ DEBOUNCE: Prevent multiple clicks within 2 seconds
    const now = Date.now();
    const timeSinceLastClick = now - this.lastContinueClickTime;
    
    if (timeSinceLastClick < 2000) {
      console.log('⚠️ Continue button clicked too soon - ignoring (debounced)');
      console.log(`   Time since last click: ${timeSinceLastClick}ms`);
      return;
    }
    
    this.lastContinueClickTime = now;
    
    console.log('🏆 Continue tournament requested for match:', match);
    console.log('🔄 Fetching fresh tournament data to find next match...');

    try {
      // CRITICAL FIX: Fetch fresh tournament data
      // The match parameter may contain stale data from before round advancement
      const { tournamentService } = await import('./TournamentService');
      const freshTournament = await tournamentService.getTournament(this.data.tournamentId);
      
      console.log('✅ Fresh tournament data fetched');

      // Update internal data with fresh state
      this.data = freshTournament;

      // Find next match with fresh data
      const nextMatch = this.findNextMatchForWinner(match);

      if (nextMatch) {
        console.log('🏆 Found next match:', {
          matchId: nextMatch.id,
          round: nextMatch.round,
          player1: nextMatch.player1?.name,
          player2: nextMatch.player2?.name,
          isActive: nextMatch.isActive,
          isComplete: nextMatch.isComplete
        });

        if (nextMatch.isActive && !nextMatch.isComplete) {
          // Next match is ready, start it immediately
          this.emitMatchStartRequest(nextMatch);
        } else if (!nextMatch.isComplete) {
          // Match exists but not active yet - show bracket and wait
          console.log('⏳ Next match found but not active yet:', {
            matchId: nextMatch.id,
            round: nextMatch.round,
            status: nextMatch.isActive ? 'active' : 'pending'
          });
          this.showTournamentProgression();
        } else {
          // Show the bracket to let user see progression
          this.showTournamentProgression();
        }
      } else {
        console.log('🏆 No next match found - checking if tournament complete...');
        
        // Check if tournament is actually complete
        if (this.data.isComplete) {
          console.log('🏆 Tournament is complete!');
        } else {
          console.log('⏳ Tournament not complete - waiting for other matches');
          console.log('📊 Tournament status:', {
            status: this.data.status,
            currentRound: this.data.currentRound,
            isComplete: this.data.isComplete
          });
          
          // ✅ START AUTOMATIC POLLING for next match
          console.log('🔄 Starting automatic polling for next match availability...');
          this.startAutoMatchPolling(match.round + 1);
        }
        
        this.showTournamentProgression();
      }
    } catch (error) {
      console.error('❌ Error fetching fresh tournament data:', error);
      // Fallback to showing bracket
      this.showTournamentProgression();
    }
  }

  private pollingInterval: number | null = null;
  private isPolling: boolean = false; // NEW: Flag to prevent duplicate polling
  private lastContinueClickTime: number = 0; // NEW: Track last button click time

  private startAutoMatchPolling(targetRound: number) {
    // ✅ CRITICAL FIX: Check if already polling to prevent duplicates
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
    if (!currentUser) {
      console.log('❌ Cannot start polling - no current user');
      return;
    }

    console.log('🎯 Auto-polling started: checking for match in Round', targetRound, 'for user', currentUser.id);
    
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
        const allPreviousRoundComplete = previousRoundMatches.every(m => m.isComplete);

        if (!allPreviousRoundComplete) {
          const completedCount = previousRoundMatches.filter(m => m.isComplete).length;
          console.log(`⏳ Auto-polling #${pollCount}: Waiting for all Round ${previousRound} matches to complete... (${completedCount}/${previousRoundMatches.length} complete)`);
          return; // Continue polling, don't look for next match yet
        }

        console.log(`✅ Auto-polling #${pollCount}: All Round ${previousRound} matches complete! Looking for Round ${targetRound} match...`);

        // Look for ANY match where current user is assigned (not just target round)
        // This handles cases where backend already advanced to next round
        const allMatchesWithUser = freshTournament.matches.filter(m =>
          (m.player1?.id === currentUser.id || m.player2?.id === currentUser.id) &&
          !m.isComplete
        );

        console.log(`🔍 Auto-polling #${pollCount}: Found ${allMatchesWithUser.length} incomplete matches with user`);
        
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

          console.log('🚀 Auto-starting next match...');
          
          // Stop polling
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          this.isPolling = false; // Clear polling flag

          // Start the match!
          this.emitMatchStartRequest(nextMatch);
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
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      console.log('❌ No current user found');
      return null;
    }

    console.log('🔍 Looking for next match:', {
      currentRound: completedMatch.round,
      nextRound,
      userId: currentUser.id,
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

    console.log('🔑 Searching for user ID:', currentUser.id, '(type:', typeof currentUser.id + ')');

    // Look for matches in the next round where the current user is a participant
    // OR matches that are active/pending (user might be assigned)
    const nextMatch = this.data.matches.find(match =>
      match.round === nextRound &&
      (match.player1?.id === currentUser.id || match.player2?.id === currentUser.id)
    );

    console.log('🎯 Match search result:', nextMatch ? 'Found' : 'Not found');
    if (!nextMatch && nextRoundMatches.length > 0) {
      // Check if it's a type mismatch issue
      const player1Id = nextRoundMatches[0].player1?.id;
      const player2Id = nextRoundMatches[0].player2?.id;
      console.log('🔍 Type comparison check:');
      console.log('  User ID:', currentUser.id, 'Type:', typeof currentUser.id);
      console.log('  Match player1 ID:', player1Id, 'Type:', typeof player1Id);
      console.log('  Match player2 ID:', player2Id, 'Type:', typeof player2Id);
      console.log('  Loose equality player1:', player1Id == currentUser.id);
      console.log('  Loose equality player2:', player2Id == currentUser.id);
      console.log('  Strict equality player1:', player1Id === currentUser.id);
      console.log('  Strict equality player2:', player2Id === currentUser.id);
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

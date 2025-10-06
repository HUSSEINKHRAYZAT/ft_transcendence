export interface TournamentPlayer {
  id: string;
  name: string;
  isOnline: boolean;
  isAI?: boolean;
  avatar?: string;
  aiLevel?: 'easy' | 'medium' | 'hard';
  aiType?: 'tournament' | 'practice';
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

export class TournamentBracketNew {
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

  private resolveCurrentUser(): void {
    try {
      const authService = (window as any).authService;
      if (authService && authService.getUser) {
        const user = authService.getUser();
        if (user) {
          this.currentUserId = user.id || user.email;
        }
      }

      if (!this.currentUserId) {
        const cachedUser = sessionStorage.getItem('ft_pong_current_user');
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            this.currentUserId = parsed.id;
          } catch (e) {
            // Ignore
          }
        }
      }
    } catch (error) {
      console.warn('Failed to resolve current user:', error);
    }
  }

  private render() {
    this.container.innerHTML = this.generateBracketHTML();
    this.addEventListeners();
  }

  private generateBracketHTML(): string {
    const rounds = this.getRounds();
    const totalRounds = rounds.length;

    return `
      <div class="bracket-container-new">
        <div class="bracket-header-new">
          <h2 class="tournament-title-new">🏆 ${this.data.name}</h2>
          <div class="tournament-subtitle">${this.data.size} Player Tournament</div>
        </div>

        <div class="bracket-grid">
          ${this.generateHorizontalBracket(rounds, totalRounds)}
        </div>
      </div>

      ${this.generateStyles()}
    `;
  }

  private generateHorizontalBracket(rounds: TournamentMatch[][], totalRounds: number): string {
    // For a 4-player tournament: Semifinals (2 matches) → Final (1 match)
    // Layout: Left side matches → Center champion → Right side final match

    const semifinals = rounds[0] || [];
    const finals = rounds[1] || [];

    if (totalRounds === 2) {
      // 4-player tournament
      return this.generate4PlayerBracket(semifinals, finals);
    } else if (totalRounds === 3) {
      // 8-player tournament
      return this.generate8PlayerBracket(rounds);
    } else {
      // 16-player tournament
      return this.generate16PlayerBracket(rounds);
    }
  }

  private generate4PlayerBracket(semifinals: TournamentMatch[], finals: TournamentMatch[]): string {
    const match1 = semifinals[0];
    const match2 = semifinals[1];
    const finalMatch = finals[0];

    return `
      <div class="bracket-4player">
        <!-- Left Semifinals -->
        <div class="semifinals-left">
          ${this.generateMatchCard(match1, 'top')}
          ${this.generateMatchCard(match2, 'bottom')}
        </div>

        <!-- Connecting Lines to Final -->
        <div class="connector-lines">
          <svg class="bracket-svg" viewBox="0 0 100 200" preserveAspectRatio="none">
            <!-- Top semifinal to final -->
            <path d="M 0 25 L 50 25 L 50 100 L 100 100"
                  stroke="rgba(132, 204, 22, 0.4)"
                  stroke-width="2"
                  fill="none"/>
            <!-- Bottom semifinal to final -->
            <path d="M 0 175 L 50 175 L 50 100 L 100 100"
                  stroke="rgba(132, 204, 22, 0.4)"
                  stroke-width="2"
                  fill="none"/>
          </svg>
        </div>

        <!-- Champion Trophy (Center) -->
        <div class="champion-section">
          <div class="trophy-icon">🏆</div>
          <div class="champion-label">CHAMPION</div>
          ${finalMatch?.winner ? `
            <div class="champion-name">${finalMatch.winner.name}</div>
          ` : ''}
        </div>

        <!-- Connecting Lines from Final -->
        <div class="connector-lines">
          <svg class="bracket-svg" viewBox="0 0 100 200" preserveAspectRatio="none">
            <path d="M 0 100 L 100 100"
                  stroke="rgba(132, 204, 22, 0.4)"
                  stroke-width="2"
                  fill="none"/>
          </svg>
        </div>

        <!-- Right Final Match -->
        <div class="final-right">
          ${this.generateMatchCard(finalMatch, 'middle')}
        </div>
      </div>
    `;
  }

  private generate8PlayerBracket(rounds: TournamentMatch[][]): string {
    // Quarterfinals → Semifinals → Final
    return `<div class="bracket-8player">8-player bracket (to be implemented)</div>`;
  }

  private generate16PlayerBracket(rounds: TournamentMatch[][]): string {
    // Round 1 → Quarterfinals → Semifinals → Final
    return `<div class="bracket-16player">16-player bracket (to be implemented)</div>`;
  }

  private generateMatchCard(match: TournamentMatch | undefined, position: 'top' | 'middle' | 'bottom'): string {
    if (!match) {
      return `<div class="match-card-new empty">
        <div class="match-label">TBD</div>
      </div>`;
    }

    const isComplete = match.isComplete;
    const isActive = match.isActive;
    const player1 = match.player1;
    const player2 = match.player2;
    const winner = match.winner;

    return `
      <div class="match-card-new ${isComplete ? 'completed' : ''} ${isActive ? 'active' : ''}" data-match-id="${match.id}">
        <div class="match-label">Match ${match.matchIndex + 1}</div>

        ${this.generatePlayerSlot(player1, match.score1, winner, 'player1')}
        ${this.generatePlayerSlot(player2, match.score2, winner, 'player2')}

        ${this.getMatchStatus(match)}
      </div>
    `;
  }

  private generatePlayerSlot(
    player: TournamentPlayer | undefined,
    score: number | undefined,
    winner: TournamentPlayer | undefined,
    slot: 'player1' | 'player2'
  ): string {
    if (!player) {
      return `
        <div class="player-slot empty">
          <div class="player-info">
            <div class="player-icon">⬡</div>
            <div class="player-details">
              <div class="player-name-text">PLAYER</div>
              <div class="player-status-text">Lorem Ipsum</div>
            </div>
          </div>
        </div>
      `;
    }

    const isWinner = winner && winner.id === player.id;
    const isLoser = winner && winner.id !== player.id;
    const isCurrentUser = this.currentUserId && player.id === this.currentUserId;

    return `
      <div class="player-slot ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''} ${isCurrentUser ? 'current-user' : ''}">
        <div class="player-info">
          <div class="player-icon ${slot}">${isWinner ? '🏆' : '⬡'}</div>
          <div class="player-details">
            <div class="player-name-text">${player.name.toUpperCase()}</div>
            <div class="player-status-text">Lorem Ipsum</div>
          </div>
        </div>
        ${score !== undefined ? `<div class="player-score-badge">${score}</div>` : ''}
      </div>
    `;
  }

  private getMatchStatus(match: TournamentMatch): string {
    if (match.isComplete) {
      return `<div class="match-status-badge complete">✓ Complete</div>`;
    }
    if (match.isActive) {
      return `<div class="match-status-badge active">● Playing</div>`;
    }
    if (match.player1 && match.player2) {
      return `<div class="match-status-badge ready">Ready</div>`;
    }
    return `<div class="match-status-badge waiting">Waiting...</div>`;
  }

  private generateStyles(): string {
    return `
      <style>
        .bracket-container-new {
          width: 100%;
          min-height: 400px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 40px 20px;
          overflow: hidden;
        }

        .bracket-header-new {
          text-align: center;
          margin-bottom: 40px;
        }

        .tournament-title-new {
          font-size: 36px;
          font-weight: 800;
          color: #84cc16;
          margin: 0 0 8px 0;
          text-shadow: 0 0 20px rgba(132, 204, 22, 0.5);
        }

        .tournament-subtitle {
          font-size: 16px;
          color: #94a3b8;
          font-weight: 600;
        }

        /* 4-Player Bracket Layout */
        .bracket-4player {
          display: grid;
          grid-template-columns: 1fr 80px 120px 80px 1fr;
          gap: 0;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .semifinals-left {
          display: flex;
          flex-direction: column;
          gap: 80px;
        }

        .final-right {
          display: flex;
          justify-content: center;
        }

        .champion-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .trophy-icon {
          font-size: 64px;
          margin-bottom: 8px;
          animation: trophy-glow 2s ease-in-out infinite;
        }

        @keyframes trophy-glow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)); }
        }

        .champion-label {
          font-size: 14px;
          font-weight: 700;
          color: #fbbf24;
          letter-spacing: 2px;
        }

        .champion-name {
          margin-top: 12px;
          font-size: 20px;
          font-weight: 800;
          color: #84cc16;
          text-align: center;
        }

        .connector-lines {
          position: relative;
          height: 300px;
        }

        .bracket-svg {
          width: 100%;
          height: 100%;
        }

        /* Match Card Styling (Matching Image) */
        .match-card-new {
          background: linear-gradient(135deg, #475569 0%, #64748b 100%);
          border: 2px solid transparent;
          border-radius: 0;
          position: relative;
          min-width: 250px;
          clip-path: polygon(0 0, calc(100% - 30px) 0, 100% 50%, calc(100% - 30px) 100%, 0 100%);
          transition: all 0.3s ease;
        }

        .match-card-new::after {
          content: '';
          position: absolute;
          right: -30px;
          top: 50%;
          transform: translateY(-50%);
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #3b5266 0%, #4a6178 100%);
          clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
        }

        .match-card-new.completed {
          background: linear-gradient(135deg, #065f46 0%, #059669 100%);
        }

        .match-card-new.active {
          background: linear-gradient(135deg, #92400e 0%, #c2410c 100%);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(234, 88, 12, 0.5); }
          50% { box-shadow: 0 0 25px rgba(234, 88, 12, 0.8); }
        }

        .match-label {
          padding: 8px 16px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .player-slot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .player-slot:last-of-type {
          border-bottom: none;
        }

        .player-slot.winner {
          background: rgba(16, 185, 129, 0.15);
        }

        .player-slot.loser {
          opacity: 0.5;
        }

        .player-slot.current-user {
          background: rgba(132, 204, 22, 0.15);
          border-left: 3px solid #84cc16;
        }

        .player-slot.empty .player-name-text {
          color: rgba(255, 255, 255, 0.3);
        }

        .player-slot.empty .player-status-text {
          color: rgba(255, 255, 255, 0.2);
          font-size: 9px;
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .player-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b5266 0%, #4a6178 100%);
          clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .player-details {
          flex: 1;
        }

        .player-name-text {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          letter-spacing: 0.5px;
        }

        .player-status-text {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .player-score-badge {
          font-size: 20px;
          font-weight: 800;
          color: #84cc16;
          min-width: 30px;
          text-align: right;
        }

        .match-status-badge {
          padding: 4px 12px;
          font-size: 10px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .match-status-badge.complete {
          color: #10b981;
        }

        .match-status-badge.active {
          color: #f59e0b;
        }

        .match-status-badge.ready {
          color: #3b82f6;
        }

        .match-status-badge.waiting {
          color: #64748b;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .bracket-4player {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .connector-lines {
            display: none;
          }

          .semifinals-left {
            gap: 20px;
          }
        }
      </style>
    `;
  }

  private getRounds(): TournamentMatch[][] {
    const roundsMap: Map<number, TournamentMatch[]> = new Map();

    for (const match of this.data.matches) {
      if (!roundsMap.has(match.round)) {
        roundsMap.set(match.round, []);
      }
      roundsMap.get(match.round)!.push(match);
    }

    const rounds: TournamentMatch[][] = [];
    const sortedRounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);

    for (const roundNum of sortedRounds) {
      const matches = roundsMap.get(roundNum)!;
      matches.sort((a, b) => a.matchIndex - b.matchIndex);
      rounds.push(matches);
    }

    return rounds;
  }

  private addEventListeners() {
    // Add any interactive event listeners here
  }
}

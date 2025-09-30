export interface TournamentPlayer {
  id: string;
  name: string;
  isOnline: boolean;
  isAI?: boolean;
  avatar?: string;
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

  constructor(container: HTMLElement, data: TournamentBracketData) {
    this.container = container;
    this.data = data;
    this.render();
  }

  public updateData(data: TournamentBracketData) {
    this.data = data;
    this.render();
  }

  private render() {
    this.container.innerHTML = '';
    
    const bracketDiv = document.createElement('div');
    bracketDiv.className = 'tournament-bracket';
    bracketDiv.innerHTML = this.generateBracketHTML();
    
    this.container.appendChild(bracketDiv);
    this.addEventListeners();
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
              : `<span class="status-active">⚡ Round ${this.data.currentRound} in progress</span>`
            }
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
    
    const roundName = roundNames[roundIndex] || `Round ${roundIndex + 1}`;
    
    return `
      <div class="bracket-round">
        <div class="round-header">${roundName}</div>
        <div class="round-matches">
          ${matches.map(match => this.generateMatchHTML(match)).join('')}
        </div>
      </div>
    `;
  }

  private generateMatchHTML(match: TournamentMatch): string {
    const isActive = match.isActive && !match.isComplete;
    const cardClass = match.isComplete ? 'completed' : (isActive ? 'active' : '');
    
    return `
      <div class="match-card ${cardClass}" data-match-id="${match.id}">
        <div class="match-header">Match ${match.matchIndex + 1}</div>
        <div class="match-players">
          ${this.generatePlayerHTML(match.player1, match.score1, match.winner)}
          <div class="match-vs">VS</div>
          ${this.generatePlayerHTML(match.player2, match.score2, match.winner)}
        </div>
        ${isActive ? '<div class="match-actions"><button class="btn-start-match">Start Match</button></div>' : ''}
        ${!match.isComplete && match.round < this.getRounds().length ? '<div class="connection-lines"></div>' : ''}
      </div>
    `;
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
    const playerClass = isWinner ? 'winner' : (isLoser ? 'loser' : '');
    const aiIcon = player.isAI ? '🤖 ' : '';
    const offlineText = !player.isOnline && !player.isAI ? ' (offline)' : '';
    
    return `
      <div class="player ${playerClass}">
        <span class="player-name">
          ${aiIcon}${player.name}${offlineText}
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

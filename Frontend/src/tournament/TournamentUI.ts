import { TournamentBracket, TournamentBracketData } from './TournamentBracket';
import { TournamentService, tournamentService, TournamentListItem, CreateTournamentRequest } from './TournamentService';

export class TournamentUI {
  private container: HTMLElement;
  private currentView: 'list' | 'create' | 'bracket' | 'spectate' = 'list';
  private currentTournament: TournamentBracketData | null = null;
  private bracketComponent: TournamentBracket | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initializeService();
    this.setupEventListeners();
  }

  private async initializeService() {
    try {
      await tournamentService.connect();
      this.setupServiceEventListeners();
    } catch (error) {
      console.error('Failed to connect to tournament service:', error);
    }
  }

  private setupServiceEventListeners() {
    tournamentService.on('tournamentUpdated', (tournament: TournamentBracketData) => {
      if (this.currentTournament && this.currentTournament.tournamentId === tournament.tournamentId) {
        this.currentTournament = tournament;
        this.updateBracketView();
      }
    });

    tournamentService.on('matchStarted', (match: any) => {
      this.showNotification(`Match ${match.matchIndex + 1} has started!`, 'info');
    });

    tournamentService.on('matchCompleted', (match: any) => {
      this.showNotification(`Match completed! Winner: ${match.winner?.name}`, 'success');
    });

    tournamentService.on('playerJoined', (player: any) => {
      this.showNotification(`${player.name} joined the tournament!`, 'info');
    });
  }

  private setupEventListeners() {
    // Handle navigation
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('btn-create-tournament')) {
        this.showCreateTournamentView();
      } else if (target.classList.contains('btn-join-tournament')) {
        const tournamentId = target.dataset.tournamentId;
        if (tournamentId) {
          this.joinTournament(tournamentId);
        }
      } else if (target.classList.contains('btn-spectate-tournament')) {
        const tournamentId = target.dataset.tournamentId;
        if (tournamentId) {
          this.spectateTournament(tournamentId);
        }
      } else if (target.classList.contains('btn-back-to-list')) {
        this.showTournamentList();
      } else if (target.classList.contains('btn-start-tournament')) {
        const tournamentId = target.dataset.tournamentId;
        if (tournamentId) {
          this.startTournament(tournamentId);
        }
      } else if (target.classList.contains('btn-fill-ai')) {
        const tournamentId = target.dataset.tournamentId;
        if (tournamentId) {
          this.fillWithAI(tournamentId);
        }
      }
    });

    // Handle tournament match events
    window.addEventListener('tournamentMatchStartRequest', this.handleMatchStartRequest.bind(this));
    window.addEventListener('tournamentMatchViewRequest', this.handleMatchViewRequest.bind(this));
    window.addEventListener('tournamentMatchCompleted', this.handleMatchCompleted.bind(this));
    window.addEventListener('tournamentNextMatchReady', this.handleNextMatchReady.bind(this));
    window.addEventListener('tournamentCompleted', this.handleTournamentCompleted.bind(this));
  }

  public async show() {
    await this.showTournamentList();
  }

  private async showTournamentList() {
    this.currentView = 'list';
    
    try {
      const tournaments = await tournamentService.getTournaments();
      this.renderTournamentList(tournaments);
    } catch (error) {
      this.showError('Failed to load tournaments');
    }
  }

  private renderTournamentList(tournaments: TournamentListItem[]) {
    this.container.innerHTML = `
      <div class="tournament-list-container">
        <div class="tournament-header">
          <h1 class="tournament-title">🏆 Tournament Hub</h1>
          <button class="btn-create-tournament">Create Tournament</button>
        </div>
        
        <div class="tournament-filters">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="waiting">Waiting</button>
          <button class="filter-btn" data-filter="active">Active</button>
          <button class="filter-btn" data-filter="completed">Completed</button>
        </div>
        
        <div class="tournaments-grid">
          ${tournaments.length === 0 
            ? '<div class="empty-state">No tournaments available. Create one to get started!</div>'
            : tournaments.map(tournament => this.renderTournamentCard(tournament)).join('')
          }
        </div>
      </div>
      
      ${this.getTournamentListStyles()}
    `;
  }

  private renderTournamentCard(tournament: TournamentListItem): string {
    const statusIcon = tournament.status === 'waiting' ? '⏳' : 
                      tournament.status === 'active' ? '⚡' : '✅';
    const canJoin = tournament.status === 'waiting' && tournament.currentPlayers < tournament.size;
    const canSpectate = tournament.allowSpectators && tournament.status !== 'waiting';

    return `
      <div class="tournament-card" data-status="${tournament.status}">
        <div class="tournament-card-header">
          <h3 class="tournament-name">${tournament.name}</h3>
          <span class="tournament-status">${statusIcon} ${tournament.status}</span>
        </div>
        
        <div class="tournament-info">
          <div class="info-item">
            <span class="info-label">Size:</span>
            <span class="info-value">${tournament.size} players</span>
          </div>
          <div class="info-item">
            <span class="info-label">Players:</span>
            <span class="info-value">${tournament.currentPlayers}/${tournament.size}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Created by:</span>
            <span class="info-value">${tournament.createdBy}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Created:</span>
            <span class="info-value">${new Date(tournament.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div class="tournament-actions">
          ${canJoin ? `<button class="btn-join-tournament" data-tournament-id="${tournament.id}">Join Tournament</button>` : ''}
          ${canSpectate ? `<button class="btn-spectate-tournament" data-tournament-id="${tournament.id}">Spectate</button>` : ''}
          <button class="btn-view-tournament" data-tournament-id="${tournament.id}">View Details</button>
        </div>
      </div>
    `;
  }

  private showCreateTournamentView() {
    this.currentView = 'create';
    
    this.container.innerHTML = `
      <div class="create-tournament-container">
        <div class="create-header">
          <button class="btn-back-to-list">← Back to Tournaments</button>
          <h1 class="create-title">Create New Tournament</h1>
        </div>
        
        <form class="create-tournament-form" id="createTournamentForm">
          <div class="form-group">
            <label for="tournamentName">Tournament Name</label>
            <input type="text" id="tournamentName" placeholder="Enter tournament name" required>
          </div>
          
          <div class="form-group">
            <label>Tournament Size</label>
            <div class="size-options">
              <label class="size-option">
                <input type="radio" name="size" value="4" checked>
                <span class="size-card">
                  <span class="size-number">4</span>
                  <span class="size-label">Players</span>
                  <span class="size-desc">Quick tournament</span>
                </span>
              </label>
              <label class="size-option">
                <input type="radio" name="size" value="8">
                <span class="size-card">
                  <span class="size-number">8</span>
                  <span class="size-label">Players</span>
                  <span class="size-desc">Standard tournament</span>
                </span>
              </label>
              <label class="size-option">
                <input type="radio" name="size" value="16">
                <span class="size-card">
                  <span class="size-number">16</span>
                  <span class="size-label">Players</span>
                  <span class="size-desc">Epic tournament</span>
                </span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="isPublic" checked>
              <span class="checkmark"></span>
              Public Tournament (anyone can join)
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="allowSpectators" checked>
              <span class="checkmark"></span>
              Allow Spectators
            </label>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-create-submit">Create Tournament</button>
          </div>
        </form>
      </div>
      
      ${this.getCreateTournamentStyles()}
    `;

    this.setupCreateTournamentForm();
  }

  private setupCreateTournamentForm() {
    const form = document.getElementById('createTournamentForm') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const request: CreateTournamentRequest = {
        name: formData.get('tournamentName') as string,
        size: parseInt(formData.get('size') as string) as 4 | 8 | 16,
        isPublic: (document.getElementById('isPublic') as HTMLInputElement).checked,
        allowSpectators: (document.getElementById('allowSpectators') as HTMLInputElement).checked,
      };
      
      try {
        const tournament = await tournamentService.createTournament(request);
        this.showBracketView(tournament);
        this.showNotification('Tournament created successfully!', 'success');
      } catch (error) {
        this.showError('Failed to create tournament');
      }
    });
  }

  private async joinTournament(tournamentId: string) {
    try {
      // Get current user info (you'll need to implement this based on your auth system)
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        this.showError('Please log in to join tournaments');
        return;
      }

      const tournament = await tournamentService.joinTournament({
        tournamentId,
        playerId: currentUser.id,
        playerName: currentUser.name,
      });
      
      this.showBracketView(tournament);
      this.showNotification('Successfully joined tournament!', 'success');
    } catch (error) {
      this.showError('Failed to join tournament');
    }
  }

  private async spectateTournament(tournamentId: string) {
    try {
      const tournament = await tournamentService.getTournament(tournamentId);
      await tournamentService.joinAsSpectator(tournamentId);
      this.showBracketView(tournament, true);
      this.showNotification('Now spectating tournament', 'info');
    } catch (error) {
      this.showError('Failed to spectate tournament');
    }
  }

  private showBracketView(tournament: TournamentBracketData, isSpectator: boolean = false) {
    this.currentView = 'bracket';
    this.currentTournament = tournament;
    
    this.container.innerHTML = `
      <div class="bracket-view-container">
        <div class="bracket-header">
          <button class="btn-back-to-list">← Back to Tournaments</button>
          <div class="bracket-title">
            <h1>${tournament.tournamentId}</h1>
            ${isSpectator ? '<span class="spectator-badge">👀 Spectating</span>' : ''}
          </div>
          <div class="bracket-actions">
            ${this.canStartTournament(tournament) ? 
              `<button class="btn-start-tournament" data-tournament-id="${tournament.tournamentId}">Start Tournament</button>` : ''
            }
            ${this.canFillWithAI(tournament) ? 
              `<button class="btn-fill-ai" data-tournament-id="${tournament.tournamentId}">Fill with AI</button>` : ''
            }
          </div>
        </div>
        
        <div class="bracket-content" id="bracketContent"></div>
      </div>
      
      ${this.getBracketViewStyles()}
    `;

    this.bracketComponent = new TournamentBracket(
      document.getElementById('bracketContent')!,
      tournament
    );
  }

  private updateBracketView() {
    if (this.bracketComponent && this.currentTournament) {
      this.bracketComponent.updateData(this.currentTournament);
    }
  }

  private async startTournament(tournamentId: string) {
    try {
      const tournament = await tournamentService.startTournament(tournamentId);
      this.currentTournament = tournament;
      this.updateBracketView();
      this.showNotification('Tournament started!', 'success');
    } catch (error) {
      this.showError('Failed to start tournament');
    }
  }

  private async fillWithAI(tournamentId: string) {
    try {
      const tournament = await tournamentService.fillWithAI(tournamentId);
      this.currentTournament = tournament;
      this.updateBracketView();
      this.showNotification('AI players added to tournament', 'success');
    } catch (error) {
      this.showError('Failed to add AI players');
    }
  }

  private canStartTournament(tournament: TournamentBracketData): boolean {
    return TournamentService.canStartTournament(tournament);
  }

  private canFillWithAI(tournament: TournamentBracketData): boolean {
    return tournament.status === 'waiting' && tournament.players.length < tournament.size;
  }

  private getCurrentUser() {
    // This should integrate with your existing auth system
    // For now, returning a mock user
    return {
      id: 'current-user-id',
      name: 'Current User'
    };
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  private showError(message: string) {
    this.showNotification(message, 'error');
  }

  private getTournamentListStyles(): string {
    return `
      <style>
        .tournament-list-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .tournament-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        
        .tournament-title {
          font-size: 32px;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(135deg, #84cc16, #65a30d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .btn-create-tournament {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-create-tournament:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(132, 204, 22, 0.3);
        }
        
        .tournament-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .filter-btn {
          padding: 8px 16px;
          border: 2px solid rgba(132, 204, 22, 0.3);
          background: transparent;
          color: #84cc16;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-btn.active,
        .filter-btn:hover {
          background: #84cc16;
          color: white;
        }
        
        .tournaments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }
        
        .tournament-card {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }
        
        .tournament-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
          border-color: rgba(132, 204, 22, 0.5);
        }
        
        .tournament-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .tournament-name {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: white;
        }
        
        .tournament-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          background: rgba(132, 204, 22, 0.2);
          color: #84cc16;
        }
        
        .tournament-info {
          margin-bottom: 16px;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .info-label {
          color: #94a3b8;
          font-weight: 500;
        }
        
        .info-value {
          color: white;
          font-weight: 600;
        }
        
        .tournament-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .tournament-actions button {
          flex: 1;
          min-width: 80px;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-join-tournament {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
        }
        
        .btn-spectate-tournament {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }
        
        .btn-view-tournament {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .tournament-actions button:hover {
          transform: translateY(-1px);
        }
        
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px;
          color: #64748b;
          font-size: 16px;
        }
      </style>
    `;
  }

  private getCreateTournamentStyles(): string {
    return `
      <style>
        .create-tournament-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .create-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .btn-back-to-list {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-back-to-list:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .create-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          color: white;
        }
        
        .create-tournament-form {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 32px;
        }
        
        .form-group {
          margin-bottom: 24px;
        }
        
        .form-group label {
          display: block;
          color: white;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .form-group input[type="text"] {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 16px;
          transition: all 0.2s ease;
        }
        
        .form-group input[type="text"]:focus {
          outline: none;
          border-color: #84cc16;
        }
        
        .size-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        
        .size-option {
          cursor: pointer;
        }
        
        .size-option input[type="radio"] {
          display: none;
        }
        
        .size-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }
        
        .size-option input[type="radio"]:checked + .size-card {
          border-color: #84cc16;
          background: rgba(132, 204, 22, 0.1);
        }
        
        .size-number {
          font-size: 24px;
          font-weight: 800;
          color: white;
        }
        
        .size-label {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        
        .size-desc {
          font-size: 12px;
          color: #64748b;
        }
        
        .checkbox-label {
          display: flex !important;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        
        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        
        .btn-create-submit {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-create-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(132, 204, 22, 0.3);
        }
      </style>
    `;
  }

  private getBracketViewStyles(): string {
    return `
      <style>
        .bracket-view-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .bracket-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        
        .bracket-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .bracket-title h1 {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          color: white;
        }
        
        .spectator-badge {
          padding: 6px 12px;
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .bracket-actions {
          display: flex;
          gap: 12px;
        }
        
        .bracket-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-start-tournament {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
        }
        
        .btn-fill-ai {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }
        
        .bracket-actions button:hover {
          transform: translateY(-1px);
        }
        
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          z-index: 1000;
        }
        
        .notification.show {
          transform: translateX(0);
        }
        
        .notification-success {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .notification-error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        
        .notification-info {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        }
      </style>
    `;
  }

  // Tournament match event handlers
  private async handleMatchStartRequest(event: CustomEvent) {
    const { tournamentId, match } = event.detail;
    
    if (this.currentTournament?.tournamentId !== tournamentId) {
      return; // Not our tournament
    }

    try {
      // Dynamic import to avoid circular dependencies
      const { tournamentGameIntegration } = await import('./TournamentGameIntegration');
      
      const gameConfig = await tournamentGameIntegration.startTournamentMatch(
        tournamentId,
        match.id,
        async (winnerId: string, score1: number, score2: number) => {
          // This will be called when the game completes
          await tournamentGameIntegration.onTournamentGameComplete(score1, score2, winnerId);
          await tournamentGameIntegration.autoAdvanceTournament(tournamentId);
        }
      );

      if (gameConfig) {
        this.showNotification(`Starting match: ${match.player1?.name} vs ${match.player2?.name}`, 'info');
        
        // Here you would integrate with your existing game system
        // For example: startGame(gameConfig);
        console.log('Tournament game config:', gameConfig);
        
        // Show a modal or redirect to game
        this.showMatchStartModal(gameConfig);
      } else {
        this.showError('Failed to start tournament match');
      }
    } catch (error) {
      console.error('Error starting tournament match:', error);
      this.showError('Failed to start tournament match');
    }
  }

  private handleMatchViewRequest(event: CustomEvent) {
    const { tournamentId, match } = event.detail;
    this.showNotification(`Viewing active match: ${match.player1?.name} vs ${match.player2?.name}`, 'info');
    // Here you could show a spectator view or match details
  }

  private async handleMatchCompleted(event: CustomEvent) {
    const { tournamentId, matchId, winnerId, score1, score2 } = event.detail;
    
    if (this.currentTournament?.tournamentId === tournamentId) {
      // Refresh tournament data
      try {
        const updatedTournament = await tournamentService.getTournament(tournamentId);
        if (updatedTournament) {
          this.currentTournament = updatedTournament;
          this.updateBracketView();
        }
        
        const match = this.currentTournament?.matches.find(m => m.id === matchId);
        const winnerName = match?.winner?.name || 'Unknown';
        this.showNotification(`Match completed! ${winnerName} wins ${score1}-${score2}`, 'success');
      } catch (error) {
        console.error('Error refreshing tournament:', error);
      }
    }
  }

  private handleNextMatchReady(event: CustomEvent) {
    const { tournamentId, matchId } = event.detail;
    
    if (this.currentTournament?.tournamentId === tournamentId) {
      this.showNotification('Next match is ready to start!', 'info');
    }
  }

  private async handleTournamentCompleted(event: CustomEvent) {
    const { tournamentId, winnerId } = event.detail;
    
    if (this.currentTournament?.tournamentId === tournamentId) {
      try {
        const updatedTournament = await tournamentService.getTournament(tournamentId);
        if (updatedTournament) {
          this.currentTournament = updatedTournament;
          this.updateBracketView();
        }
        
        const winnerName = this.currentTournament?.winner?.name || 'Unknown';
        this.showNotification(`🏆 Tournament completed! Champion: ${winnerName}`, 'success');
        
        // Show celebration modal
        this.showTournamentCompletionModal(winnerName);
      } catch (error) {
        console.error('Error handling tournament completion:', error);
      }
    }
  }

  private showMatchStartModal(gameConfig: any) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>🎮 Tournament Match</h3>
        <p><strong>${gameConfig.displayNames[0]}</strong> vs <strong>${gameConfig.displayNames[1]}</strong></p>
        <p>First to ${gameConfig.winScore} points wins!</p>
        <div class="modal-actions">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-start-game">Start Game</button>
        </div>
      </div>
      
      <style>
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .modal-content {
          background: #1e293b;
          padding: 32px;
          border-radius: 16px;
          text-align: center;
          color: white;
          min-width: 400px;
        }
        
        .modal-actions {
          display: flex;
          gap: 16px;
          margin-top: 24px;
          justify-content: center;
        }
        
        .modal-actions button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-cancel {
          background: #64748b;
          color: white;
        }
        
        .btn-start-game {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
        }
        
        .modal-actions button:hover {
          transform: translateY(-2px);
        }
      </style>
    `;

    document.body.appendChild(modal);

    // Handle modal actions
    modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('.btn-start-game')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      // Here you would actually start the game with gameConfig
      console.log('Starting tournament game with config:', gameConfig);
      
      // Example integration point - you would call your game start function here
      // this.startGameWithConfig(gameConfig);
      
      this.showNotification('Game starting...', 'info');
    });
  }

  private showTournamentCompletionModal(winnerName: string) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content celebration">
        <div class="trophy">🏆</div>
        <h2>Tournament Champion!</h2>
        <p class="winner-name">${winnerName}</p>
        <p>Congratulations on winning the tournament!</p>
        <button class="btn-close">Close</button>
      </div>
      
      <style>
        .celebration {
          background: linear-gradient(135deg, #1e293b, #334155);
          border: 2px solid #84cc16;
        }
        
        .trophy {
          font-size: 64px;
          margin-bottom: 16px;
          animation: bounce 2s infinite;
        }
        
        .winner-name {
          font-size: 24px;
          font-weight: 800;
          color: #84cc16;
          margin: 16px 0;
        }
        
        .btn-close {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
          margin-top: 24px;
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
      </style>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.btn-close')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 10000);
  }

  public destroy() {
    tournamentService.disconnect();
  }
}

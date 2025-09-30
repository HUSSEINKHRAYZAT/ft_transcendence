import { TournamentBracketData, TournamentPlayer, TournamentMatch } from './TournamentBracket';

export interface CreateTournamentRequest {
  name: string;
  size: 4 | 8 | 16;
  isPublic: boolean;
  allowSpectators: boolean;
}

export interface JoinTournamentRequest {
  tournamentId: string;
  playerId: string;
  playerName: string;
}

export interface TournamentListItem {
  id: string;
  name: string;
  size: 4 | 8 | 16;
  currentPlayers: number;
  status: 'waiting' | 'active' | 'completed';
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  allowSpectators: boolean;
}

export class TournamentService {
  private baseUrl: string;
  private socket: WebSocket | null = null;
  private eventCallbacks: Map<string, Function[]> = new Map();
  
  // Client-side tournament storage for when backend is unavailable
  private clientTournaments: Map<string, TournamentBracketData> = new Map();
  private useClientSide: boolean = false;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || 'ws://localhost:3001';
    
    // Check if we should use client-side mode
    this.detectBackendAvailability();
  }

  private async detectBackendAvailability() {
    // For now, always use client-side mode since Docker containers use legacy schema
    this.useClientSide = true;
    console.log('🏆 Using client-side tournament system (backend containers use legacy schema)');
  }

  private generateTournamentId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private getCurrentUser() {
    // Try to get user from auth system
    const authState = (window as any).authService?.getState();
    if (authState?.user) {
      return {
        id: authState.user.id || 'user-' + Math.random().toString(36).substring(2, 8),
        name: authState.user.firstName || authState.user.userName || authState.user.email || 'Player'
      };
    }
    
    // Fallback to mock user
    return {
      id: 'user-' + Math.random().toString(36).substring(2, 8),
      name: 'Player'
    };
  }

  // Event system for real-time updates
  public on(event: string, callback: Function) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // WebSocket connection for real-time updates
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.baseUrl);
        
        this.socket.onopen = () => {
          console.log('Tournament service connected');
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing tournament message:', error);
          }
        };

        this.socket.onclose = () => {
          console.log('Tournament service disconnected');
          this.emit('disconnected', {});
        };

        this.socket.onerror = (error) => {
          console.error('Tournament service error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'tournament_updated':
        this.emit('tournamentUpdated', data.tournament);
        break;
      case 'match_started':
        this.emit('matchStarted', data.match);
        break;
      case 'match_completed':
        this.emit('matchCompleted', data.match);
        break;
      case 'player_joined':
        this.emit('playerJoined', data.player);
        break;
      case 'tournament_started':
        this.emit('tournamentStarted', data.tournament);
        break;
      default:
        console.log('Unknown tournament message type:', data.type);
    }
  }

  // Tournament CRUD operations
  public async createTournament(request: CreateTournamentRequest): Promise<TournamentBracketData> {
    if (this.useClientSide) {
      return this.createTournamentClientSide(request);
    }
    
    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.warn('Backend tournament creation failed, falling back to client-side');
        return this.createTournamentClientSide(request);
      }

      const tournament = await response.json();
      return tournament;
    } catch (error) {
      console.error('Error creating tournament via backend, using client-side:', error);
      return this.createTournamentClientSide(request);
    }
  }

  private createTournamentClientSide(request: CreateTournamentRequest): TournamentBracketData {
    const tournamentId = this.generateTournamentId();
    const currentUser = this.getCurrentUser();
    
    const tournament: TournamentBracketData = {
      tournamentId,
      name: request.name,
      size: request.size,
      players: [{
        id: currentUser.id,
        name: currentUser.name,
        isOnline: true,
        isAI: false
      }],
      matches: [],
      currentRound: 1,
      isComplete: false,
      createdAt: new Date(),
      status: 'waiting',
      createdBy: currentUser.id,
      isPublic: request.isPublic,
      allowSpectators: request.allowSpectators,
    };
    
    this.clientTournaments.set(tournamentId, tournament);
    this.emit('tournamentCreated', tournament);
    
    return tournament;
  }

  public async joinTournament(request: JoinTournamentRequest): Promise<TournamentBracketData> {
    if (this.useClientSide) {
      return this.joinTournamentClientSide(request);
    }
    
    try {
      const response = await fetch(`/api/tournaments/${request.tournamentId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: request.playerId,
          playerName: request.playerName,
        }),
      });

      if (!response.ok) {
        console.warn('Backend join failed, trying client-side');
        return this.joinTournamentClientSide(request);
      }

      const tournament = await response.json();
      return tournament;
    } catch (error) {
      console.error('Error joining tournament via backend, using client-side:', error);
      return this.joinTournamentClientSide(request);
    }
  }

  private joinTournamentClientSide(request: JoinTournamentRequest): TournamentBracketData {
    const tournament = this.clientTournaments.get(request.tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('Tournament has already started or completed');
    }

    if (tournament.players.length >= tournament.size) {
      throw new Error('Tournament is full');
    }

    // Check if player is already in tournament
    if (tournament.players.find(p => p.id === request.playerId)) {
      throw new Error('Player is already in this tournament');
    }

    tournament.players.push({
      id: request.playerId,
      name: request.playerName,
      isOnline: true,
      isAI: false
    });

    this.clientTournaments.set(request.tournamentId, tournament);
    this.emit('playerJoined', { tournament, playerId: request.playerId });
    
    return tournament;
  }

  public async getTournament(tournamentId: string): Promise<TournamentBracketData> {
    if (this.useClientSide) {
      const tournament = this.clientTournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }
      return tournament;
    }
    
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      
      if (!response.ok) {
        // Fallback to client-side
        const tournament = this.clientTournaments.get(tournamentId);
        if (tournament) {
          return tournament;
        }
        throw new Error(`Failed to get tournament: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Try client-side fallback
      const tournament = this.clientTournaments.get(tournamentId);
      if (tournament) {
        return tournament;
      }
      console.error('Error getting tournament:', error);
      throw error;
    }
  }

  public async getTournaments(): Promise<TournamentListItem[]> {
    if (this.useClientSide) {
      return Array.from(this.clientTournaments.values()).map(t => ({
        id: t.tournamentId,
        name: t.name,
        size: t.size,
        currentPlayers: t.players.length,
        status: t.status,
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        isPublic: t.isPublic,
        allowSpectators: t.allowSpectators,
      }));
    }
    
    try {
      const response = await fetch('/api/tournaments');
      
      if (!response.ok) {
        // Fallback to client-side tournaments
        return Array.from(this.clientTournaments.values()).map(t => ({
          id: t.tournamentId,
          name: t.name,
          size: t.size,
          currentPlayers: t.players.length,
          status: t.status,
          createdBy: t.createdBy,
          createdAt: t.createdAt,
          isPublic: t.isPublic,
          allowSpectators: t.allowSpectators,
        }));
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting tournaments, using client-side:', error);
      return Array.from(this.clientTournaments.values()).map(t => ({
        id: t.tournamentId,
        name: t.name,
        size: t.size,
        currentPlayers: t.players.length,
        status: t.status,
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        isPublic: t.isPublic,
        allowSpectators: t.allowSpectators,
      }));
    }
  }

  public async startTournament(tournamentId: string): Promise<TournamentBracketData> {
    if (this.useClientSide) {
      return this.startTournamentClientSide(tournamentId);
    }
    
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        console.warn('Backend start failed, trying client-side');
        return this.startTournamentClientSide(tournamentId);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting tournament via backend, using client-side:', error);
      return this.startTournamentClientSide(tournamentId);
    }
  }

  private startTournamentClientSide(tournamentId: string): TournamentBracketData {
    const tournament = this.clientTournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('Tournament has already started or completed');
    }

    if (tournament.players.length < 2) {
      throw new Error('Need at least 2 players to start tournament');
    }

    // Fill remaining slots with AI if needed
    if (tournament.players.length < tournament.size) {
      const slotsNeeded = tournament.size - tournament.players.length;
      const aiPlayers = this.generateAIPlayers(slotsNeeded);
      tournament.players.push(...aiPlayers);
    }

    // Generate bracket matches
    tournament.matches = this.generateMatches(tournament.tournamentId, tournament.size, tournament.players);
    tournament.status = 'active';
    
    this.clientTournaments.set(tournamentId, tournament);
    this.emit('tournamentStarted', tournament);
    
    return tournament;
  }

  private generateAIPlayers(count: number): TournamentPlayer[] {
    const aiNames = [
      'AlphaBot', 'BetaBot', 'GammaBot', 'DeltaBot',
      'EpsilonBot', 'ZetaBot', 'EtaBot', 'ThetaBot',
      'IotaBot', 'KappaBot', 'LambdaBot', 'MuBot',
      'NuBot', 'XiBot', 'OmicronBot', 'PiBot'
    ];

    return Array.from({ length: count }, (_, index) => ({
      id: `ai-bot-${index + 1}`,
      name: aiNames[index] || `Bot${index + 1}`,
      isOnline: true,
      isAI: true,
      avatar: '🤖',
    }));
  }

  private generateMatches(tournamentId: string, size: 4 | 8 | 16, players: TournamentPlayer[]): TournamentMatch[] {
    const matches: TournamentMatch[] = [];
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Generate first round matches
    const firstRoundMatches = size / 2;
    for (let i = 0; i < firstRoundMatches; i++) {
      const player1 = shuffledPlayers[i * 2];
      const player2 = shuffledPlayers[i * 2 + 1];
      
      matches.push({
        id: `${tournamentId}-round1-match${i}`,
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
          id: `${tournamentId}-round${round}-match${i}`,
          round,
          matchIndex: i,
          isComplete: false,
          isActive: false,
        });
      }
    }
    
    return matches;
  }

  public async startMatch(tournamentId: string, matchId: string): Promise<any> {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to start match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting match:', error);
      throw error;
    }
  }

  public async completeMatch(tournamentId: string, matchId: string, winnerId: string, score1: number, score2: number): Promise<TournamentBracketData> {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winnerId,
          score1,
          score2,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete match: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing match:', error);
      throw error;
    }
  }

  public async fillWithAI(tournamentId: string): Promise<TournamentBracketData> {
    if (this.useClientSide) {
      return this.fillWithAIClientSide(tournamentId);
    }
    
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/fill-ai`, {
        method: 'POST',
      });

      if (!response.ok) {
        console.warn('Backend fill-AI failed, trying client-side');
        return this.fillWithAIClientSide(tournamentId);
      }

      return await response.json();
    } catch (error) {
      console.error('Error filling with AI via backend, using client-side:', error);
      return this.fillWithAIClientSide(tournamentId);
    }
  }

  private fillWithAIClientSide(tournamentId: string): TournamentBracketData {
    const tournament = this.clientTournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('Tournament has already started or completed');
    }

    const slotsNeeded = tournament.size - tournament.players.length;
    if (slotsNeeded <= 0) {
      throw new Error('Tournament is already full');
    }

    const aiPlayers = this.generateAIPlayers(slotsNeeded);
    tournament.players.push(...aiPlayers);
    
    this.clientTournaments.set(tournamentId, tournament);
    this.emit('playersAdded', { tournament, players: aiPlayers });
    
    return tournament;
  }

  // Spectator functionality
  public async joinAsSpectator(tournamentId: string): Promise<void> {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        type: 'spectate_tournament',
        tournamentId: tournamentId,
      }));
    }
  }

  public async leaveSpectator(tournamentId: string): Promise<void> {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        type: 'leave_spectator',
        tournamentId: tournamentId,
      }));
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Helper methods for tournament logic
  public static canStartTournament(tournament: TournamentBracketData): boolean {
    return tournament.players.length >= 2 && tournament.status === 'waiting';
  }

  public static getNextMatch(tournament: TournamentBracketData): TournamentMatch | null {
    return tournament.matches.find(match => 
      !match.isComplete && 
      match.player1 && 
      match.player2 && 
      !match.isActive
    ) || null;
  }

  public static getTournamentProgress(tournament: TournamentBracketData): number {
    const totalMatches = tournament.matches.length;
    const completedMatches = tournament.matches.filter(m => m.isComplete).length;
    return totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  }
}

// Singleton instance
export const tournamentService = new TournamentService();

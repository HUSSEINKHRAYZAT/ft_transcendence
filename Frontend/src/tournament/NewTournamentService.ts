/**
 * New Tournament System - Complete Rewrite
 * 
 * Features:
 * - Tournament creation with size selection (4/8/16)
 * - Unique code generation
 * - Real-time player joining
 * - Auto-start when full or timeout
 * - Visual bracket display
 * - Simultaneous round matches
 * - Auto-advance winners, eliminate losers
 * - Game to 5 goals
 * - Winner celebration
 */

import { authService } from '../services/AuthService';
import { socketManager } from '../services/SocketManager';

// ==================== TYPES ====================

export type TournamentSize = 4 | 8 | 16;
export type TournamentStatus = 'waiting' | 'ready' | 'active' | 'completed';
export type MatchStatus = 'pending' | 'active' | 'completed';

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  joinedAt: number;
}

export interface TournamentMatch {
  id: string;
  round: number; // 1, 2, 3, 4
  matchNumber: number; // Position in round
  player1?: TournamentPlayer;
  player2?: TournamentPlayer;
  status: MatchStatus;
  score: { player1: number; player2: number };
  winnerId?: string;
  maxGoals: number; // Always 5
  startedAt?: number;
  completedAt?: number;
}

export interface TournamentData {
  id: string;
  code: string; // 6-character unique code
  size: TournamentSize;
  maxGoals: number; // Always 5
  players: TournamentPlayer[];
  status: TournamentStatus;
  matches: TournamentMatch[];
  currentRound: number;
  createdBy: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  winnerId?: string;
  autoStartDeadline?: number; // Timestamp for auto-start
}

export interface CreateTournamentRequest {
  size: TournamentSize;
  autoStartMinutes?: number; // Optional deadline
}

export interface JoinTournamentRequest {
  code: string;
}

// ==================== EVENTS ====================

type TournamentEvent =
  | 'tournament_created'
  | 'tournament_updated'
  | 'player_joined'
  | 'tournament_started'
  | 'round_started'
  | 'match_ready'
  | 'match_started'
  | 'match_completed'
  | 'round_completed'
  | 'tournament_completed'
  | 'player_eliminated'
  | 'tournament_error';

type EventCallback = (data: any) => void;

// ==================== SERVICE ====================

export class NewTournamentService {
  private static instance: NewTournamentService;
  private eventHandlers: Map<TournamentEvent, EventCallback[]> = new Map();
  private currentTournament: TournamentData | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): NewTournamentService {
    if (!NewTournamentService.instance) {
      NewTournamentService.instance = new NewTournamentService();
    }
    return NewTournamentService.instance;
  }

  // ==================== INITIALIZATION ====================

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🏆 Initializing New Tournament Service...');
    
    // Get user info for proper registration
    const user = authService.getUser();
    const playerName = user?.userName || user?.firstName || user?.email || 'Player';
    const externalId = user?.id || user?.email;
    
    await socketManager.connect(playerName, externalId);
    console.log('🏆 SocketManager connected as:', playerName);
    
    this.setupWebSocketHandlers();
    console.log('🏆 WebSocket handlers set up');
    
    this.initialized = true;

    console.log('🏆 New Tournament Service initialized');
  }

  private setupWebSocketHandlers(): void {
    // Tournament lifecycle events
    socketManager.on('tournament_created', (data) => this.handleTournamentCreated(data));
    socketManager.on('tournament_updated', (data) => this.handleTournamentUpdated(data));
    socketManager.on('player_joined', (data) => this.handlePlayerJoined(data));
    socketManager.on('tournament_started', (data) => this.handleTournamentStarted(data));
    socketManager.on('tournament_error', (data) => this.handleTournamentError(data));
    
    // Match events
    socketManager.on('round_started', (data) => this.handleRoundStarted(data));
    socketManager.on('match_ready', (data) => this.handleMatchReady(data));
    socketManager.on('match_completed', (data) => this.handleMatchCompleted(data));
    socketManager.on('round_completed', (data) => this.handleRoundCompleted(data));
    
    // Completion events
    socketManager.on('tournament_completed', (data) => this.handleTournamentCompleted(data));
    socketManager.on('player_eliminated', (data) => this.handlePlayerEliminated(data));
  }

  // ==================== EVENT HANDLERS ====================

  private handleTournamentCreated(data: any): void {
    console.log('🏆 Tournament created:', data);
    this.currentTournament = data.tournament;
    this.emit('tournament_created', data);
  }

  private handleTournamentUpdated(data: any): void {
    console.log('🏆 Tournament updated:', data);
    if (this.currentTournament && data.tournament.id === this.currentTournament.id) {
      this.currentTournament = data.tournament;
    }
    this.emit('tournament_updated', data);
  }

  private handlePlayerJoined(data: any): void {
    console.log('🏆 Player joined:', data);
    this.emit('player_joined', data);
  }

  private handleTournamentStarted(data: any): void {
    console.log('🏆 Tournament started:', data);
    if (this.currentTournament) {
      this.currentTournament.status = 'active';
      this.currentTournament.startedAt = Date.now();
    }
    this.emit('tournament_started', data);
  }

  private handleRoundStarted(data: any): void {
    console.log('🏆 Round started:', data);
    this.emit('round_started', data);
  }

  private handleMatchReady(data: any): void {
    console.log('🏆 Match ready:', data);
    this.emit('match_ready', data);
  }

  private handleMatchCompleted(data: any): void {
    console.log('🏆 Match completed:', data);
    this.emit('match_completed', data);
  }

  private handleRoundCompleted(data: any): void {
    console.log('🏆 Round completed:', data);
    this.emit('round_completed', data);
  }

  private handleTournamentCompleted(data: any): void {
    console.log('🏆 Tournament completed:', data);
    this.emit('tournament_completed', data);
  }

  private handlePlayerEliminated(data: any): void {
    console.log('🏆 Player eliminated:', data);
    this.emit('player_eliminated', data);
  }

  private handleTournamentError(data: any): void {
    console.error('🏆 Tournament error:', data);
    this.emit('tournament_error', data);
  }

  // ==================== PUBLIC API ====================

  /**
   * Create a new tournament
   */
  public async createTournament(request: CreateTournamentRequest): Promise<TournamentData> {
    await this.initialize();

    const user = authService.getUser();
    if (!user) {
      throw new Error('Must be logged in to create tournament');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tournament creation timeout'));
      }, 10000);

      const handler = (data: any) => {
        console.log('🏆 Received tournament_created event:', data);
        clearTimeout(timeout);
        this.off('tournament_created', handler);
        resolve(data.tournament);
      };

      this.on('tournament_created', handler);

      console.log('🏆 Sending create_new_tournament command:', {
        size: request.size,
        maxGoals: 5,
        autoStartMinutes: request.autoStartMinutes || 5
      });

      socketManager.sendCommand('create_new_tournament', {
        size: request.size,
        maxGoals: 5, // Always 5 goals
        autoStartMinutes: request.autoStartMinutes || 5
      });
    });
  }

  /**
   * Join existing tournament by code
   */
  public async joinTournament(request: JoinTournamentRequest): Promise<TournamentData> {
    await this.initialize();

    const user = authService.getUser();
    if (!user) {
      throw new Error('Must be logged in to join tournament');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tournament join timeout'));
      }, 10000);

      const handler = (data: any) => {
        clearTimeout(timeout);
        this.off('player_joined', handler);
        resolve(data.tournament);
      };

      this.on('player_joined', handler);

      socketManager.sendCommand('join_new_tournament', {
        code: request.code.toUpperCase(),
        playerId: user.id || user.email,
        playerName: user.userName || user.firstName || user.email
      });
    });
  }

  /**
   * Start tournament manually (host only)
   */
  public async startTournament(tournamentId: string): Promise<void> {
    await this.initialize();

    socketManager.sendCommand('start_new_tournament', {
      tournamentId
    });
  }

  /**
   * Report match completion
   */
  public async completeMatch(
    matchId: string,
    winnerId: string,
    finalScore: { player1: number; player2: number }
  ): Promise<void> {
    await this.initialize();

    socketManager.sendCommand('complete_new_match', {
      matchId,
      winnerId,
      finalScore
    });
  }

  /**
   * Get current tournament
   */
  public getCurrentTournament(): TournamentData | null {
    return this.currentTournament;
  }

  /**
   * Leave current tournament
   */
  public leaveTournament(): void {
    if (this.currentTournament) {
      socketManager.sendCommand('leave_new_tournament', {
        tournamentId: this.currentTournament.id
      });
      this.currentTournament = null;
    }
  }

  // ==================== EVENT SYSTEM ====================

  public on(event: TournamentEvent, callback: EventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  public off(event: TournamentEvent, callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: TournamentEvent, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in tournament event handler for ${event}:`, error);
        }
      });
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate tournament share link
   */
  public getShareLink(code: string): string {
    return `${window.location.origin}/tournament/${code}`;
  }

  /**
   * Get round name
   */
  public getRoundName(round: number, totalSize: TournamentSize): string {
    const rounds: Record<TournamentSize, string[]> = {
      4: ['Semifinals', 'Final'],
      8: ['Quarterfinals', 'Semifinals', 'Final'],
      16: ['Round of 16', 'Quarterfinals', 'Semifinals', 'Final']
    };

    return rounds[totalSize][round - 1] || `Round ${round}`;
  }

  /**
   * Check if current user is in match
   */
  public isUserInMatch(match: TournamentMatch): boolean {
    const user = authService.getUser();
    if (!user) return false;

    const userId = user.id || user.email;
    return match.player1?.id === userId || match.player2?.id === userId;
  }

  /**
   * Get user's current match
   */
  public getUserCurrentMatch(): TournamentMatch | null {
    if (!this.currentTournament) return null;

    const user = authService.getUser();
    if (!user) return null;

    const userId = user.id || user.email;

    return this.currentTournament.matches.find(match =>
      match.status === 'active' &&
      (match.player1?.id === userId || match.player2?.id === userId)
    ) || null;
  }
}

// Export singleton instance
export const newTournamentService = NewTournamentService.getInstance();

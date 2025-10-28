import { authService } from '../services/AuthService';
import {
  socketManager,
  ServerTournamentState,
  ServerTournamentMatch,
  ServerTournamentPlayer
} from '../services/SocketManager';
import { TournamentPlayer, TournamentMatch, TournamentBracketData } from './TournamentBracketAdapter';

export interface CreateTournamentRequest {
  name: string;
  size: 4;
  isPublic: boolean;
  allowSpectators: boolean;
}

export interface JoinTournamentRequest {
  tournamentId: string;
  playerId?: string;
  playerName?: string;
}

export interface TournamentListItem {
  id: string;
  name: string;
  size: 4;
  currentPlayers: number;
  status: 'waiting' | 'active' | 'completed';
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  allowSpectators: boolean;
}

type TournamentEventName =
  | 'tournamentCreated'
  | 'tournamentUpdated'
  | 'playerJoined'
  | 'tournamentStarted'
  | 'matchStarted'
  | 'matchCompleted'
  | 'tournamentCompleted'
  | 'matchReady'
  | 'tournamentGameStart'
  | 'tournamentsCleared'
  | 'bothPlayersReady';

type TournamentEventCallback = (payload: any) => void;

interface PendingAck {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  timeout: number;
}

function toTournamentPlayer(player: ServerTournamentPlayer | undefined): TournamentPlayer | undefined {
  if (!player) return undefined;
  return {
    id: player.id,
    name: player.name,
    externalId: player.externalId,
    isOnline: true,
    isAI: Boolean(player.isAI),
    aiLevel: player.aiLevel
  };
}

export class TournamentService {
  private tournaments: Map<string, ServerTournamentState> = new Map();
  private eventCallbacks: Map<TournamentEventName, TournamentEventCallback[]> = new Map();
  private initPromise: Promise<void> | null = null;
  private handlersRegistered = false;
  private currentUser: { id: string; name: string } | null = null;
  private pendingAcks: Map<string, PendingAck> = new Map();

  constructor() {
    void this.ensureInitialized();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.initialize();
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    this.registerSocketHandlers();

    const user = this.getCurrentUser();
    try {
      if (user) {
        await socketManager.connect(user.name, user.id);
      } else {
        await socketManager.connect();
      }
    } catch (error) {

      throw error;
    }

    socketManager.sendCommand('request_tournaments');
  }

  private registerSocketHandlers(): void {
    if (this.handlersRegistered) {
      return;
    }
    this.handlersRegistered = true;

    socketManager.on('connected', () => {
      this.currentUser = this.resolveCurrentUser();
      socketManager.sendCommand('request_tournaments');
    });

    socketManager.on('tournament_snapshot', ({ tournaments }) => {
      this.ingestSnapshot(tournaments || []);
    });

    socketManager.on('tournament_update', ({ tournament }) => {
      if (tournament) {
        this.storeTournament(tournament, 'update');
      }
    });

    socketManager.on('tournament_created', ({ tournament }) => {
      if (tournament) {
        this.storeTournament(tournament, 'created');
      }
    });

    socketManager.on('tournament_joined', ({ tournament }) => {
      if (tournament) {
        this.storeTournament(tournament, 'joined');
      }
    });

    socketManager.on('tournament_started', ({ tournament }) => {
      if (tournament) {
        this.storeTournament(tournament, 'started');
      }
    });

    socketManager.on('tournament_match_ready', (payload) => {
      if (!payload) return;
      const { tournamentId, matchId, role, match } = payload;
      const state = this.tournaments.get(tournamentId);
      const bracket = state ? this.toBracket(state) : null;
      const bracketMatch = this.toMatch(match);

      if (bracket) {
        // Only emit matchReady, NOT matchStarted
        // matchStarted should only be triggered by manual "Start Match" button via both_players_ready
        this.emit('matchReady', {
          tournament: bracket,
          match: bracketMatch,
          role
        });
      }
    });

    socketManager.on('both_players_ready', (payload) => {
      if (!payload) return;
      const { tournamentId, matchId, players } = payload;

      this.emit('bothPlayersReady', {
        tournamentId,
        matchId,
        players
      });
    });

    socketManager.on('tournament_ack', (ack) => {
      if (!ack || typeof ack !== 'object') return;
      const key = this.resolveAckKey(ack);
      if (!key) {
        return;
      }
      const pending = this.pendingAcks.get(key);
      if (!pending) {
        return;
      }
      clearTimeout(pending.timeout);
      this.pendingAcks.delete(key);
      pending.resolve(ack);
    });

    socketManager.on('tournament_error', (error) => {
      if (!error) return;
      const pendingKeys = Array.from(this.pendingAcks.keys());
      pendingKeys.forEach((key) => {
        const pending = this.pendingAcks.get(key);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.reject(new Error(error.reason || 'tournament_error'));
          this.pendingAcks.delete(key);
        }
      });
    });
  }

  private ingestSnapshot(tournaments: ServerTournamentState[]): void {
    const seen = new Set<string>();
    tournaments.forEach((state) => {
      seen.add(state.id);
      this.storeTournament(state, 'snapshot');
    });

    for (const existingId of Array.from(this.tournaments.keys())) {
      if (!seen.has(existingId)) {
        this.tournaments.delete(existingId);
      }
    }

    this.emit('tournamentsCleared', { count: this.tournaments.size });
  }

  private storeTournament(state: ServerTournamentState, origin: 'snapshot' | 'created' | 'joined' | 'started' | 'update'): void {
    const previous = this.tournaments.get(state.id);
    this.tournaments.set(state.id, state);
    const bracket = this.toBracket(state);

    if (!previous && origin !== 'snapshot') {
      this.emit('tournamentCreated', bracket);
    }

    if (origin === 'joined') {
      this.emit('playerJoined', bracket);
    }

    if (origin === 'started') {
      this.emit('tournamentStarted', bracket);
    }

    this.emit('tournamentUpdated', bracket);
    this.detectMatchTransitions(previous, state, bracket);
  }

  private detectMatchTransitions(previous: ServerTournamentState | undefined, next: ServerTournamentState, bracket: TournamentBracketData): void {
    if (!previous) {
      return;
    }

    const prevMatches = new Map(previous.matches.map((match) => [match.id, match]));
    const nextMatches = new Map(next.matches.map((match) => [match.id, match]));

    nextMatches.forEach((match, matchId) => {
      const before = prevMatches.get(matchId);
      if (!before || before.status === match.status) {
        return;
      }

      const bracketMatch = bracket.matches.find((m) => m.id === matchId);
      if (!bracketMatch) {
        return;
      }

      // ❌ REMOVED auto-emit of matchStarted when match becomes active
      // Match should only start when both players manually click "Start Match"
      // The backend sends both_players_ready event which triggers the actual start
      // if (match.status === 'active') {
      //   this.emit('matchStarted', { tournament: bracket, match: bracketMatch });
      // }

      if (match.status === 'completed') {
        this.emit('matchCompleted', { tournament: bracket, match: bracketMatch });
      }
    });

    if (previous.status !== next.status && next.status === 'completed') {
      this.emit('tournamentCompleted', { tournament: bracket, winner: bracket.winner });
    }
  }

  private toBracket(state: ServerTournamentState): TournamentBracketData {
    const matches: TournamentMatch[] = state.matches.map((match) => this.toMatch(match, state));

    return {
      tournamentId: state.id,
      name: state.name,
      size: state.size,
      players: state.players.map((player) => ({
        id: player.id,
        name: player.name,
        isOnline: true,
        isAI: Boolean(player.isAI),
        aiLevel: player.aiLevel,
        avatar: player.isAI ? '🤖' : undefined
      })),
      matches,
      currentRound: state.currentRound,
      isComplete: state.status === 'completed',
      winner: state.winner ? toTournamentPlayer(state.winner) : undefined,
      createdAt: new Date(state.createdAt),
      status: state.status,
      createdBy: state.createdBy?.name || 'Unknown',
      isPublic: state.isPublic,
      allowSpectators: state.allowSpectators
    };
  }

  private toMatch(match: ServerTournamentMatch, state?: ServerTournamentState): TournamentMatch {
    const player1 = toTournamentPlayer(match.player1);
    const player2 = toTournamentPlayer(match.player2);
    let winner: TournamentPlayer | undefined;

    if (match.winnerId) {
      if (player1 && player1.id === match.winnerId) {
        winner = player1;
      } else if (player2 && player2.id === match.winnerId) {
        winner = player2;
      } else if (state) {
        const fallback = state.players.find((p) => p.id === match.winnerId);
        if (fallback) {
          winner = toTournamentPlayer(fallback);
        }
      }
    }

    return {
      id: match.id,
      round: match.round,
      matchIndex: match.matchIndex,
      player1,
      player2,
      winner,
      score1: match.score1,
      score2: match.score2,
      isComplete: match.status === 'completed',
      isActive: match.status === 'active',
      waitingForOpponent: Boolean(match.waitingForOpponent),
      startedAt: match.startedAt ? new Date(match.startedAt) : undefined,
      completedAt: match.completedAt ? new Date(match.completedAt) : undefined
    };
  }

  private resolveAckKey(ack: any): string | null {
    if (!ack || typeof ack !== 'object') {
      return null;
    }

    if (ack.message === 'match_completed' && ack.tournamentId && ack.matchId) {
      return `match:${ack.tournamentId}:${ack.matchId}`;
    }

    return null;
  }

  private waitForTournamentEvent(
    eventName: 'tournament_created' | 'tournament_joined' | 'tournament_started' | 'tournament_update',
    predicate: (tournament: ServerTournamentState) => boolean,
    timeoutMs: number = 8000
  ): Promise<TournamentBracketData> {
    return new Promise((resolve, reject) => {
      const handler = ({ tournament }: { tournament: ServerTournamentState }) => {
        if (!tournament) return;
        if (predicate(tournament)) {
          cleanup();
          resolve(this.toBracket(tournament));
        }
      };

      const cleanup = () => {
        socketManager.off(eventName, handler as any);
        clearTimeout(timerId);
      };

      const timerId = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${eventName}`));
      }, timeoutMs);

      socketManager.on(eventName, handler as any);
    });
  }

  private waitForAck(key: string, timeoutMs: number = 8000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        if (this.pendingAcks.has(key)) {
          this.pendingAcks.delete(key);
        }
        reject(new Error('Timed out waiting for acknowledgement'));
      }, timeoutMs);

      this.pendingAcks.set(key, {
        resolve,
        reject,
        timeout
      });
    });
  }

  public on(event: TournamentEventName, callback: TournamentEventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  public off(event: TournamentEventName, callback: TournamentEventCallback): void {
    const callbacks = this.eventCallbacks.get(event);
    if (!callbacks) return;
    const index = callbacks.indexOf(callback);
    if (index >= 0) {
      callbacks.splice(index, 1);
    }
  }

  private emit(event: TournamentEventName, payload: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (!callbacks) return;
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (error) {

      }
    });
  }

  public async getTournaments(): Promise<TournamentListItem[]> {
    await this.ensureInitialized();

    return Array.from(this.tournaments.values()).map((state) => ({
      id: state.id,
      name: state.name,
      size: state.size,
      currentPlayers: state.players.length,
      status: state.status,
      createdBy: state.createdBy?.name || 'Unknown',
      createdAt: new Date(state.createdAt),
      isPublic: state.isPublic,
      allowSpectators: state.allowSpectators
    }));
  }

  public async getTournament(tournamentId: string): Promise<TournamentBracketData> {
    await this.ensureInitialized();
    const existing = this.tournaments.get(tournamentId);
    if (existing) {
      return this.toBracket(existing);
    }

    const tournament = await this.waitForTournamentEvent(
      'tournament_update',
      (state) => state.id === tournamentId,
      8000
    );

    return tournament;
  }

  public async createTournament(request: CreateTournamentRequest): Promise<TournamentBracketData> {
    await this.ensureInitialized();
    const user = this.getCurrentUser();

    const waitForCreated = this.waitForTournamentEvent(
      'tournament_created',
      (state) =>
        state.name === request.name &&
        state.size === request.size &&
        (!user || state.createdBy?.id === user.id),
      10000
    );

    socketManager.sendCommand('create_tournament', {
      name: request.name,
      size: request.size,
      isPublic: request.isPublic,
      allowSpectators: request.allowSpectators
    });

    return waitForCreated;
  }

  public async joinTournament(request: JoinTournamentRequest): Promise<TournamentBracketData> {
    await this.ensureInitialized();

    const waitForJoined = this.waitForTournamentEvent(
      'tournament_joined',
      (state) => state.id === request.tournamentId,
      8000
    );

    socketManager.sendCommand('join_tournament', {
      tournamentId: request.tournamentId
    });

    return waitForJoined;
  }

  public async startTournament(tournamentId: string): Promise<TournamentBracketData> {
    await this.ensureInitialized();

    const waitForStarted = this.waitForTournamentEvent(
      'tournament_started',
      (state) => state.id === tournamentId,
      10000
    );

    socketManager.sendCommand('start_tournament', {
      tournamentId
    });

    return waitForStarted;
  }

  public async completeMatch(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    score1: number,
    score2: number
  ): Promise<void> {
    await this.ensureInitialized();
    
    const ackKey = `match:${tournamentId}:${matchId}`;
    const ackPromise = this.waitForAck(ackKey);

    socketManager.sendCommand('complete_tournament_match', {
      tournamentId,
      matchId,
      winnerId,
      score1,
      score2
    });

    await ackPromise;
  }

  public async markPlayerReady(tournamentId: string, matchId: string): Promise<void> {
    await this.ensureInitialized();
    
    socketManager.sendCommand('mark_player_ready', {
      tournamentId,
      matchId
    });

  }

  public async requestTournaments(): Promise<void> {
    await this.ensureInitialized();
    socketManager.sendCommand('request_tournaments');
  }

  public async clearInactiveTournaments(): Promise<void> {
    await this.ensureInitialized();
    socketManager.sendCommand('clear_inactive_tournaments');
  }

  public async joinAsSpectator(tournamentId: string): Promise<void> {
    await this.ensureInitialized();
    socketManager.sendCommand('join_tournament_spectator', { tournamentId });
  }

  public async leaveSpectator(tournamentId: string): Promise<void> {
    await this.ensureInitialized();
    socketManager.sendCommand('leave_tournament_spectator', { tournamentId });
  }

  public getCurrentUser() {
    if (!this.currentUser) {
      this.currentUser = this.resolveCurrentUser();
    }
    return this.currentUser;
  }

  private resolveCurrentUser(): { id: string; name: string } | null {
    try {
      const user = authService.getUser();
      if (user) {
        const userId = user.id || user.userName || user.email;
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
          user.userName ||
          user.email?.split('@')[0] ||
          'Player';

        if (userId) {
          const currentUser = { id: String(userId), name };
          sessionStorage.setItem('ft_pong_current_user', JSON.stringify(currentUser));
          sessionStorage.setItem('ft_pong_session_user_id', currentUser.id);
          return currentUser;
        }
      }
    } catch (error) {

    }

    const cachedUser = sessionStorage.getItem('ft_pong_current_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed?.id && parsed?.name) {
          return parsed;
        }
      } catch (error) {

      }
    }

    let sessionUserId = sessionStorage.getItem('ft_pong_session_user_id');
    if (!sessionUserId) {
      sessionUserId = 'guest-' + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('ft_pong_session_user_id', sessionUserId);
    }

    const fallbackUser = {
      id: sessionUserId,
      name: 'Guest ' + sessionUserId.slice(-4).toUpperCase()
    };

    sessionStorage.setItem('ft_pong_current_user', JSON.stringify(fallbackUser));
    return fallbackUser;
  }

  public static canStartTournament(tournament: TournamentBracketData): boolean {
    // Only allow starting when all slots are filled with real users
    const realPlayers = tournament.players.filter(p => !p.isAI);
    return realPlayers.length >= tournament.size && tournament.status === 'waiting';
  }

  public static getNextMatch(tournament: TournamentBracketData): TournamentMatch | null {
    return (
      tournament.matches.find(
        (match) =>
          !match.isComplete &&
          match.player1 &&
          match.player2 &&
          !match.isActive
      ) || null
    );
  }

  public static getTournamentProgress(tournament: TournamentBracketData): number {
    const totalMatches = tournament.matches.length;
    const completedMatches = tournament.matches.filter((match) => match.isComplete).length;
    return totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  }
}

export const tournamentService = new TournamentService();

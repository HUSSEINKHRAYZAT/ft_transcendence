import type { PlayerCount, User, Session } from "./types";

export class ApiClient {
  // ---- Auth
  static async me(): Promise<Session | null> {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (!r.ok) return null;
      return (await r.json()) as Session;
    } catch {
      return null;
    }
  }

  // ---- Online Matchmaking
  static async createOnlineMatch(params: { playerCount: PlayerCount }): Promise<{
    wsUrl: string; roomId: string; code: string; matchId: string;
  }> {
    const r = await fetch("/api/pong/matches", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerCount: params.playerCount }),
    });
    if (!r.ok) throw new Error("Failed to create match");
    return r.json();
  }

  static async joinOnlineMatch(params: { code: string }): Promise<{
    wsUrl: string; roomId: string; matchId: string;
  }> {
    const r = await fetch(`/api/pong/matches/join`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: params.code }),
    });
    if (!r.ok) throw new Error("Failed to join match");
    return r.json();
  }

  static async postMatchResult(params: {
    matchId: string; winnerUserId?: string | null; scores: number[];
  }) {
    await fetch(`/api/pong/matches/${encodeURIComponent(params.matchId)}/result`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).catch(() => {});
  }

  // ---- Tournament
  static async listOnlinePlayers(): Promise<User[]> {
    const r = await fetch("/api/pong/players/online", { credentials: "include" });
    if (!r.ok) return [];
    return r.json();
  }

  static async createTournament(params: { size: 8 | 16; participants: string[]; }): Promise<{
    tournamentId: string; code: string;
  }> {
    const r = await fetch("/api/pong/tournaments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error("Failed to create tournament");
    return r.json();
  }

  static async joinTournament(params: { code: string }): Promise<{
    name?: string; currentPlayers: number; maxPlayers: number; status?: string;
  }> {
    const r = await fetch("/api/pong/tournaments/join", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error("Failed to join tournament");
    return r.json();
  }

  // ---- Session Management
  static async getUserActiveSessions(): Promise<{
    activeGames: string[]; activeTournaments: string[];
  }> {
    const r = await fetch("/api/pong/sessions/active", {
      credentials: "include",
    });
    if (!r.ok) return { activeGames: [], activeTournaments: [] };
    return r.json();
  }

  static async checkUserCanJoin(type: 'game' | 'tournament'): Promise<{ canJoin: boolean; reason?: string }> {
    try {
      const sessions = await this.getUserActiveSessions();
      
      if (type === 'game' && sessions.activeGames.length > 0) {
        return { 
          canJoin: false, 
          reason: `You are already in an active game (${sessions.activeGames[0]}). Please finish or exit your current game first.` 
        };
      }
      
      if (type === 'tournament' && sessions.activeTournaments.length > 0) {
        return { 
          canJoin: false, 
          reason: `You are already in a tournament (${sessions.activeTournaments[0]}). Please finish your current tournament first.` 
        };
      }
      
      return { canJoin: true };
    } catch (error) {
      // If API fails, allow join (graceful degradation)
      console.warn('Session check failed:', error);
      return { canJoin: true };
    }
  }

  static async reportTournamentMatch(params: {
    tournamentId: string; round: number; matchIndex: number;
    leftUserId: string; rightUserId: string; leftScore: number; rightScore: number; winnerUserId: string;
  }) {
    await fetch(`/api/pong/tournaments/${encodeURIComponent(params.tournamentId)}/report`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).catch(() => {});
  }
}

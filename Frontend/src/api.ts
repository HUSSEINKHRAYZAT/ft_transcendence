import type { PlayerCount, User, Session } from "./types";

const API_BASE_URL = import.meta.env.DEV
  ? 'https://localhost:8080/api'  // Dev: direct to API Gateway
  : '/api';                         // Prod: relative URL (proxied by Nginx)

// Helper to get auth headers with JWT token
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('ft_pong_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export class ApiClient {
  // ---- Auth
  static async me(): Promise<Session | null> {
    try {
      const r = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!r.ok) return null;
      const data = await r.json();
      // Backend returns { user: User }, we need to transform to Session
      if (data && data.user) {
        return {
          user: data.user,
          sessionId: data.user.id || ''
        } as Session;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ---- Online Matchmaking
  static async createOnlineMatch(params: { playerCount: PlayerCount }): Promise<{
    wsUrl: string; roomId: string; code: string; matchId: string;
  }> {
    const r = await fetch(`${API_BASE_URL}/pong/matches`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ playerCount: params.playerCount }),
    });
    if (!r.ok) throw new Error("Failed to create match");
    return r.json();
  }

  static async joinOnlineMatch(params: { code: string }): Promise<{
    wsUrl: string; roomId: string; matchId: string;
  }> {
    const r = await fetch(`${API_BASE_URL}/pong/matches/join`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ code: params.code }),
    });
    if (!r.ok) throw new Error("Failed to join match");
    return r.json();
  }

  static async postMatchResult(params: {
    matchId: string; winnerUserId?: string | null; scores: number[];
  }) {
    await fetch(`${API_BASE_URL}/pong/matches/${encodeURIComponent(params.matchId)}/result`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    }).catch(() => {});
  }

  // ---- Session Management
  static async listOnlinePlayers(): Promise<User[]> {
    const r = await fetch(`${API_BASE_URL}/pong/players/online`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    if (!r.ok) return [];
    return r.json();
  }

  static async getUserActiveSessions(): Promise<{
    activeGames: string[];
  }> {
    const r = await fetch(`${API_BASE_URL}/pong/sessions/active`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    if (!r.ok) return { activeGames: [] };
    const result = await r.json();
    return { activeGames: result.activeGames || [] };
  }

  static async checkUserCanJoin(type: 'game'): Promise<{ canJoin: boolean; reason?: string }> {
    try {
      const sessions = await this.getUserActiveSessions();

      if (type === 'game' && sessions.activeGames.length > 0) {
        return {
          canJoin: false,
          reason: `You are already in an active game (${sessions.activeGames[0]}). Please finish or exit your current game first.`
        };
      }

      return { canJoin: true };
    } catch (error) {
      // If API fails, allow join (graceful degradation)

      return { canJoin: true };
    }
  }

  static async endSession(userId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/pong/sessions/end/${encodeURIComponent(userId)}`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      });
    } catch (error) {

    }
  }
}

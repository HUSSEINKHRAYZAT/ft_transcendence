import { socketManager } from "../services/SocketManager";
import { authService } from "../services/AuthService";
import type { GameConfig } from "../types/Type";

interface TournamentPlayerLite {
  id?: string;
  externalId?: string;
  name?: string;
  isAI?: boolean;
  aiLevel?: "easy" | "medium" | "hard";
}

interface TournamentMatchLite {
  id: string;
  round: number;
  matchIndex?: number;
  matchNumber?: number;
  player1?: TournamentPlayerLite | null;
  player2?: TournamentPlayerLite | null;
  maxGoals?: number;
}

interface TournamentLite {
  id: string;
  maxGoals?: number;
}

export interface MatchCoordinatorOptions {
  tournament: TournamentLite;
  match: TournamentMatchLite;
  onStatus?: (message: string, type?: "info" | "success" | "error") => void;
}

export class NewTournamentMatchCoordinator {
  public static async prepareMatchGameConfig({
    tournament,
    match,
    onStatus
  }: MatchCoordinatorOptions): Promise<GameConfig> {
    const currentUser = authService.getUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const userId = currentUser.id || currentUser.email;
    if (!userId) {
      throw new Error("Current user missing id/email");
    }

    const player1 = match.player1 ?? undefined;
    const player2 = match.player2 ?? undefined;

    if (!player1 || !player1.id || !player2 || !player2.id) {
      // Fallback: not enough players yet (bye). Run local so bracket can progress.
      onStatus?.("Opponent not ready yet. Starting local warmup match.", "info");
      return this.buildLocalConfig(tournament, match, currentUser);
    }

    const isHost = player1.id === userId || player1.externalId === userId;

    const opponent = isHost ? player2 : player1;

    if (!opponent || !opponent.id) {
      onStatus?.("Opponent not available. Starting local warmup match.", "info");
      return this.buildLocalConfig(tournament, match, currentUser);
    }

    const me = isHost ? player1 : player2;
    const myDisplayName = currentUser.userName || currentUser.firstName || currentUser.email || "Player";

    await socketManager.connect(myDisplayName, userId);

    // Remote match handshake
    if (isHost) {
      onStatus?.("Creating tournament match room...", "info");
      const roomId = await socketManager.createRoom("2p");
      if (!roomId) {
        throw new Error("Failed to create tournament room");
      }

      onStatus?.("Waiting for opponent to connect...", "info");

      const opponentExtId = opponent.externalId || opponent.id;

      // Try multiple ID formats to increase chance of delivery
      // Some players might be registered with different ID formats
      const idsToTry = [
        opponentExtId,
        opponent.id,
        opponent.externalId,
        String(opponent.id),
        String(opponent.externalId)
      ].filter((id, index, arr) => id && arr.indexOf(id) === index); // Remove duplicates and nulls

      // Announce to all possible IDs
      for (const opponentId of idsToTry) {
        if (opponentId) {
          this.announceRoomToOpponent({
            roomId,
            tournamentId: tournament.id,
            matchId: match.id,
            opponentExternalId: opponentId,
            match,
            hostName: me.name || myDisplayName
          });
        }
      }

      try {
        await this.waitForGameReady(roomId, 35000);
      } catch (err) {
        onStatus?.("Opponent did not join in time. Starting fallback match.", "error");
        return this.buildLocalConfig(tournament, match, currentUser);
      }

      onStatus?.("Opponent connected! Starting match.", "success");

      return this.buildRemoteConfig({
        tournament,
        match,
        currentUser,
        connection: "remoteHost",
        roomId,
        player1,
        player2
      });
    }

    // Guest flow
    onStatus?.("Waiting for host to open room...", "info");

    const roomId = await this.waitForRoomAnnouncement({
      tournamentId: tournament.id,
      matchId: match.id,
      currentPlayerId: userId,
      timeoutMs: 35000
    });

    if (!roomId) {
      onStatus?.("Host did not respond, starting fallback match.", "error");
      return this.buildLocalConfig(tournament, match, currentUser);
    }

    onStatus?.("Joining host room...", "info");
    const joined = await socketManager.joinRoom(roomId);
    if (!joined) {
      onStatus?.("Failed to join host room, starting fallback match.", "error");
      return this.buildLocalConfig(tournament, match, currentUser);
    }

    onStatus?.("Connected!", "success");

    return this.buildRemoteConfig({
      tournament,
      match,
      currentUser,
      connection: "remoteGuest",
      roomId,
      player1,
      player2
    });
  }

  private static buildRemoteConfig({
    tournament,
    match,
    currentUser,
    connection,
    roomId,
    player1,
    player2
  }: {
    tournament: TournamentLite;
    match: TournamentMatchLite;
    currentUser: any;
    connection: "remoteHost" | "remoteGuest";
    roomId: string;
    player1: TournamentPlayerLite;
    player2: TournamentPlayerLite;
  }): GameConfig {
    const displayNames: string[] = [player1.name || "Player 1", player2.name || "Player 2"];

    return {
      playerCount: 2,
      connection,
      roomId,
      winScore: tournament.maxGoals || match.maxGoals || 5,
      currentUser,
      displayNames,
      tournament: {
        id: tournament.id,
        matchId: match.id,
        round: match.round,
        matchIndex: match.matchIndex ?? match.matchNumber ?? 0,
        players: [
          {
            id: player1.id || "",
            name: player1.name || "Player 1",
            isAI: !!player1.isAI,
            side: "left"
          },
          {
            id: player2.id || "",
            name: player2.name || "Player 2",
            isAI: !!player2.isAI,
            side: "right"
          }
        ]
      }
    };
  }

  private static buildLocalConfig(
    tournament: TournamentLite,
    match: TournamentMatchLite,
    currentUser: any
  ): GameConfig {
    const opponentName = match.player1 && match.player1.id !== (currentUser.id || currentUser.email)
      ? match.player1.name
      : match.player2?.name;

    return {
      playerCount: 2,
      connection: "local",
      winScore: tournament.maxGoals || match.maxGoals || 5,
      currentUser,
      displayNames: [
        currentUser.userName || currentUser.firstName || "You",
        opponentName || "Opponent"
      ],
      skipCountdown: true,
      tournament: {
        id: tournament.id,
        matchId: match.id,
        round: match.round,
        matchIndex: match.matchIndex ?? match.matchNumber ?? 0
      }
    };
  }

  private static announceRoomToOpponent(params: {
    roomId: string;
    tournamentId: string;
    matchId: string;
    opponentExternalId: string;
    match: TournamentMatchLite;
    hostName: string;
  }): void {
    const { roomId, tournamentId, matchId, opponentExternalId, match, hostName } = params;

    try {
      socketManager.announceTournamentMatchRoom({
        roomId,
        tournamentId,
        matchId,
        opponentExternalId,
        match,
        hostName
      });
    } catch (err) {

    }

    const bc = this.getBroadcastChannel();
    if (bc) {
      try {
        bc.postMessage({
          type: "match_room_created",
          tournamentId,
          matchId,
          roomId,
          opponentId: opponentExternalId,
          match
        });
      } catch (err) {

      }
    }
  }

  private static waitForGameReady(roomId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        if (settled) return;
        settled = true;
        socketManager.off("game_ready", handler as any);
        clearTimeout(timer);
      };

      const handler = (_data: any) => {
        cleanup();
        resolve();
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("game_ready_timeout"));
      }, timeoutMs);

      socketManager.on("game_ready", handler as any);
    });
  }

  private static waitForRoomAnnouncement({
    tournamentId,
    matchId,
    currentPlayerId,
    timeoutMs
  }: {
    tournamentId: string;
    matchId: string;
    currentPlayerId: string;
    timeoutMs: number;
  }): Promise<string | null> {
    return new Promise((resolve) => {
      let resolved = false;
      const bc = this.getBroadcastChannel();

      const finalize = (roomId: string | null) => {
        if (resolved) return;
        resolved = true;
        socketManager.off("tournament_match_room", socketListener as any);
        if (bc) {
          try {
            bc.removeEventListener("message", bcListener as any);
          } catch {}
          try {
            bc.close();
          } catch {}
        }
        clearTimeout(timer);
        resolve(roomId);
      };

      const socketListener = (data: any) => {

        if (
          data?.tournamentId === tournamentId &&
          data?.matchId === matchId &&
          typeof data?.roomId === "string"
        ) {

          finalize(data.roomId);
        }
      };

      const bcListener = (event: MessageEvent) => {
        const data = event.data || {};
        if (
          data.type === "match_room_created" &&
          data.tournamentId === tournamentId &&
          data.matchId === matchId &&
          data.opponentId === currentPlayerId &&
          typeof data.roomId === "string"
        ) {
          finalize(data.roomId);
        }
      };

      socketManager.on("tournament_match_room", socketListener as any);

      if (bc) {
        try {
          bc.addEventListener("message", bcListener as any);
        } catch (err) {

        }
      }

      const timer = setTimeout(() => finalize(null), timeoutMs);
    });
  }

  private static getBroadcastChannel(): BroadcastChannel | null {
    try {
      return new BroadcastChannel("ft_pong_tournaments");
    } catch {
      return null;
    }
  }
}

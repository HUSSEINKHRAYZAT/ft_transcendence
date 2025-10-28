import { socketManager, SocketEvents } from '../services/SocketManager';
import { GameConfig } from '../types/Type';
import { TournamentBracketData, TournamentMatch, TournamentPlayer } from './TournamentBracket';

export interface TournamentMatchConfig {
  tournament: TournamentBracketData;
  match: TournamentMatch;
  currentPlayer: TournamentPlayer;
  isHost: boolean;
}

export class TournamentMatchService {
  private static instance: TournamentMatchService;
  private activeMatches: Map<string, TournamentMatchConfig> = new Map();

  public static getInstance(): TournamentMatchService {
    if (!TournamentMatchService.instance) {

      TournamentMatchService.instance = new TournamentMatchService();
    }
    return TournamentMatchService.instance;
  }

  async startTournamentMatch(
    tournament: TournamentBracketData,
    match: TournamentMatch,
    currentPlayer: TournamentPlayer,
    onGameStart: (gameConfig: GameConfig) => void
  ): Promise<void> {

    // Determine if current player is player1 (host) or player2 (guest)

    const isHost = match.player1?.id === currentPlayer.id;
    const isPlayerInMatch = match.player1?.id === currentPlayer.id || match.player2?.id === currentPlayer.id;

    if (!isPlayerInMatch) {

      throw new Error('Current player is not in this match');
    }

    const matchConfig: TournamentMatchConfig = {
      tournament,
      match,
      currentPlayer,
      isHost
    };

    // Check if either player is AI
    const hasAI = match.player1?.isAI || match.player2?.isAI;

    if (hasAI) {
      // Start AI match locally
      await this.startAIMatch(matchConfig, onGameStart);
    } else {
      // Start remote multiplayer match (host2player style)
      await this.startRemoteMultiplayerMatch(matchConfig, onGameStart);
    }
  }

  private async startRemoteMultiplayerMatch(
    matchConfig: TournamentMatchConfig,
    onGameStart: (gameConfig: GameConfig) => void
  ): Promise<void> {
    const { tournament, match, currentPlayer, isHost } = matchConfig;

    try {
      // Connect to socket server
      await socketManager.connect(currentPlayer.name, currentPlayer.id);

      // Optional cross-tab/session coordinator
      const bc = this.getBroadcastChannel();
      const opponentId = match.player1?.id === currentPlayer.id ? match.player2?.id : match.player1?.id;

      if (isHost) {
        // Host creates the room and announces it so guest can join

        const createdRoomId = await socketManager.createRoom('2p');
        if (!createdRoomId) {
          throw new Error('Failed to create tournament match room');
        }

        if (opponentId) {
          socketManager.announceTournamentMatchRoom({
            roomId: createdRoomId,
            tournamentId: tournament.tournamentId,
            matchId: match.id,
            opponentExternalId: opponentId,
            match: {
              id: match.id,
              player1: match.player1?.name,
              player2: match.player2?.name
            },
            hostName: currentPlayer.name
          });

          // Observe acknowledgement to provide logging/feedback
          const ackHandler: SocketEvents['tournament_match_room_ack'] = (ack) => {
            if (ack.opponentExternalId !== opponentId) {
              return;
            }
            socketManager.off('tournament_match_room_ack', ackHandler);
            if (ack.status === 'error') {

            }
          };
          socketManager.on('tournament_match_room_ack', ackHandler);
        } else {

        }

        const opponentPlayer = match.player1?.id === currentPlayer.id ? match.player2 : match.player1;
        if (opponentPlayer) {
          this.showHostWaitingOverlay(match, createdRoomId, opponentPlayer);
        }

        // Announce room to the opponent via BroadcastChannel so they can join
        if (bc) {
          try {
            bc.postMessage({
              type: 'match_room_created',
              tournamentId: tournament.tournamentId,
              matchId: match.id,
              roomId: createdRoomId,
              opponentId,
              match: {
                id: match.id,
                player1: match.player1?.name,
                player2: match.player2?.name,
              }
            });
          } catch (e) {

          }
        }

        // Wait for the other player to join then start
        this.waitForOpponentAndStart(matchConfig, createdRoomId, onGameStart);

      } else {
        // Guest waits for the host's announcement with the generated roomId

        const roomId = await this.waitForRoomAnnouncement(
          tournament.tournamentId,
          match.id,
          currentPlayer.id
        );

        if (!roomId) {
          throw new Error('Timed out waiting for room announcement');
        }

        const joinSuccess = await socketManager.joinRoom(roomId);
        if (!joinSuccess) {
          throw new Error('Failed to join tournament match room');
        }

        // Start the game immediately as guest
        this.startTournamentGame(matchConfig, roomId, onGameStart);
      }

    } catch (error) {

      // Fallback to AI match if remote fails

      const aiMatchConfig = { ...matchConfig };
      if (aiMatchConfig.match.player1 && aiMatchConfig.match.player2) {
        if (!aiMatchConfig.match.player1.isAI) {
          aiMatchConfig.match.player2.isAI = true;
          aiMatchConfig.match.player2.aiLevel = 'medium';
        }
      }
      await this.startAIMatch(aiMatchConfig, onGameStart);
    }
  }

  // Helper: get BroadcastChannel if available
  private getBroadcastChannel(): BroadcastChannel | null {
    try {
      // @ts-ignore - BroadcastChannel may not exist in all environments
      return new BroadcastChannel('ft_pong_tournaments');
    } catch {
      return null;
    }
  }

  // Helper: guest waits for host to announce room for this specific match
  private waitForRoomAnnouncement(
    tournamentId: string,
    matchId: string,
    currentPlayerId: string,
    timeoutMs: number = 30000
  ): Promise<string | null> {
    return new Promise((resolve) => {
      let settled = false;
      const bc = this.getBroadcastChannel();
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const finalize = (roomId: string | null) => {
        if (settled) return;
        settled = true;
        socketManager.off('tournament_match_room', socketHandler);
        if (bc) {
          try {
            bc.removeEventListener('message', broadcastHandler as any);
          } catch {}
          try {
            bc.close();
          } catch {}
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        resolve(roomId);
      };

      const socketHandler: SocketEvents['tournament_match_room'] = (data) => {
        if (
          data.tournamentId === tournamentId &&
          data.matchId === matchId &&
          typeof data.roomId === 'string'
        ) {
          finalize(data.roomId);
        }
      };

      const broadcastHandler = (event: MessageEvent) => {
        const data = event.data || {};
        if (
          data.type === 'match_room_created' &&
          data.tournamentId === tournamentId &&
          data.matchId === matchId &&
          data.opponentId === currentPlayerId &&
          typeof data.roomId === 'string'
        ) {
          finalize(data.roomId);
        }
      };

  socketManager.on('tournament_match_room', socketHandler);

      if (bc) {
        try {
          bc.addEventListener('message', broadcastHandler as any);
        } catch (err) {

        }
      }

      timeoutId = setTimeout(() => {
        finalize(null);
      }, timeoutMs);
    });
  }

  private async waitForOpponentAndStart(
    matchConfig: TournamentMatchConfig,
    roomId: string,
    onGameStart: (gameConfig: GameConfig) => void
  ): Promise<void> {

    // Listen for player joined event
    const playerJoinedHandler = (data: any) => {

      // Start the game once opponent joins
      socketManager.off('player_joined', playerJoinedHandler);
      this.hideWaitingOverlay();
      this.startTournamentGame(matchConfig, roomId, onGameStart);
    };

    socketManager.on('player_joined', playerJoinedHandler);

    // Set timeout in case opponent doesn't join
    setTimeout(() => {
      socketManager.off('player_joined', playerJoinedHandler);

      this.hideWaitingOverlay();
      
      // Convert to AI match
      const aiMatchConfig = { ...matchConfig };
      if (aiMatchConfig.match.player1 && aiMatchConfig.match.player2) {
        aiMatchConfig.match.player2.isAI = true;
        aiMatchConfig.match.player2.aiLevel = 'medium';
      }
      this.startAIMatch(aiMatchConfig, onGameStart);
    }, 30000); // 30 second timeout
  }

  private startTournamentGame(
    matchConfig: TournamentMatchConfig,
    roomId: string,
    onGameStart: (gameConfig: GameConfig) => void
  ): void {
    const { tournament, match, currentPlayer, isHost } = matchConfig;

    // Create game configuration for remote tournament match
    const gameConfig: GameConfig = {
      playerCount: 2,
      connection: isHost ? 'remoteHost' : 'remoteGuest',
      roomId,
      winScore: 5, // Tournament matches typically shorter
      displayNames: [match.player1!.name, match.player2!.name],
      currentUser: {
        id: currentPlayer.id,
        email: '',
        firstName: currentPlayer.name,
        lastName: '',
        userName: currentPlayer.name,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      tournament: {
        id: tournament.tournamentId,
        matchId: match.id,
        round: match.round,
        matchIndex: match.matchIndex,
        players: [
          {
            id: match.player1!.id,
            name: match.player1!.name,
            isAI: false,
            side: 'left'
          },
          {
            id: match.player2!.id,
            name: match.player2!.name,
            isAI: false,
            side: 'right'
          }
        ]
      }
    };

    onGameStart(gameConfig);
  }

  private async startAIMatch(
    matchConfig: TournamentMatchConfig,
    onGameStart: (gameConfig: GameConfig) => void
  ): Promise<void> {
    const { match, currentPlayer } = matchConfig;
    const aiPlayer = match.player1?.isAI ? match.player1 : match.player2;
    const humanPlayer = match.player1?.isAI ? match.player2 : match.player1;

    const gameConfig: GameConfig = {
      playerCount: 2,
      connection: 'ai',
      aiDifficulty: this.getAIDifficultyLevel(aiPlayer?.aiLevel || 'medium'),
      winScore: 5,
      displayNames: [humanPlayer?.name || 'Player', aiPlayer?.name || 'AI'],
      currentUser: {
        id: currentPlayer.id,
        email: '',
        firstName: currentPlayer.name,
        lastName: '',
        userName: currentPlayer.name,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      tournament: {
        id: matchConfig.tournament.tournamentId,
        matchId: match.id,
        round: match.round,
        matchIndex: match.matchIndex,
        players: [
          {
            id: match.player1!.id,
            name: match.player1!.name,
            isAI: match.player1!.isAI || false,
            side: 'left'
          },
          {
            id: match.player2!.id,
            name: match.player2!.name,
            isAI: match.player2!.isAI || false,
            side: 'right'
          }
        ]
      }
    };

    onGameStart(gameConfig);
  }

  private showHostWaitingOverlay(_match: TournamentMatch, roomId: string, opponent: TournamentPlayer): void {
    const overlay = document.createElement('div');
    overlay.id = 'tournament-match-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;

    overlay.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1e293b, #334155);
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        color: white;
        max-width: 500px;
        border: 2px solid #84cc16;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">🏆</div>
        <h2 style="color: #84cc16; margin-bottom: 20px; font-size: 24px;">Tournament Match</h2>
        <p style="margin-bottom: 20px; font-size: 18px;">
          Waiting for <strong style="color: #84cc16;">${opponent.name}</strong> to join...
        </p>
        <div style="
          background: rgba(0,0,0,0.4);
          padding: 16px;
          border-radius: 12px;
          margin: 20px 0;
          font-family: monospace;
          font-size: 20px;
          letter-spacing: 2px;
          color: #84cc16;
          border: 1px solid #84cc16;
        ">${roomId}</div>
        <div style="margin-top: 30px;">
          <div class="spinner" style="
            width: 40px;
            height: 40px;
            border: 4px solid rgba(132, 204, 22, 0.3);
            border-top: 4px solid #84cc16;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          "></div>
        </div>
        <button id="cancel-match" style="
          margin-top: 30px;
          padding: 12px 24px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">Cancel Match</button>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    document.body.appendChild(overlay);

    // Handle cancel
    overlay.querySelector('#cancel-match')?.addEventListener('click', () => {
      this.hideWaitingOverlay();
      socketManager.disconnect();
    });
  }

  private hideWaitingOverlay(): void {
    const overlay = document.getElementById('tournament-match-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  private getAIDifficultyLevel(aiLevel: string): number {
    switch (aiLevel) {
      case 'easy': return 3;
      case 'medium': return 6;
      case 'hard': return 9;
      default: return 6;
    }
  }

  public cleanup(): void {
    this.activeMatches.clear();
    this.hideWaitingOverlay();
  }
}
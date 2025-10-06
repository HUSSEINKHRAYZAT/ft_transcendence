// WebSocket-based implementation (converted from Socket.IO)

export interface RoomInfo {
  roomId: string;
  hostId: string;
  players: Array<{
    id: string;
    name: string;
    isReady: boolean;
  }>;
  gameMode: '2p' | '4p';
  isGameStarted: boolean;
}

export interface ServerTournamentPlayer {
  id: string;
  name: string;
  externalId?: string;
  isAI?: boolean;
  aiLevel?: 'easy' | 'medium' | 'hard';
}

export interface ServerTournamentMatch {
  id: string;
  round: number;
  matchIndex: number;
  player1?: ServerTournamentPlayer;
  player2?: ServerTournamentPlayer;
  status: 'pending' | 'active' | 'completed';
  winnerId?: string;
  score1?: number;
  score2?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ServerTournamentState {
  id: string;
  name: string;
  size: 4 | 8 | 16;
  status: 'waiting' | 'active' | 'completed';
  players: ServerTournamentPlayer[];
  matches: ServerTournamentMatch[];
  currentRound: number;
  createdAt: number;
  updatedAt: number;
  createdBy: {
    id: string;
    name: string;
  };
  isPublic: boolean;
  allowSpectators: boolean;
  winner?: ServerTournamentPlayer;
}

export interface SocketEvents {
  'connected': (data: { playerId: string; playerName: string }) => void;
  'disconnected': () => void;
  'error': (error: string) => void;

  // Room events
  'room_created': (roomInfo: RoomInfo) => void;
  'room_joined': (roomInfo: RoomInfo) => void;
  'room_left': () => void;
  'room_updated': (roomInfo: RoomInfo) => void;
  'room_state': (state: { playerCount: number; maxPlayers: number; players: any[] }) => void;
  'player_joined': (player: { id: string; name: string }) => void;
  'player_left': (playerId: string) => void;

  // Game events
  'game_started': (data?: { players: any[]; gameState: any }) => void;
  'game_ready': (data: { hostPlayer: any; joinerPlayer: any; gameMode: string }) => void;
  'game_state': (state: any) => void;
  'game_exit': (data: { exitedBy: string; reason: string; finalScores: number[]; timestamp: number }) => void;
  'player_input': (data: { playerId: string; playerIndex?: number; input: any }) => void;

  // Chat events
  'chat_message': (message: any) => void;
  'system_message': (message: string) => void;

  // Tournament-specific events (old system)
  'tournament_match_room': (data: {
    roomId: string;
    tournamentId: string;
    matchId: string;
    match?: any;
    hostPlayer: { id: string; name: string };
  }) => void;
  'tournament_match_room_ack': (data: {
    status: 'sent' | 'error';
    opponentExternalId?: string;
    deliveredTo?: string;
    reason?: string;
  }) => void;
  'tournament_snapshot': (data: { tournaments: ServerTournamentState[] }) => void;
  'tournament_update': (data: { tournament: ServerTournamentState }) => void;
  'tournament_created': (data: { tournament: ServerTournamentState }) => void;
  'tournament_joined': (data: { tournament: ServerTournamentState }) => void;
  'tournament_started': (data: { tournament: ServerTournamentState }) => void;
  'tournament_ack': (data: any) => void;
  'tournament_error': (data: { reason: string }) => void;

  // New tournament system events
  'tournament_updated': (data: any) => void;
  'round_started': (data: any) => void;
  'match_ready': (data: any) => void;
  'match_completed': (data: any) => void;
  'round_completed': (data: any) => void;
  'tournament_completed': (data: any) => void;
  'player_eliminated': (data: any) => void;
  'tournament_match_ready': (data: {
    tournamentId: string;
    matchId: string;
    role: 'host' | 'guest';
    match: ServerTournamentMatch;
  }) => void;
  'both_players_ready': (data: {
    tournamentId: string;
    matchId: string;
    players: string[];
  }) => void;
}

export class SocketManager {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private currentRoom: string | null = null;
  private playerId: string = '';
  private playerName: string = 'Player';
  private externalId: string | null = null;
  private eventHandlers: Map<keyof SocketEvents, Function[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // WebSocket server URL - dynamically detect protocol and avoid fixed IPs
  private getServerURL(): string {
    const env = (import.meta as any).env;
    if (env?.VITE_SOCKET_URL) {
      return env.VITE_SOCKET_URL;
    }

    // Auto-detect based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '3020';
    return `${protocol}//${host}:${port}`;
  }

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    const events: Array<keyof SocketEvents> = [
      'connected',
      'disconnected',
      'error',
      'room_created',
      'room_joined',
      'room_left',
      'room_updated',
      'room_state',
      'player_joined',
      'player_left',
      'game_started',
      'game_ready',
      'game_state',
      'game_exit',
      'player_input',
      'chat_message',
      'system_message',
      'tournament_match_room',
      'tournament_match_room_ack',
      'tournament_snapshot',
      'tournament_update',
      'tournament_created',
      'tournament_joined',
      'tournament_started',
      'tournament_ack',
      'tournament_error',
      'tournament_match_ready'
    ];

    events.forEach(event => {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, []);
      }
    });
  }

  public async connect(playerName: string = 'Player', externalId?: string): Promise<boolean> {
    if (externalId) {
      this.externalId = String(externalId);
    }

    if (this.isConnected) {
      console.log('Already connected to WebSocket server');
      if (playerName && playerName !== this.playerName) {
        this.playerName = playerName;
      }
      return true;
    }

    this.playerName = playerName;
    const serverURL = this.getServerURL();

    try {
      console.log(`🔌 Connecting to WebSocket server at ${serverURL}...`);

      this.socket = new WebSocket(serverURL);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;

          console.log(`✅ Connected to WebSocket server`);

          // Register player with server
          this.send('register_player', {
            name: this.playerName,
            externalId: this.externalId ?? undefined
          });

          this.setupSocketEventListeners();
          resolve(true);
        };

        this.socket!.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket connection failed:', error);
          this.emit('error', 'Connection failed');
          reject(error);
        };

        this.socket!.onclose = (event) => {
          console.log('🔌 Disconnected from WebSocket server:', event.code, event.reason);
          this.isConnected = false;
          this.currentRoom = null;
          this.emit('disconnected');

          // Auto-reconnect logic
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.reconnectTimer = setTimeout(() => {
              this.connect(this.playerName);
            }, 1000 * this.reconnectAttempts);
          }
        };
      });
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket connection:', error);
      this.emit('error', 'Failed to initialize connection');
      return false;
    }
  }

  private setupSocketEventListeners(): void {
    if (!this.socket) return;

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }

  private handleMessage(message: any): void {
    const { type } = message;

    switch (type) {
      case 'registered':
        this.playerId = message.id;
        console.log(`👤 Registered as ${message.name} (${this.playerId})`);
        this.emit('connected', { playerId: this.playerId, playerName: message.name });
        break;

      case 'room_created':
        this.currentRoom = message.roomId;
        console.log(`🏠 Room created: ${message.roomId}`);
        this.emit('room_created', message);
        break;

      case 'room_joined':
        this.currentRoom = message.roomId;
        console.log(`🚪 Joined room: ${message.roomId}`);
        this.emit('room_joined', message);
        break;

      case 'room_updated':
        console.log(`🔄 Room updated:`, message);
        this.emit('room_updated', message);
        break;

      case 'room_state':
        console.log(`📊 Room state:`, message);
        this.emit('room_state', message);
        break;

      case 'player_joined':
        console.log(`👤 Player joined: ${message.name}`);
        this.emit('player_joined', message);
        break;

      case 'player_left':
        console.log(`👋 Player left: ${message.id}`);
        this.emit('player_left', message.id);
        break;

      case 'game_started':
        console.log('🎮 Game started!', message);
        this.emit('game_started', message);
        break;

      case 'game_ready':
        console.log('🎮 Game ready:', message);
        this.emit('game_ready', message);
        break;

      case 'game_state':
        this.emit('game_state', message.state || message);
        break;

      case 'game_exit':
        console.log('🚪 Game exit:', message);
        this.emit('game_exit', message);
        break;

      case 'player_input':
        this.emit('player_input', message);
        break;

      case 'chat_message':
        this.emit('chat_message', message);
        break;

      case 'system_message':
        this.emit('system_message', message.message);
        break;

      case 'tournament_match_room':
        this.emit('tournament_match_room', {
          roomId: message.roomId,
          tournamentId: message.tournamentId,
          matchId: message.matchId,
          match: message.match,
          hostPlayer: message.hostPlayer
        });
        break;

      case 'tournament_match_room_ack':
        this.emit('tournament_match_room_ack', message);
        break;

      case 'tournament_snapshot':
        this.emit('tournament_snapshot', {
          tournaments: Array.isArray(message.tournaments) ? message.tournaments : []
        });
        break;

      case 'tournament_update':
        if (message.tournament) {
          this.emit('tournament_update', { tournament: message.tournament });
        }
        break;

      case 'tournament_created':
        if (message.tournament) {
          this.emit('tournament_created', { tournament: message.tournament });
        }
        break;

      case 'tournament_joined':
        if (message.tournament) {
          this.emit('tournament_joined', { tournament: message.tournament });
        }
        break;

      case 'tournament_started':
        if (message.tournament) {
          this.emit('tournament_started', { tournament: message.tournament });
        }
        break;

      case 'tournament_ack':
        this.emit('tournament_ack', message);
        break;

      case 'tournament_error':
        this.emit('tournament_error', { reason: message.reason || 'unknown_error' });
        break;

      case 'tournament_match_ready':
        if (message.match && message.tournamentId && message.matchId) {
          this.emit('tournament_match_ready', {
            tournamentId: message.tournamentId,
            matchId: message.matchId,
            role: message.role === 'host' ? 'host' : 'guest',
            match: message.match
          });
        }
        break;

      // New tournament system events
      case 'tournament_updated':
        this.emit('tournament_updated', message);
        break;

      case 'round_started':
        this.emit('round_started', message);
        break;

      case 'match_ready':
        this.emit('match_ready', message);
        break;

      case 'match_completed':
        this.emit('match_completed', message);
        break;

      case 'round_completed':
        this.emit('round_completed', message);
        break;

      case 'tournament_completed':
        this.emit('tournament_completed', message);
        break;

      case 'player_eliminated':
        this.emit('player_eliminated', message);
        break;

      case 'error':
        console.error('❌ WebSocket error:', message.error);
        this.emit('error', message.error);
        break;

      case 'server_shutdown':
        console.warn('⚠️ Server is shutting down');
        this.emit('system_message', message.message || 'Server is shutting down');
        break;

      default:
        console.warn('❌ WebSocket error: Unknown message type:', type);
    }
  }

  private send(type: string, data: any = {}): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = { type, ...data };
      this.socket.send(JSON.stringify(message));
    }
  }

  public sendCommand(type: string, data: Record<string, any> = {}): void {
    this.send(type, data);
  }

  /**
   * Create a new game room
   */
  public async createRoom(gameMode: '2p' | '4p' = '2p'): Promise<string | null> {
    if (!this.isConnected || !this.socket) {
      console.error('Not connected to server');
      return null;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room creation timeout'));
      }, 5000);

      this.send('create_room', {
        gameMode,
        playerName: this.playerName
      });

      // Listen for room creation response
      const onRoomCreated = (roomInfo: RoomInfo) => {
        clearTimeout(timeout);
        this.off('room_created', onRoomCreated);
        resolve(roomInfo.roomId);
      };

      const onError = (error: string) => {
        clearTimeout(timeout);
        this.off('error', onError);
        reject(new Error(error));
      };

      this.on('room_created', onRoomCreated);
      this.on('error', onError);
    });
  }

  public announceTournamentMatchRoom(params: {
    roomId: string;
    tournamentId: string;
    matchId: string;
    opponentExternalId: string;
    match?: any;
    hostName?: string;
  }): void {
    if (!this.isConnected || !this.socket) {
      console.warn('Cannot announce tournament match room without an active connection');
      return;
    }

    const payload = {
      roomId: params.roomId,
      tournamentId: params.tournamentId,
      matchId: params.matchId,
      opponentExternalId: params.opponentExternalId,
      match: params.match,
      hostName: params.hostName || this.playerName
    };

    this.send('tournament_match_room', payload);
  }

  /**
   * Join an existing room
   */
  public async joinRoom(roomId: string): Promise<boolean> {
    if (!this.isConnected || !this.socket) {
      console.error('Not connected to server');
      return false;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room join timeout'));
      }, 5000);

      this.send('join_room', {
        roomId,
        playerName: this.playerName
      });

      const onRoomJoined = () => {
        clearTimeout(timeout);
        this.off('room_joined', onRoomJoined);
        resolve(true);
      };

      const onError = (error: string) => {
        clearTimeout(timeout);
        this.off('error', onError);
        reject(new Error(error));
      };

      this.on('room_joined', onRoomJoined);
      this.on('error', onError);
    });
  }

  /**
   * Leave current room
   */
  public leaveRoom(): void {
    if (this.socket && this.currentRoom) {
      this.send('leave_room', { roomId: this.currentRoom });
      this.currentRoom = null;
      this.emit('room_left');
    }
  }

  /**
   * Send game state (host only)
   */
  public sendGameState(state: any): void {
    if (this.socket && this.currentRoom) {
      this.send('game_state', {
        roomId: this.currentRoom,
        state
      });
    }
  }

  /**
   * Send player input
   */
  public sendPlayerInput(input: any): void {
    if (this.socket && this.currentRoom) {
      this.send('player_input', {
        roomId: this.currentRoom,
        playerId: this.playerId,
        input
      });
    }
  }

  /**
   * Send chat message
   */
  public sendChatMessage(message: string): void {
    if (this.socket && this.currentRoom) {
      this.send('chat_message', {
        roomId: this.currentRoom,
        playerId: this.playerId,
        playerName: this.playerName,
        message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Start game (host only)
   */
  public startGame(): void {
    if (this.socket && this.currentRoom) {
      this.send('start_game', { roomId: this.currentRoom });
    }
  }

  /**
   * Event listener management
   */
  public on<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as Function)(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = null;
      this.playerId = '';
    }
  }

  /**
   * Getters
   */
  public get connected(): boolean {
    return this.isConnected;
  }

  public get roomId(): string | null {
    return this.currentRoom;
  }

  public get id(): string {
    return this.playerId;
  }

  public get name(): string {
    return this.playerName;
  }

  public get externalPlayerId(): string | null {
    return this.externalId;
  }

  /**
   * Check if Web socket server is available
   */
  public static async checkServerAvailability(): Promise<boolean> {
    try {
      // Auto-detect health check URL
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const host = window.location.hostname;
      const port = '3020';
      const url = `${protocol}//${host}:${port}/health`;

      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
export const socketManager = new SocketManager();

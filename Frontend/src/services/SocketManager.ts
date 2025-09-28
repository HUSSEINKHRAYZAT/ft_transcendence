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
}

export class SocketManager {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private currentRoom: string | null = null;
  private playerId: string = '';
  private playerName: string = 'Player';
  private eventHandlers: Map<keyof SocketEvents, Function[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectTimer: NodeJS.Timeout | null = null;

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
    // Initialize event handler storage
    Object.keys({} as SocketEvents).forEach(event => {
      this.eventHandlers.set(event as keyof SocketEvents, []);
    });
  }

  public async connect(playerName: string = 'Player'): Promise<boolean> {
    if (this.isConnected) {
      console.log('Already connected to WebSocket server');
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
            name: this.playerName
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

      case 'error':
        console.error('❌ WebSocket error:', message.error);
        this.emit('error', message.error);
        break;

      case 'server_shutdown':
        console.warn('⚠️ Server is shutting down');
        this.emit('system_message', message.message || 'Server is shutting down');
        break;

      default:
        console.warn('Unknown message type:', type, message);
    }
  }

  private send(type: string, data: any = {}): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = { type, ...data };
      this.socket.send(JSON.stringify(message));
    }
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

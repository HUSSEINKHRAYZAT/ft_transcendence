/**
 * Socket.IO Manager for FT_PONG Real-time Multiplayer
 * Handles room-based multiplayer with automatic fallback
 */

import { io, Socket } from 'socket.io-client';

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
  // Connection events
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
  'game_started': () => void;
  'game_state': (state: any) => void;
  'player_input': (data: { playerId: string; input: any }) => void;
  
  // Chat events
  'chat_message': (message: any) => void;
  'system_message': (message: string) => void;
}

export class SocketManager {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentRoom: string | null = null;
  private playerId: string = '';
  private playerName: string = 'Player';
  private eventHandlers: Map<keyof SocketEvents, Function[]> = new Map();
  
  // Socket.IO server URL - can be configured via environment
  private readonly SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  
  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Initialize event handler storage
    Object.keys({} as SocketEvents).forEach(event => {
      this.eventHandlers.set(event as keyof SocketEvents, []);
    });
  }

  /**
   * Connect to Socket.IO server
   */
  public async connect(playerName: string = 'Player'): Promise<boolean> {
    if (this.isConnected) {
      console.log('Already connected to Socket.IO server');
      return true;
    }

    this.playerName = playerName;

    try {
      console.log(`🔌 Connecting to Socket.IO server at ${this.SERVER_URL}...`);
      
      this.socket = io(this.SERVER_URL, {
        transports: ['websocket', 'polling'], // WebSocket first, fallback to polling
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        autoConnect: true
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.playerId = this.socket!.id;
          
          console.log(`✅ Connected to Socket.IO server. Player ID: ${this.playerId}`);
          
          // Register player with server
          this.socket!.emit('register_player', {
            name: this.playerName,
            id: this.playerId
          });

          this.setupSocketEventListeners();
          this.emit('connected', { playerId: this.playerId!, playerName: this.playerName });
          resolve(true);
        });

        this.socket!.on('connect_error', (error: Error) => {
          clearTimeout(timeout);
          console.error('❌ Socket.IO connection failed:', error.message);
          this.emit('error', `Connection failed: ${error.message}`);
          reject(error);
        });

        this.socket!.on('disconnect', (reason: string) => {
          console.log('🔌 Disconnected from Socket.IO server:', reason);
          this.isConnected = false;
          this.currentRoom = null;
          this.emit('disconnected');
        });
      });
    } catch (error) {
      console.error('❌ Failed to initialize Socket.IO connection:', error);
      this.emit('error', 'Failed to initialize connection');
      return false;
    }
  }

  private setupSocketEventListeners(): void {
    if (!this.socket) return;

    // Room events
    this.socket.on('room_created', (roomInfo: RoomInfo) => {
      this.currentRoom = roomInfo.roomId;
      console.log(`🏠 Room created: ${roomInfo.roomId}`);
      this.emit('room_created', roomInfo);
    });

    this.socket.on('room_joined', (roomInfo: RoomInfo) => {
      this.currentRoom = roomInfo.roomId;
      console.log(`🚪 Joined room: ${roomInfo.roomId}`);
      this.emit('room_joined', roomInfo);
    });

    this.socket.on('room_updated', (roomInfo: RoomInfo) => {
      console.log(`🔄 Room updated:`, roomInfo);
      this.emit('room_updated', roomInfo);
    });

    this.socket.on('room_state', (state: { playerCount: number; maxPlayers: number; players: any[] }) => {
      console.log(`📊 Room state:`, state);
      this.emit('room_state', state);
    });

    this.socket.on('player_joined', (player: { id: string; name: string }) => {
      console.log(`👤 Player joined: ${player.name}`);
      this.emit('player_joined', player);
    });

    this.socket.on('player_left', (playerId: string) => {
      console.log(`👋 Player left: ${playerId}`);
      this.emit('player_left', playerId);
    });

    // Game events
    this.socket.on('game_started', () => {
      console.log('🎮 Game started!');
      this.emit('game_started');
    });

    this.socket.on('game_state', (state: any) => {
      this.emit('game_state', state);
    });

    this.socket.on('player_input', (data: { playerId: string; input: any }) => {
      this.emit('player_input', data);
    });

    // Chat events
    this.socket.on('chat_message', (message: any) => {
      this.emit('chat_message', message);
    });

    this.socket.on('system_message', (message: string) => {
      this.emit('system_message', message);
    });

    // Error handling
    this.socket.on('error', (error: string) => {
      console.error('❌ Socket.IO error:', error);
      this.emit('error', error);
    });
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

      this.socket!.emit('create_room', {
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

      this.socket!.emit('join_room', {
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
      this.socket.emit('leave_room', { roomId: this.currentRoom });
      this.currentRoom = null;
      this.emit('room_left');
    }
  }

  /**
   * Send game state (host only)
   */
  public sendGameState(state: any): void {
    if (this.socket && this.currentRoom) {
      this.socket.emit('game_state', {
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
      this.socket.emit('player_input', {
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
      this.socket.emit('chat_message', {
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
      this.socket.emit('start_game', { roomId: this.currentRoom });
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
    if (this.socket) {
      this.socket.disconnect();
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
   * Check if Socket.IO server is available
   */
  public static async checkServerAvailability(serverUrl?: string): Promise<boolean> {
    const url = serverUrl || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${url.replace('/socket.io', '')}/health`, {
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
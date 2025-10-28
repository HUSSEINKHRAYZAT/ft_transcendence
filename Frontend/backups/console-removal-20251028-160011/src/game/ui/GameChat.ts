/**
 * Live Chat System for FT_PONG Game
 * Supports real-time messaging during gameplay using WebSockets
 */

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'message' | 'system' | 'join' | 'leave';
}

export interface ChatUser {
  id: string;
  name: string;
  isConnected: boolean;
}

export class GameChat {
  private container: HTMLElement | null = null;
  private isVisible: boolean = false;
  private messages: ChatMessage[] = [];
  private users: Map<string, ChatUser> = new Map();
  private currentUser: ChatUser | null = null;
  private socket: WebSocket | null = null;
  private messageSound: HTMLAudioElement | null = null;
  
  // Chat settings
  private maxMessages: number = 100;
  private isMinimized: boolean = false;
  
  constructor(gameContainer: HTMLElement, user: ChatUser, socket?: WebSocket) {
    this.currentUser = user;
    this.socket = socket || null;
    this.init(gameContainer);
    this.setupSockets();
    this.setupSounds();
  }

  private init(gameContainer: HTMLElement): void {
    this.container = this.createChatContainer();
    gameContainer.appendChild(this.container);
    this.setupEventListeners();
    console.log('🎮 Game chat initialized');
  }

  private createChatContainer(): HTMLElement {
    const chatContainer = document.createElement('div');
    chatContainer.id = 'game-chat';
    chatContainer.className = 'fixed bottom-4 right-4 w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-lime-500/30 shadow-2xl transform transition-all duration-300 z-50';
    
    chatContainer.innerHTML = `
      <!-- Chat Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-lime-500 rounded-full animate-pulse"></div>
          <h3 class="text-white font-semibold text-sm">Game Chat</h3>
          <span id="chat-user-count" class="text-xs text-gray-400">(1 player)</span>
        </div>
        <div class="flex items-center gap-2">
          <button id="chat-minimize" class="text-gray-400 hover:text-white transition-colors p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
          </button>
          <button id="chat-close" class="text-gray-400 hover:text-white transition-colors p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div id="chat-messages" class="h-64 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <div class="text-center text-gray-400 text-xs py-2">
          Welcome to the game chat! 👋
        </div>
      </div>

      <!-- Chat Input -->
      <div class="p-3 border-t border-gray-700/50">
        <div class="flex items-center gap-2">
          <input 
            type="text" 
            id="chat-input" 
            placeholder="Type a message..." 
            class="flex-1 bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500/50 transition-all"
            maxlength="500"
          >
          <button 
            id="chat-send" 
            class="bg-lime-500 hover:bg-lime-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          Press Enter to send • ESC to toggle chat
        </div>
      </div>
    `;

    return chatContainer;
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Chat toggle and minimize
    const minimizeBtn = this.container.querySelector('#chat-minimize') as HTMLButtonElement;
    const closeBtn = this.container.querySelector('#chat-close') as HTMLButtonElement;
    const chatInput = this.container.querySelector('#chat-input') as HTMLInputElement;
    const sendBtn = this.container.querySelector('#chat-send') as HTMLButtonElement;

    minimizeBtn?.addEventListener('click', () => this.toggleMinimize());
    closeBtn?.addEventListener('click', () => this.hide());
    
    // Message sending
    sendBtn?.addEventListener('click', () => this.sendMessage());
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // ESC to toggle chat
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey) {
        this.toggle();
      }
      
      // Ctrl+Enter to focus chat input
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        this.show();
        chatInput?.focus();
      }
    });
  }

  private setupSockets(): void {
    if (!this.socket) return;

    this.socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'chat_message':
            this.addMessage(data.message);
            break;
          case 'user_joined':
            this.handleUserJoin(data.user);
            break;
          case 'user_left':
            this.handleUserLeave(data.userId);
            break;
          case 'user_list':
            this.updateUserList(data.users);
            break;
        }
      } catch (error) {
        console.error('Error handling chat socket message:', error);
      }
    });

    // Send join message
    this.sendSocketMessage({
      type: 'join_chat',
      user: this.currentUser
    });
  }

  private setupSounds(): void {
    // Create subtle message notification sound
    this.messageSound = new Audio();
    this.messageSound.volume = 0.3;
    // Using a simple beep sound data URL for compatibility
    this.messageSound.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+H';
  }

  public sendMessage(): void {
    const chatInput = this.container?.querySelector('#chat-input') as HTMLInputElement;
    if (!chatInput || !this.currentUser) return;

    const message = chatInput.value.trim();
    if (!message) return;

    const chatMessage: ChatMessage = {
      id: this.generateMessageId(),
      playerId: this.currentUser.id,
      playerName: this.currentUser.name,
      message: message,
      timestamp: Date.now(),
      type: 'message'
    };

    // Add to local messages immediately for responsiveness
    this.addMessage(chatMessage);
    
    // Send to other players via socket
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSocketMessage({
        type: 'chat_message',
        message: chatMessage
      });
    }

    // Clear input
    chatInput.value = '';
  }

  public addMessage(message: ChatMessage): void {
    this.messages.push(message);
    
    // Limit message history
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    this.renderMessage(message);
    this.scrollToBottom();
    
    // Play sound for incoming messages (not from current user)
    if (message.playerId !== this.currentUser?.id && this.messageSound) {
      this.messageSound.currentTime = 0;
      this.messageSound.play().catch(() => {}); // Ignore audio play errors
    }
  }

  private renderMessage(message: ChatMessage): void {
    const messagesContainer = this.container?.querySelector('#chat-messages');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    const isOwnMessage = message.playerId === this.currentUser?.id;
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    switch (message.type) {
      case 'message':
        messageElement.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;
        messageElement.innerHTML = `
          <div class="${isOwnMessage ? 'bg-lime-600' : 'bg-gray-700'} max-w-xs px-3 py-2 rounded-2xl ${isOwnMessage ? 'rounded-br-md' : 'rounded-bl-md'}">
            ${!isOwnMessage ? `<div class="text-xs font-medium text-lime-400 mb-1">${this.escapeHtml(message.playerName)}</div>` : ''}
            <div class="text-white text-sm break-words">${this.escapeHtml(message.message)}</div>
            <div class="text-xs ${isOwnMessage ? 'text-lime-200' : 'text-gray-400'} mt-1">${time}</div>
          </div>
        `;
        break;
      
      case 'system':
      case 'join':
      case 'leave':
        messageElement.className = 'text-center';
        messageElement.innerHTML = `
          <div class="text-xs text-gray-400 bg-gray-800/50 rounded-full px-3 py-1 inline-block">
            ${message.type === 'join' ? '🎮' : message.type === 'leave' ? '👋' : 'ℹ️'} ${this.escapeHtml(message.message)}
          </div>
        `;
        break;
    }

    messagesContainer.appendChild(messageElement);
  }

  private scrollToBottom(): void {
    const messagesContainer = this.container?.querySelector('#chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private handleUserJoin(user: ChatUser): void {
    this.users.set(user.id, user);
    this.updateUserCount();
    
    if (user.id !== this.currentUser?.id) {
      this.addMessage({
        id: this.generateMessageId(),
        playerId: 'system',
        playerName: 'System',
        message: `${user.name} joined the game`,
        timestamp: Date.now(),
        type: 'join'
      });
    }
  }

  private handleUserLeave(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
      this.updateUserCount();
      
      this.addMessage({
        id: this.generateMessageId(),
        playerId: 'system',
        playerName: 'System',
        message: `${user.name} left the game`,
        timestamp: Date.now(),
        type: 'leave'
      });
    }
  }

  private updateUserList(users: ChatUser[]): void {
    this.users.clear();
    users.forEach(user => this.users.set(user.id, user));
    this.updateUserCount();
  }

  private updateUserCount(): void {
    const userCountElement = this.container?.querySelector('#chat-user-count');
    if (userCountElement) {
      const count = this.users.size;
      userCountElement.textContent = `(${count} player${count !== 1 ? 's' : ''})`;
    }
  }

  private sendSocketMessage(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  private generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API
  public show(): void {
    if (!this.container) return;
    this.isVisible = true;
    this.container.style.display = 'block';
    this.container.classList.remove('translate-y-full', 'opacity-0');
    this.scrollToBottom();
  }

  public hide(): void {
    if (!this.container) return;
    this.isVisible = false;
    this.container.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => {
      if (this.container) this.container.style.display = 'none';
    }, 300);
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public toggleMinimize(): void {
    if (!this.container) return;
    
    const messagesContainer = this.container.querySelector('#chat-messages') as HTMLElement;
    const inputContainer = this.container.querySelector('.p-3.border-t') as HTMLElement;
    const minimizeBtn = this.container.querySelector('#chat-minimize svg') as SVGElement;
    
    this.isMinimized = !this.isMinimized;
    
    if (this.isMinimized) {
      messagesContainer.style.display = 'none';
      inputContainer.style.display = 'none';
      minimizeBtn.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>';
    } else {
      messagesContainer.style.display = 'block';
      inputContainer.style.display = 'block';
      minimizeBtn.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>';
      this.scrollToBottom();
    }
  }

  public addSystemMessage(message: string): void {
    this.addMessage({
      id: this.generateMessageId(),
      playerId: 'system',
      playerName: 'System',
      message: message,
      timestamp: Date.now(),
      type: 'system'
    });
  }

  public destroy(): void {
    if (this.socket) {
      this.sendSocketMessage({
        type: 'leave_chat',
        userId: this.currentUser?.id
      });
    }
    
    if (this.container) {
      this.container.remove();
    }
    
    this.messages = [];
    this.users.clear();
    
    console.log('🎮 Game chat destroyed');
  }
}
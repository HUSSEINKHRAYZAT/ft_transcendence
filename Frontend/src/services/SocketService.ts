import { AuthService } from "./AuthService";
import { WS_URL , API_BASE_URL} from "../utils/Constants";

export interface SocketMessage {
    type: string;
    [key: string]: any;
}

export interface DirectMessageData {
    from: string;
    to?: string;
    text: string;
}

export interface FriendStatusData {
    username: string;
}

export class SocketService {
    private socket: WebSocket | null = null;
    private token: string = "";
    private authService: AuthService;
    private userId: string = "";
    private username: string = "";
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;
    private messageQueue: Array<{to: string, text: string}> = [];
    private isConnecting: boolean = false;
    private processedMessages: Set<string> = new Set();
    private heartbeatInterval: number | null = null;
    private connectionCheckInterval: number | null = null;
    private lastProcessedMessage: Map<string, string> = new Map();

    constructor(token: string, authService: AuthService) {
        this.token = token;
        this.authService = authService;

        (window as any).socketService = this;
        this.handleSendMessageRequest = this.handleSendMessageRequest.bind(this);

        window.addEventListener('send-message-request', this.handleSendMessageRequest as EventListener);
        console.log("SocketService: send-message-request listener added");

        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        window.addEventListener('user-logout', this.handleUserLogout.bind(this) as EventListener);

        this.checkStoredSession();
    }

    private checkStoredSession(): void {
        try {
            const userData = localStorage.getItem('ft_pong_user_data');
            if (userData) {
                const user = JSON.parse(userData);
                if (user?.id && user?.userName) {
                    console.log("[SocketService] Restoring connection for stored user session");
                    this.userId = user.id;
                    this.username = user.userName;
                    this.connect(user.id, user.userName);
                }
            }
        } catch (error) {
            console.error("[SocketService] Error restoring session:", error);
        }
    }

    public connect(userId: string, username: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.warn("[SocketService] Socket already connected.");
            return;
        }

        if (this.isConnecting) {
            console.warn("[SocketService] Socket connection already in progress.");
            return;
        }

        this.isConnecting = true;
        this.userId = userId;
        this.username = username;

        const url = `${WS_URL}?token=${this.token}`;
        console.log("[SocketService] Connecting to WebSocket:", url);

        try {
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                console.log("[SocketService] Connected to WebSocket.");
                this.reconnectAttempts = 0;
                this.isConnecting = false;
                this.authService.setStatus("online", userId);

                // Process any queued messages
                this.processMessageQueue();

                // Start heartbeat to keep connection alive
                this.startHeartbeat();

                // Start connection checker
                this.startConnectionChecker();

                // Broadcast initial status to update UI immediately
                this.broadcastStatus(username, "online");

                // Notify FriendsBox about reconnection to reload messages
                window.dispatchEvent(new CustomEvent('socket-reconnected'));
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(event);
            };

            this.socket.onclose = (event) => {
                console.warn(`[SocketService] Disconnected. Code: ${event.code}, Reason: ${event.reason}`);
                this.isConnecting = false;
                this.stopHeartbeat();
                this.stopConnectionChecker();

                // Only set offline if not a normal closure or logout
                if (event.code !== 1000) {
                    this.authService.setStatus("offline", userId);
                    this.handleReconnect();
                } else {
                    // Broadcast offline status to update UI immediately
                    this.broadcastStatus(username, "offline");
                }
            };

            this.socket.onerror = (error) => {
                console.error("[SocketService] Error:", error);
                this.isConnecting = false;
            };
        } catch (error) {
            console.error("[SocketService] Error creating WebSocket:", error);
            this.isConnecting = false;
        }
    }

    private startHeartbeat(): void {
        this.stopHeartbeat(); // Clear any existing interval

        // Send a ping every 30 seconds to keep the connection alive
        this.heartbeatInterval = window.setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                console.log("[SocketService] Sending heartbeat ping");
                try {
                    this.socket.send(JSON.stringify({ type: 'ping' }));
                } catch (error) {
                    console.error("[SocketService] Error sending heartbeat:", error);
                }
            }
        }, 30000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private startConnectionChecker(): void {
        this.stopConnectionChecker();

        this.connectionCheckInterval = window.setInterval(() => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                if (this.userId && this.username && !this.isConnecting) {
                    console.warn("[SocketService] Connection lost, attempting reconnect");
                    this.connect(this.userId, this.username);
                }
            }
        }, 10000);
    }

    private stopConnectionChecker(): void {
        if (this.connectionCheckInterval !== null) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    private broadcastStatus(username: string, status: string): void {
        // Manually trigger a status change event to update UI immediately
        window.dispatchEvent(new CustomEvent('friend-status-change', {
            detail: {
                username: username,
                status: status
            }
        }));
    }

    private handleBeforeUnload(): void {
        // Set status to offline when the user closes the browser
        if (this.userId) {
            try {
                // Use fetch with keepalive to ensure the PATCH is sent on unload
                fetch(`${API_BASE_URL}/users/${this.userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: "offline" }),
                    keepalive: true
                }).catch(() => {});
            } catch (error) {
                console.error("[SocketService] Error sending offline status on unload:", error);
            }

            // Manually broadcast offline status to update UI immediately
            if (this.username) {
                this.broadcastStatus(this.username, "offline");
            }
        }
    }

    private handleUserLogout(event: Event): void {
        const userId = (event as CustomEvent).detail?.userId || this.userId;
        if (userId) {
            const username = this.username;
            this.disconnect(userId).catch(err => {
                console.error("[SocketService] Error during logout disconnect:", err);
            });

            // Manually broadcast offline status
            if (username) {
                this.broadcastStatus(username, "offline");
            }
        }
    }

    private logReceivedMessage(message: any): void {
        console.log('[SocketService] Raw message received:', JSON.stringify(message, null, 2));
    }

    private normalizeMessage(rawMessage: any): SocketMessage {
    if (rawMessage.t && !rawMessage.type) {
        const normalized = { ...rawMessage };
        normalized.type = rawMessage.t;
        delete normalized.t;
        return normalized;
    }
    return rawMessage;
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const rawMessage = JSON.parse(event.data);
            const message: SocketMessage = this.normalizeMessage(rawMessage);
            this.logReceivedMessage(message);

            switch (message.type) {
                case 'friend-online':
                    this.handleFriendOnline(message);
                    break;

                case 'friend-offline':
                    this.handleFriendOffline(message);
                    break;

                case 'direct-message':
                    this.handleDirectMessageReceived(message);
                    break;

                case 'friends-list-updated':
                case 'friend-accepted':
                case 'friend-removed':
                    // Refresh friends list in UI without a page reload
                    window.dispatchEvent(new Event('friends-list-changed'));
                    if (message.type === 'friend-accepted') {
                        const username = message.username || message.userName || '';
                        this.showToast('success', 'Friend Added', username ? `${username} accepted your request` : 'Friend request accepted');
                    }
                    if (message.type === 'friend-removed') {
                        const username = message.username || message.userName || '';
                        this.showToast('info', 'Friend Removed', username ? `${username} removed from your friends` : 'Friend removed');
                    }
                    break;

                case 'error':
                    this.handleError(message);
                    break;

                case 'welcome':
                    console.log('[SocketService] Welcome message:', message);
                    break;

                case 'pong':
                    console.log('[SocketService] Received heartbeat pong');
                    break;

                default:
                    console.warn("[SocketService] Unknown message type:", message.type);
            }
        } catch (error) {
            console.error("[SocketService] Error parsing message:", error, event.data);
        }
    }

    private handleFriendOnline(data: any): void {
        // Backend sends: { "type": "friend-online", "username": "afayad123" }
        const username = data.username;
        console.log(`[SocketService] Friend ${username} is now online`);

        if (!username) {
            console.error('[SocketService] No username in friend-online message:', data);
            return;
        }

        // Emit custom event for FriendsBox to update status
        window.dispatchEvent(new CustomEvent('friend-status-change', {
            detail: {
                username: username,
                status: 'online'
            }
        }));

        // Show toast notification
        this.showToast('info', 'Friend Online', `${username} is now online`);
    }

    private handleFriendOffline(data: any): void {
        // Backend sends: { "type": "friend-offline", "username": "afayad123" }
        const username = data.username;
        console.log(`[SocketService] Friend ${username} is now offline`);

        if (!username) {
            console.error('[SocketService] No username in friend-offline message:', data);
            return;
        }

        // Emit custom event for FriendsBox to update status
        window.dispatchEvent(new CustomEvent('friend-status-change', {
            detail: {
                username: username,
                status: 'offline'
            }
        }));

        // Show toast notification
        this.showToast('info', 'Friend Offline', `${username} is now offline`);
    }

    private handleDirectMessageReceived(data: any): void {
            console.log("🔵 [SocketService] handleDirectMessageReceived called with:", data);

            const from = data.from;
            const text = data.text;
            const messageId = data.id || `received_${from}_${Date.now()}_${Math.random()}`;

            console.log(`🔵 [SocketService] Processing message - from: "${from}", text: "${text}"`);

            if (!from || !text) {
                console.error('🔵 [SocketService] Invalid message data received:', data);
                return;
            }

            // Enhanced duplicate detection
            const lastMessageKey = `received_${from}`;
            const lastMessage = this.lastProcessedMessage.get(lastMessageKey);

            // Check for duplicate messages by content and sender
            if (this.processedMessages.has(messageId) || lastMessage === text) {
                console.log('🔵 [SocketService] Duplicate message detected, ignoring:', { messageId, from, text });
                return;
            }

            this.processedMessages.add(messageId);
            this.lastProcessedMessage.set(lastMessageKey, text);

            // Limit processed messages set size
            if (this.processedMessages.size > 200) {
                const iterator = this.processedMessages.values();
                for (let i = 0; i < 50; i++) { // Remove oldest 50 messages
                    this.processedMessages.delete(iterator.next().value);
                }
            }

            console.log('🔵 [SocketService] Dispatching direct-message-received event');

            // Dispatch received event
            const receivedEvent = new CustomEvent('direct-message-received', {
                detail: {
                    from: from,
                    text: text,
                    timestamp: new Date(),
                    messageId: messageId
                }
            });

            window.dispatchEvent(receivedEvent);
            console.log('🔵 [SocketService] direct-message-received event dispatched successfully');

            // Show toast notification
            this.showToast('info', 'New Message', `${from}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    }


    private handleError(message: any): void {
        console.error("[SocketService] Server error:", message.error);
        this.showToast('error', 'Message Error', message.error || 'An error occurred');
    }

    private handleSendMessageRequest(event: CustomEvent): void {
        const { recipient, message, sender } = event.detail;

        // Include sender information if available
        if (sender) {
            console.log(`[SocketService] Sending message from ${sender} to ${recipient}`);
        }

        this.sendDirectMessage(recipient, message);
    }

    public sendDirectMessage(to: string, text: string): void {
        console.log(`🔴 [SocketService] sendDirectMessage called: to="${to}", text="${text}"`);

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn("🔴 [SocketService] Socket not connected, queueing message");
            this.messageQueue.push({ to, text });

            if (!this.isConnecting && this.userId && this.username) {
                this.connect(this.userId, this.username);
            }
            return;
        }

        const targetUsername = String(to).trim();
        const messageText = String(text).trim();

        if (!targetUsername || !messageText) {
            console.error("🔴 [SocketService] Invalid message data:", { to: targetUsername, text: messageText });
            this.showToast('error', 'Message Error', 'Invalid message data');
            return;
        }

        // Check for duplicate sends
        const lastSentKey = `sent_${targetUsername}`;
        const lastSentMessage = this.lastProcessedMessage.get(lastSentKey);

        if (lastSentMessage === messageText) {
            console.log("🔴 [SocketService] Duplicate send attempt detected, ignoring");
            return;
        }

        this.lastProcessedMessage.set(lastSentKey, messageText);

        const messageData = {
            type: 'direct-message',
            to: targetUsername,
            text: messageText
        };

        console.log("🔴 [SocketService] Sending to WebSocket:", JSON.stringify(messageData));

        try {
            // Send via WebSocket
            this.socket.send(JSON.stringify(messageData));
            console.log("🔴 [SocketService] WebSocket send successful");

            // Create unique message ID
            const messageId = `sent_${this.username}_${targetUsername}_${Date.now()}_${Math.random()}`;

            // Dispatch sent event IMMEDIATELY
            console.log("🔴 [SocketService] Dispatching direct-message-sent event");
            const sentEvent = new CustomEvent('direct-message-sent', {
                detail: {
                    to: targetUsername,
                    text: messageText,
                    timestamp: new Date(),
                    messageId: messageId
                }
            });

            window.dispatchEvent(sentEvent);
            console.log("🔴 [SocketService] direct-message-sent event dispatched successfully");

        } catch (error) {
            console.error("🔴 [SocketService] Error sending message:", error);
            this.showToast('error', 'Message Error', 'Failed to send message');
        }
    }

    private processMessageQueue(): void {
        if (this.messageQueue.length === 0) return;

        console.log(`[SocketService] Processing ${this.messageQueue.length} queued messages`);

        // Process all queued messages
        while (this.messageQueue.length > 0) {
            const { to, text } = this.messageQueue.shift()!;
            this.sendDirectMessage(to, text);
        }
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("[SocketService] Max reconnection attempts reached");
            this.showToast('error', 'Connection Lost', 'Unable to reconnect to server');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

        console.log(`[SocketService] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (this.userId && this.username) {
                this.connect(this.userId, this.username);
            }
        }, delay);
    }

    private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
        if ((window as any).notifyBox) {
            const notifyBox = (window as any).notifyBox;
            const fullMessage = title ? `${title}: ${message}` : message;
            notifyBox.addNotification(fullMessage, type);
        } else {
            console.warn('NotificationBox not available for toast:', title, message);
        }
    }

    public async disconnect(userId: string): Promise<void> {
        console.log(`[SocketService] Disconnecting user ${userId}...`);

        try {
            // Stop intervals
            this.stopHeartbeat();
            this.stopConnectionChecker();

            // Set status to offline before disconnecting
            await this.authService.setStatus("offline", userId);
            console.log(`[SocketService] User status set to offline`);

            if (this.socket) {
                // Close socket with normal closure code
                this.socket.close(1000, "User logout");
                this.socket = null;
                console.log(`[SocketService] WebSocket connection closed`);
            }
        } catch (error) {
            console.error("[SocketService] Error during disconnect:", error);
            throw error;
        }
    }

    public isConnected(): boolean {
        return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    }

    public getConnectionStatus(): string {
        if (!this.socket) return 'disconnected';

        switch (this.socket.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'disconnected';
            default: return 'unknown';
        }
    }
}

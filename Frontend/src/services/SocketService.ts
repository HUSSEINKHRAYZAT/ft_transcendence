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

export interface AvatarChangedData {
    username: string;
    avatar: string;
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
                    this.userId = user.id;
                    this.username = user.userName;
                    this.connect(user.id, user.userName);
                }
            }
        } catch (error) {

        }
    }

    public connect(userId: string, username: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        this.userId = userId;
        this.username = username;

        const url = `${WS_URL}?token=${this.token}`;

        try {
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
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

                this.isConnecting = false;
            };
        } catch (error) {

            this.isConnecting = false;
        }
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatInterval = window.setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                try {
                    this.socket.send(JSON.stringify({ type: 'ping' }));
                } catch (error) {

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

            });

            // Manually broadcast offline status
            if (username) {
                this.broadcastStatus(username, "offline");
            }
        }
    }

    private logReceivedMessage(message: any): void {
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

                case 'user-blocked':
                    this.handleUserBlocked(message);
                    break;

                case 'avatar-changed':
                    this.handleAvatarChanged(message);
                    break;

                case 'error':
                    this.handleError(message);
                    break;

                case 'welcome':

                    break;

                case 'pong':

                    break;

                default:

            }
        } catch (error) {

        }
    }

    private handleFriendOnline(data: any): void {
        const username = data.username;

        if (!username) {

            return;
        }

        window.dispatchEvent(new CustomEvent('friend-status-change', {
            detail: {
                username: username,
                status: 'online'
            }
        }));

    }

    private handleFriendOffline(data: any): void {
        const username = data.username;

        if (!username) {

            return;
        }

        // Emit custom event for FriendsBox to update status
        window.dispatchEvent(new CustomEvent('friend-status-change', {
            detail: {
                username: username,
                status: 'offline'
            }
        }));

        // Check if there's an active chat with this user and close it
        window.dispatchEvent(new CustomEvent('close-chat-if-active', {
            detail: {
                username: username
            }
        }));

        // Show toast notification
        this.showToast('info', 'Friend Offline', `${username} is now offline`);
    }

    private handleUserBlocked(data: any): void {
        const username = data.username;

        if (!username) {

            return;
        }

        // Refresh friends list to reflect the block
        window.dispatchEvent(new Event('friends-list-changed'));

        // Close any active chat with this user
        window.dispatchEvent(new CustomEvent('close-chat-if-active', {
            detail: {
                username: username
            }
        }));

        // Show toast notification
        this.showToast('warning', 'User Blocked', `${username} has blocked you`);
    }

    private handleAvatarChanged(data: any): void {
        const username = data.username;
        const avatar = data.avatar;

        if (!username) {

            return;
        }

        // Dispatch event to update friend's avatar in UI
        window.dispatchEvent(new CustomEvent('friend-avatar-changed', {
            detail: {
                username: username,
                avatar: avatar
            }
        }));

        // Show toast notification
        this.showToast('info', 'Avatar Updated', `${username} changed their avatar`);
    }

    private handleDirectMessageReceived(data: any): void {

            const from = data.from;
            const text = data.text;
            const messageId = data.id || `received_${from}_${Date.now()}_${Math.random()}`;

            if (!from || !text) {
                return;
            }

            // Enhanced duplicate detection
            const lastMessageKey = `received_${from}`;
            const lastMessage = this.lastProcessedMessage.get(lastMessageKey);

            // Check for duplicate messages by content and sender
            if (this.processedMessages.has(messageId) || lastMessage === text) {
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
    }

    private handleError(message: any): void {

        this.showToast('error', 'Message Error', message.error || 'An error occurred');
    }

    private handleSendMessageRequest(event: CustomEvent): void {
        const { recipient, message, sender } = event.detail;

        if (sender) {
        }

        this.sendDirectMessage(recipient, message);
    }

    public sendDirectMessage(to: string, text: string): void {

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.messageQueue.push({ to, text });

            if (!this.isConnecting && this.userId && this.username) {
                this.connect(this.userId, this.username);
            }
            return;
        }

        const targetUsername = String(to).trim();
        const messageText = String(text).trim();

        if (!targetUsername || !messageText) {

            this.showToast('error', 'Message Error', 'Invalid message data');
            return;
        }

        // Check for duplicate sends
        const lastSentKey = `sent_${targetUsername}`;
        const lastSentMessage = this.lastProcessedMessage.get(lastSentKey);

        if (lastSentMessage === messageText) {
            return;
        }

        this.lastProcessedMessage.set(lastSentKey, messageText);

        const messageData = {
            type: 'direct-message',
            to: targetUsername,
            text: messageText
        };

        try {
            // Send via WebSocket
            this.socket.send(JSON.stringify(messageData));

            // Create unique message ID
            const messageId = `sent_${this.username}_${targetUsername}_${Date.now()}_${Math.random()}`;

            const sentEvent = new CustomEvent('direct-message-sent', {
                detail: {
                    to: targetUsername,
                    text: messageText,
                    timestamp: new Date(),
                    messageId: messageId
                }
            });

            window.dispatchEvent(sentEvent);

        } catch (error) {

            this.showToast('error', 'Message Error', 'Failed to send message');
        }
    }

    public sendAvatarChanged(avatar: string): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {

            return;
        }

        const messageData = {
            type: 'avatar-changed',
            avatar: avatar
        };

        try {
            this.socket.send(JSON.stringify(messageData));

        } catch (error) {

        }
    }

    private processMessageQueue(): void {
        if (this.messageQueue.length === 0) return;

        // Process all queued messages
        while (this.messageQueue.length > 0) {
            const { to, text } = this.messageQueue.shift()!;
            this.sendDirectMessage(to, text);
        }
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {

            this.showToast('error', 'Connection Lost', 'Unable to reconnect to server');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

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

        }
    }

    public async disconnect(userId: string): Promise<void> {

        try {
            // Stop intervals
            this.stopHeartbeat();
            this.stopConnectionChecker();

            // Set status to offline before disconnecting
            await this.authService.setStatus("offline", userId);
            if (this.socket) {
                // Close socket with normal closure code
                this.socket.close(1000, "User logout");
                this.socket = null;
            }
        } catch (error) {

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

    public sendFriendAccepted(targetUsername: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {

        return;
    }

    const messageData = {
        type: 'friend-accepted',
        targetUsername: targetUsername
    };

    try {
        this.socket.send(JSON.stringify(messageData));

    } catch (error) {

    }
}

// Send user blocked notification
public sendUserBlocked(targetUsername: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {

        return;
    }

    const messageData = {
        type: 'user-blocked',
        targetUsername: targetUsername
    };

    try {
        this.socket.send(JSON.stringify(messageData));

    } catch (error) {

    }
}
}

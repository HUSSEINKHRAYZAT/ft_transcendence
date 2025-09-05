import { AuthService } from "./AuthService";
import { SOCKET_BASE_URL as WS_URL } from "../utils/Constants";

// const WS_URL = "ws://localhost:3005/ws";

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

	constructor(token: string, authService: AuthService) {
		this.token = token;
		this.authService = authService;

		window.addEventListener('send-message-request', this.handleSendMessageRequest.bind(this));
	}

	public connect(userId: string, username: string): void {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			console.warn("[SocketService] Socket already connected.");
			return;
		}

		this.userId = userId;
		this.username = username;

		const url = `${WS_URL}?token=${this.token}`;
		console.log("[SocketService] Connecting to WebSocket:", url);

		this.socket = new WebSocket(url);

		this.socket.onopen = () => {
			console.log("[SocketService] Connected to WebSocket.");
			this.reconnectAttempts = 0;
			this.authService.setStatus("online", userId);
		};

		this.socket.onmessage = (event) => {
			this.handleMessage(event);
		};

		this.socket.onclose = (event) =>
		{
			console.warn(`[SocketService] Disconnected. Code: ${event.code}, Reason: ${event.reason}`);
			this.authService.setStatus("offline", userId);

			if (event.code !== 1000)
			{
				this.handleReconnect();
			}
			else
			{
				this.authService.clearAuthState();
			}
		};

		this.socket.onerror = (error) => {
			console.error("[SocketService] Error:", error);
		};
	}

	private logReceivedMessage(message: any): void {
		console.log('[SocketService] Raw message received:', JSON.stringify(message, null, 2));
		console.log('[SocketService] Message type:', message.type);
		console.log('[SocketService] Message keys:', Object.keys(message));
	}

	private handleMessage(event: MessageEvent): void {
		try {
			const message: SocketMessage = JSON.parse(event.data);
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

				case 'error':
					this.handleError(message);
					break;

				case 'welcome':
					console.log('[SocketService] Welcome message:', message);
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
		// Backend sends: { "type": "direct-message", "from": "username", "text": "message" }
		const from = data.from;
		const text = data.text;

		console.log(`[SocketService] Received message from ${from}: ${text}`);

		if (!from || !text) {
			console.error('[SocketService] Invalid message data received:', data);
			return;
		}

		// Always show toast notification for received messages
		this.showToast('info', 'New Message', `${from}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

		// Emit event for any open chat modals to handle
		window.dispatchEvent(new CustomEvent('direct-message-received', {
			detail: {
				from: from,
				text: text,
				timestamp: new Date()
			}
		}));
	}

	private handleError(message: any): void {
		console.error("[SocketService] Server error:", message.error);

		this.showToast('error', 'Message Error', message.error || 'An error occurred');
	}

	private handleSendMessageRequest(event: CustomEvent): void {
		const { recipient, message } = event.detail;
		this.sendDirectMessage(recipient, message);
	}

	public sendDirectMessage(to: string, text: string): void {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			console.error("[SocketService] Cannot send message - socket not connected");
			this.showToast('error', 'Connection Error', 'Unable to send message - not connected to server');
			return;
		}

		// Ensure to is a string and properly formatted
		const targetUsername = String(to).trim();
		const messageText = String(text).trim();

		if (!targetUsername || !messageText) {
			console.error("[SocketService] Invalid message data:", { to: targetUsername, text: messageText });
			this.showToast('error', 'Message Error', 'Invalid message data');
			return;
		}

		const messageData = {
			type: 'direct-message',
			to: targetUsername,
			text: messageText
		};

		console.log("[SocketService] Sending direct message:", JSON.stringify(messageData));

		try {
			this.socket.send(JSON.stringify(messageData));

			// Emit event for UI feedback
			window.dispatchEvent(new CustomEvent('direct-message-sent', {
				detail: {
					to: targetUsername,
					text: messageText,
					timestamp: new Date()
				}
			}));
		} catch (error) {
			console.error("[SocketService] Error sending message:", error);
			this.showToast('error', 'Message Error', 'Failed to send message');
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
		if (this.socket) {
			// Set status to offline before disconnecting
			await this.authService.setStatus("offline", userId);

			// Close socket with normal closure code
			this.socket.close(1000, "User logout");
			this.socket = null;
		}

		// Remove event listeners
		window.removeEventListener('send-message-request', this.handleSendMessageRequest.bind(this));
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

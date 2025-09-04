import { AuthService } from "./AuthService"; // adjust path if needed

const WS_URL = "ws://localhost:3005/ws";

export class SocketService {
	private socket: WebSocket | null = null;
	private token: string = "";
	private authService: AuthService;
	private userId: string = "";
	private username: string = "";

	constructor(token: string, authService: AuthService) {
		this.token = token;
		this.authService = authService;
	}

	public connect(userId: string, username: string): void {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			console.warn("[SocketService] Socket already connected.");
			return;
		}

		this.userId = userId;
		this.username = username;

		const url = `${WS_URL}?token=${this.token}`;
		this.socket = new WebSocket(url);

		this.socket.onopen = () => {
			console.log("[SocketService] Connected to WebSocket.");
			this.authService.setStatus("online", userId);
		};

		this.socket.onclose = (event) => {
			console.warn(`[SocketService] Disconnected. Code: ${event.code}, Reason: ${event.reason}`);
			this.authService.setStatus("offline", userId);
			this.authService.clearAuthState();
		};

		this.socket.onerror = (error) => {
			console.error("[SocketService] Error:", error);
		};
	}

	public async disconnect(userId: string): Promise<void> {
		if (this.socket) {
			const test = this.authService.setStatus("offline", userId);
			if (!test )

			this.socket.close();
			this.socket = null;
		}
	}
}

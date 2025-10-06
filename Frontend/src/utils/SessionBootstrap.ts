import { authService } from '../services/AuthService';
import { SocketService } from '../services/SocketService';

declare global {
  interface Window {
    socketService?: SocketService;
    onSessionReady?: () => void;
  }
}

export async function sessionBootstrap() {
  const token = authService.getToken();
  const user = authService.getUser();

  if (!token || !user) {
    window.dispatchEvent(new CustomEvent('session-ready', { detail: { isAuthenticated: false } }));
    return;
  }

  // 1. Validate token with backend
  const result = await authService.fetchAuthMe(token);

  // Fix: Check for result.user.email instead of result.email
  if (!result || result.error || !result.user || !result.user.email) {
    // Invalid session, clear and prompt login
    await authService.logout();
    window.dispatchEvent(new CustomEvent('session-ready', { detail: { isAuthenticated: false } }));
    return;
  }

  // 2. If valid, re-instantiate SocketService and connect
  if (!window.socketService) {
    window.socketService = new SocketService(token, authService);
    // Use result.user instead of just user
    window.socketService.connect(result.user.id, result.user.username);
  }

  // 3. Notify rest of app - pass result.user
  window.dispatchEvent(new CustomEvent('session-ready', {
    detail: { isAuthenticated: true, user: result.user }
  }));

  // Optionally, call a callback if the app wants
  if (window.onSessionReady) window.onSessionReady();
}

import {
  AuthState,
  User,
  LoginCredentials,
  SignupCredentials,
  AuthResponse,
} from "../types/User";
import {
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../utils/Constants";
import { globalEventManager, AppEvent } from "../utils/EventManager";

const API_BASE_URL = "http://localhost:8080";

// Check if backend is available
let isBackendAvailable = true;
const checkBackendAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
};


type BackendUser = {
  id: number | string;
  FirstName: string;
  lastName: string;
  username: string;
  email: string;
  profilepath?: string;
  createdAt: string;
  updatedAt: string;
  // Optional flags the backend might include:
  isVerified?: number | boolean;
  status?: string;
  isLoggedIn?: number | boolean;
  enable2fa?: number | boolean;
};


function mapBackendUserToUser(raw: any): User {
  const u = raw as Partial<BackendUser> | undefined;
  if (!u) {
    throw new Error("Invalid user payload from server.");
  }

  return {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    firstName: String(u.firstName ?? ""),
    lastName: String(u.lastName ?? ""),
    username: String(u.username ?? ""),
    avatar: u.profilepath ? String(u.profilepath) : undefined,
    createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
    updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
    gameStats: undefined,
  };
}

export class AuthService {
  private state: AuthState = {
    isAuthenticated: false,
    isLoading: false,
    token: null,
    user: null,
  };

  constructor() {
    this.initializeFromStorage();
  }

  /** Load state from localStorage */
  private initializeFromStorage(): void {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        const parsed = JSON.parse(userData) as User;
        this.state = {
          isAuthenticated: true,
          isLoading: false,
          token,
          user: parsed,
        };
      }
    } catch (err) {
      console.error("Error loading auth state from storage:", err);
      this.clearStoredAuth();
    }
  }

  /** Public getters */
  getState(): AuthState {
    return { ...this.state };
  }
  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }
  getUser(): User | null {
    return this.state.user;
  }
  getToken(): string | null {
    return this.state.token;
  }

  /** Login */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    this.setLoading(true);
    try {
      const validation = this.validateLoginCredentials(credentials);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      const response = await this.loginAPI(credentials);
      if (response.success && response.token && response.user) {
        this.setAuthState(response.token, response.user);
        globalEventManager.emit(AppEvent.AUTH_LOGIN, response.user);
        return {
          success: true,
          message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
          token: response.token,
          user: response.user,
        };
      }
      return {
        success: false,
        message: response.message || ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
    } finally {
      this.setLoading(false);
    }
  }

async signup(credentials: SignupCredentials): Promise<AuthResponse> {
  this.setLoading(true);
  try {
    const validation = this.validateSignupCredentials(credentials);
    if (!validation.isValid) {
      return { success: false, message: validation.message };
    }

    const response = await this.signupAPI(credentials);

    if (response.success && response.user) {
      // if backend starts sending tokens, handle here
      this.state = {
        isAuthenticated: true,
        isLoading: false,
        token: response.token ?? null,
        user: response.user,
      };
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      }
      globalEventManager.emit(AppEvent.AUTH_SIGNUP, response.user);
    }

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
  } finally {
    this.setLoading(false);
  }
}

  /** Signup */
private async signupAPI(credentials: SignupCredentials): Promise<AuthResponse> {
  try {
    const res = await fetch("http://localhost:8080/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
    });

    // Handle conflicts (email/username already exists)
    if (res.status === 409) {
      const payload = await res.json().catch(() => ({}));
      return {
        success: false,
        message: payload?.error || "Conflict",
        conflict: payload?.conflict,             // 'email' | 'username'
        suggestions: payload?.suggestions || [], // backend can send alternatives
        statusCode: 409,
      };
    }

    // Handle other errors
    if (!res.ok) {
      const errorPayload = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errorPayload?.message || "Signup failed",
        statusCode: res.status,
      };
    }

    // ✅ Success response
    const data = await res.json();

    // If backend sends { user } inside data
    const user = mapBackendUserToUser(data.user ?? data);

    return {
      success: true,
      token: data.token ?? null, // optional (backend may add later)
      user,
      statusCode: res.status,
    };
  } catch (err) {
    console.error("signupAPI error:", err);
    return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
  }
}



  /** Logout */
  async logout(): Promise<void> {
    try {
      this.clearAuthState();
      globalEventManager.emit(AppEvent.AUTH_LOGOUT);
    } catch (error) {
      console.error("Logout error:", error);
      this.clearAuthState();
      globalEventManager.emit(AppEvent.AUTH_LOGOUT);
    }
  }

  /** Verify token with backend */
  async verifyToken(): Promise<boolean> {
    if (!this.state.token) return false;

    try {
      const isValid = await this.verifyTokenAPI(this.state.token);
      if (!isValid) {
        this.clearAuthState();
        return false;
      }
      return true;
    } catch (error) {
      console.error("Token verification error:", error);
      this.clearAuthState();
      return false;
    }
  }

  /** ---- Private helpers ---- */

  private setAuthState(token: string, user: User): void {
    this.state = {
      isAuthenticated: true,
      isLoading: false,
      token,
      user,
    };
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  private clearAuthState(): void {
    this.state = {
      isAuthenticated: false,
      isLoading: false,
      token: null,
      user: null,
    };
    this.clearStoredAuth();
  }

  private clearStoredAuth(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  private setLoading(loading: boolean): void {
    this.state.isLoading = loading;
  }

  private validateLoginCredentials(
    credentials: LoginCredentials
  ): { isValid: boolean; message?: string } {
    if (!credentials.email) {
      return { isValid: false, message: ERROR_MESSAGES.EMAIL_REQUIRED };
    }
    if (!credentials.password) {
      return { isValid: false, message: ERROR_MESSAGES.PASSWORD_REQUIRED };
    }
    if (!this.isValidEmail(credentials.email)) {
      return { isValid: false, message: ERROR_MESSAGES.INVALID_EMAIL };
    }
    return { isValid: true };
  }

  private validateSignupCredentials(
    credentials: SignupCredentials
  ): { isValid: boolean; message?: string } {
    if (!credentials.email) {
      return { isValid: false, message: ERROR_MESSAGES.EMAIL_REQUIRED };
    }
    if (!credentials.username) {
      return { isValid: false, message: "Username is required." };
    }
    if (!credentials.password) {
      return { isValid: false, message: ERROR_MESSAGES.PASSWORD_REQUIRED };
    }
    if (!credentials.firstName) {
      return { isValid: false, message: "First name is required." };
    }
    if (!credentials.lastName) {
      return { isValid: false, message: "Last name is required." };
    }
    if (!this.isValidEmail(credentials.email)) {
      return { isValid: false, message: ERROR_MESSAGES.INVALID_EMAIL };
    }
    if (credentials.password.length < 6) {
      return { isValid: false, message: ERROR_MESSAGES.PASSWORD_TOO_SHORT };
    }
    return { isValid: true };
  }

  private isValidEmail(email: string): boolean {
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // return emailRegex.test(email);
    return (true);
  }

  /** ---- API calls ---- */



private async loginAPI(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const endpoint = `${API_BASE_URL}/auth/login`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        username: credentials.email, // Using email as username
        password: credentials.password
      }),
    });

    if (!res.ok) {
      const rawErr = await res.text().catch(() => "");
      let errMsg = ERROR_MESSAGES.INVALID_CREDENTIALS;
      try {
        const errorData = JSON.parse(rawErr);
        errMsg = errorData.error || errorData.message || errMsg;
      } catch {}
      return { success: false, message: errMsg };
    }

    const data = await res.json();

    // Assuming backend returns: { token: "...", user: { ... } }
    if (!data.token) {
      return { success: false, message: "No token received from server" };
    }

    const user = mapBackendUserToUser(data.user);
    return { success: true, token: data.token, user };
  } catch (err) {
    console.error("Backend not available, using offline demo auth:", err);

    // Fallback to demo authentication for offline mode
    return this.offlineDemoLogin(credentials);
  }
}

  /**
   * Offline demo login for when backend is not available
   */
  private offlineDemoLogin(credentials: LoginCredentials): AuthResponse {
    // Demo credentials - Multiple accounts for testing multiplayer
    const validCredentials = [
      { email: 'demo@ftpong.com', password: 'demo123', firstName: 'Demo', lastName: 'Player', username: 'demo_player' },
      { email: 'alice@ftpong.com', password: 'alice123', firstName: 'Alice', lastName: 'Smith', username: 'alice_smith' },
      { email: 'bob@ftpong.com', password: 'bob123', firstName: 'Bob', lastName: 'Johnson', username: 'bob_johnson' },
      { email: 'carol@ftpong.com', password: 'carol123', firstName: 'Carol', lastName: 'Brown', username: 'carol_brown' },
      { email: 'david@ftpong.com', password: 'david123', firstName: 'David', lastName: 'Wilson', username: 'david_wilson' }
    ];

    const matchedUser = validCredentials.find(cred =>
      cred.email.toLowerCase() === credentials.email.toLowerCase() &&
      cred.password === credentials.password
    );

    if (!matchedUser) {
      return {
        success: false,
        message: 'Invalid demo credentials. Available accounts:\n• alice@ftpong.com / alice123\n• bob@ftpong.com / bob123\n• carol@ftpong.com / carol123\n• david@ftpong.com / david123\n• demo@ftpong.com / demo123'
      };
    }

    // Create demo user with matched credentials
    const demoUser: User = {
      id: matchedUser.username + '-' + Date.now(),
      firstName: matchedUser.firstName,
      lastName: matchedUser.lastName,
      username: matchedUser.username,
      email: matchedUser.email,
      profilePath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const demoToken = 'demo-token-' + Date.now();

    console.log('✅ Offline demo login successful');
    return {
      success: true,
      token: demoToken,
      user: demoUser,
      message: 'Demo login successful (offline mode)'
    };
  }

  /**
   * GET /verify-token
   * Expects Authorization: Bearer <token>
   * Backend should respond with:
   *   { valid: boolean, user?: BackendUser }
   */
  private async verifyTokenAPI(token: string): Promise<boolean> {
    const endpoint = `${API_BASE_URL}/verify-token`;
    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return false;

      const data = await res.json();

      // If backend returns a refreshed user, update local state
      if (data.valid && data.user) {
        try {
          const mapped = mapBackendUserToUser(data.user);
          this.setAuthState(token, mapped);
        } catch {
          // ignore mapping errors here; token is still valid
        }
      }

      return data.valid === true;
    } catch (err) {
      console.error("verifyTokenAPI error:", err);
      return false;
    }
  }
}

export const authService = new AuthService();

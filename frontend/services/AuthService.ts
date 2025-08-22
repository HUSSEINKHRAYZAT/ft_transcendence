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
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  profilePath?: string;
  createdAt: string;
  updatedAt: string;
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

  console.log('🔍 Raw backend user data:', JSON.stringify(u, null, 2));

  // 🔍 DEBUG: Check all avatar-related properties
  console.log('🔍 DEBUG u.avatar:', u.avatar);
  console.log('🔍 DEBUG u.profilePath:', u.profilePath);
  console.log('🔍 DEBUG u.profilepath:', u.profilepath);
  console.log('🔍 DEBUG u.profile_path:', u.profile_path);
  console.log('🔍 DEBUG All keys in response:', Object.keys(u));

  const mappedUser = {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    firstName: String(u.firstName ?? ""),
    lastName: String(u.lastName ?? ""),
    userName: String(u.username ?? ""),
    // ✅ FIXED: Use the correct property name that backend actually sends
    avatar: u.profilePath ? String(u.profilePath) : undefined,        // Changed from u.profilepath to u.profilePath
    profilePath: u.profilePath ? String(u.profilePath) : undefined,   // Changed from u.profilepath to u.profilePath
    createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
    updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
    gameStats: undefined,
  };

  console.log('🔍 Mapped user data:', JSON.stringify(mappedUser, null, 2));
  console.log('🔍 Final avatar value:', mappedUser.avatar);
  console.log('🔍 Final profilePath value:', mappedUser.profilePath);

  return mappedUser;
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
        username: credentials.email,
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

    if (!data.token) {
      return { success: false, message: "No token received from server" };
    }

    const user = mapBackendUserToUser(data.user);
    return { success: true, token: data.token, user };
  } catch (err) {
    console.error("Backend not available, using offline demo auth:", err);

    return this.offlineDemoLogin(credentials);
  }
}

  /**
   * Offline demo login for when backend is not available
   */
private offlineDemoLogin(credentials: LoginCredentials): AuthResponse {
  // Demo credentials - Multiple accounts for testing multiplayer
  const validCredentials = [
    { email: 'demo@ftpong.com', password: 'demo123', firstName: 'Demo', lastName: 'Player', userName: 'demo_player' },
    { email: 'alice@ftpong.com', password: 'alice123', firstName: 'Alice', lastName: 'Smith', userName: 'alice_smith' },
    { email: 'bob@ftpong.com', password: 'bob123', firstName: 'Bob', lastName: 'Johnson', userName: 'bob_johnson' },
    { email: 'carol@ftpong.com', password: 'carol123', firstName: 'Carol', lastName: 'Brown', userName: 'carol_brown' },
    { email: 'david@ftpong.com', password: 'david123', firstName: 'David', lastName: 'Wilson', userName: 'david_wilson' }
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
    id: matchedUser.userName + '-' + Date.now(),  // ← Fix: use userName
    firstName: matchedUser.firstName,
    lastName: matchedUser.lastName,
    userName: matchedUser.userName,  // ← Fix: use userName
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

  async updateProfile(updateData: UpdateProfileData): Promise<AuthResponse> {
  this.setLoading(true);

  try {
    const validation = this.validateProfileUpdateData(updateData);
    if (!validation.isValid) {
      return { success: false, message: validation.message };
    }

    const response = await this.updateProfileAPI(updateData);

    if (response.success && response.user) {
      // Update the current auth state with new user data
      this.setAuthState(this.state.token!, response.user);

      globalEventManager.emit(AppEvent.AUTH_PROFILE_UPDATE, response.user);

      return {
        success: true,
        message: SUCCESS_MESSAGES.PROFILE_UPDATE_SUCCESS,
        user: response.user,
      };
    }

    return {
      success: false,
      message: response.message || 'Failed to update profile',
    };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
  } finally {
    this.setLoading(false);
  }
}

/**
 * API call to update profile
 */
private async updateProfileAPI(updateData: UpdateProfileData): Promise<AuthResponse> {
  const user = this.getUser();
  if (!user || !this.state.token) {
    return { success: false, message: 'User not authenticated' };
  }

  const endpoint = `${API_BASE_URL}/users/${user.id}`;

  try {
    console.log('🔄 Sending PATCH request to:', endpoint);
    console.log('📦 Update data:', updateData);
    console.log('🎫 Token:', this.state.token.substring(0, 20) + '...');

    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.state.token}`,
      },
      body: JSON.stringify({
        firstName: updateData.FirstName,
        lastName: updateData.lastName,
        username: updateData.userName,  // ← Fix: Send as 'username' to backend
        email: updateData.email,
        profilepath: updateData.profilePath,
      }),
    });

    if (!res.ok) {
      let errorMessage = 'Failed to update profile';

      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;

        if (res.status === 409) {
          if (errorData.conflict === 'email') {
            errorMessage = 'Email address is already in use';
          } else if (errorData.conflict === 'username') {
            errorMessage = 'Username is already taken';
          }
        } else if (res.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
          this.clearAuthState();
        } else if (res.status === 403) {
          errorMessage = 'You do not have permission to update this profile';
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }

      return { success: false, message: errorMessage };
    }

    const data = await res.json();
    console.log('✅ Profile update response:', data);

    // 🔍 ADD THIS DEBUG SECTION:
    console.log('🔍 DEBUG Complete backend response:', JSON.stringify(data, null, 2));
    console.log('🔍 DEBUG data.user:', JSON.stringify(data.user, null, 2));
    console.log('🔍 DEBUG data.profilePath:', data.profilePath);
    console.log('🔍 DEBUG data.profilepath:', data.profilepath);
    console.log('🔍 DEBUG data.avatar:', data.avatar);

    const updatedUser = mapBackendUserToUser(data.user || data);

    return {
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    };

  } catch (err) {
    console.error('updateProfileAPI error:', err);

    if (err instanceof TypeError && err.message.includes('fetch')) {
      return {
        success: false,
        message: 'Unable to connect to server. Please check your internet connection.'
      };
    }

    return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
  }
}
/**
 * Validate profile update data
 */
private validateProfileUpdateData(data: UpdateProfileData): { isValid: boolean; message?: string } {
  if (!data.firstName.trim()) {
    return { isValid: false, message: 'First name is required' };
  }

  if (!data.lastName.trim()) {
    return { isValid: false, message: 'Last name is required' };
  }

  if (!data.userName.trim()) {  // ← Fix: Use 'userName'
    return { isValid: false, message: 'Username is required' };
  }

  if (!data.email.trim()) {
    return { isValid: false, message: 'Email is required' };
  }

  if (!this.isValidEmail(data.email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  // Username validation
  if (data.userName.length < 3) {  // ← Fix: Use 'userName'
    return { isValid: false, message: 'Username must be at least 3 characters long' };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(data.userName)) {  // ← Fix: Use 'userName'
    return { isValid: false, message: 'Username can only contain letters, numbers, dots, hyphens, and underscores' };
  }

  return { isValid: true };
}
}

export const authService = new AuthService();

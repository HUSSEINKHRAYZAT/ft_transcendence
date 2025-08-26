import { any } from "three/tsl";
import {
  AuthState,
  User,
  LoginCredentials,
  SignupCredentials,
  AuthResponse,
  GameSettings
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
  twoFactorEnabled?: number | boolean;
};

// this is new, i want to send the settings to the back
type BackendSettings =
{
  language: string;
  accentColors: string;
  backgroundTheme: string;
  // this will be optional, i dont know if i handle it
  NotificationEnabled?: number  | boolean;
}

function mapBackendSettingsToGameSettings(
  raw: Partial<BackendSettings> | undefined
): GameSettings {
  if (!raw) {
    throw new Error("Invalid settings payload from server.");
  }

  const mappedSettings: GameSettings = {
    theme: String(raw.accentColors ?? "default"),
    backgroundTheme: String(raw.backgroundTheme ?? "light"),
    language: String(raw.language ?? "en"),
    musicVolume: 50,
    soundEnabled: true,
    musicEnabled: true,
    notificationsEnabled: Boolean(
      raw.NotificationEnabled ?? true
    ),
  };

  console.log(
    "🔍 Raw backend settings:",
    JSON.stringify(raw, null, 2)
  );
  console.log(
    "🔍 Mapped settings:",
    JSON.stringify(mappedSettings, null, 2)
  );

  return mappedSettings;
}


function mapBackendUserToUser(raw: any): User {
  const u = raw as Partial<BackendUser> | undefined;
  if (!u) {
    throw new Error("Invalid user payload from server.");
  }

  console.log('🔍 Raw backend user data:', JSON.stringify(u, null, 2));


  const mappedUser = {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    firstName: String(u.firstName ?? ""),
    lastName: String(u.lastName ?? ""),
    userName: String(u.username ?? ""),
    avatar: u.profilePath ? String(u.profilePath) : undefined,
    profilePath: u.profilePath ? String(u.profilePath) : undefined,
    createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
    updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
    gameStats: undefined,
     enable2fa: Boolean(u.twoFactorEnabled)
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
  const endpoint = `${API_BASE_URL}/users`;
    const res = await fetch(endpoint, {
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




private async loginAPI(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const endpoint = `${API_BASE_URL}/auth/login`;
  try {
    console.log('🔐 Login attempt for:', credentials.email);

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

    console.log('📊 Login response status:', res.status);

    // ✅ Handle 303 - Email Not Verified
    if (res.status === 303) {
      console.log('📧 User not verified (303) - need email for verification');

      try {
        const emailResponse = await fetch(`${API_BASE_URL}/users/getEmail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: credentials.email
          }),
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          const userEmail = emailData.email || emailData.userEmail;

          console.log('✅ Got email for verification:', userEmail);

          return {
            success: false,
            message: `email not verified:${userEmail}`
          };
        } else {
          console.error('❌ Failed to get email from backend');
          return {
            success: false,
            message: 'Unable to send verification email. Please contact support.'
          };
        }
      } catch (emailError) {
        console.error('❌ Error fetching user email:', emailError);
        return {
          success: false,
          message: 'Unable to send verification email. Please try again.'
        };
      }
    }

    // ✅ Handle 202 - 2FA Required
    if (res.status === 202) {
      console.log('🔐 2FA verification required (202)');

      try {
        // Get the response data first
        const responseData = await res.json().catch(() => ({}));
        console.log('📦 2FA response data:', responseData);

        // Get the user's email for 2FA verification
        const emailResponse = await fetch(`${API_BASE_URL}/users/getEmail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: credentials.email
          }),
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          const userEmail = emailData.email || emailData.userEmail;

          console.log('✅ Got email for 2FA verification:', userEmail);

          // ✅ Store ALL the login data needed for completing auth after 2FA
          const tempToken = responseData.tempToken || responseData.token;
          const userData = responseData.user;

          if (tempToken && userData) {
            // Store temporary session data for completing login after 2FA
            sessionStorage.setItem('temp_2fa_token', tempToken);
            sessionStorage.setItem('temp_2fa_user', JSON.stringify(userData));
            sessionStorage.setItem('temp_2fa_email', userEmail);
            sessionStorage.setItem('temp_2fa_credentials', JSON.stringify(credentials));
          }

          return {
            success: false,
            message: `2fa required:${userEmail}`,
            requires2FA: true,
            tempToken: tempToken
          };
        } else {
          console.error('❌ Failed to get email for 2FA verification');
          return {
            success: false,
            message: 'Unable to send 2FA verification code. Please contact support.'
          };
        }
      } catch (emailError) {
        console.error('❌ Error fetching user email for 2FA:', emailError);
        return {
          success: false,
          message: 'Unable to send 2FA verification code. Please try again.'
        };
      }
    }

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

// ✅ NEW: Complete 2FA login directly without backend API call
async complete2FALogin(email: string, code: string): Promise<AuthResponse> {
  this.setLoading(true);

  try {
    const tempToken = sessionStorage.getItem('temp_2fa_token');
    const tempUserData = sessionStorage.getItem('temp_2fa_user');
    const tempEmail = sessionStorage.getItem('temp_2fa_email');

    if (!tempToken || !tempUserData || !tempEmail || tempEmail !== email) {
      return {
        success: false,
        message: '2FA session expired. Please login again.'
      };
    }

    console.log('🔐 Completing 2FA login locally (no backend API call needed)');

    // ✅ Parse the stored user data
    const userData = JSON.parse(tempUserData);

    // ✅ Map the backend user data to frontend User type
    const user = mapBackendUserToUser(userData);

    // ✅ Use the temp token as the real token (backend already validated credentials)
    const realToken = tempToken;

    // ✅ Clear temporary session data
    sessionStorage.removeItem('temp_2fa_token');
    sessionStorage.removeItem('temp_2fa_user');
    sessionStorage.removeItem('temp_2fa_email');
    sessionStorage.removeItem('temp_2fa_credentials');

    // ✅ Set authentication state
    this.setAuthState(realToken, user);

    // ✅ Emit login event
    globalEventManager.emit(AppEvent.AUTH_LOGIN, user);

    console.log('✅ 2FA login completed successfully');
    console.log('🎫 JWT Token stored:', realToken.substring(0, 20) + '...');
    console.log('👤 User data:', user);

    return {
      success: true,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      token: realToken,
      user: user
    };

  } catch (error) {
    console.error('❌ 2FA completion error:', error);

    // Clear any corrupted session data
    sessionStorage.removeItem('temp_2fa_token');
    sessionStorage.removeItem('temp_2fa_user');
    sessionStorage.removeItem('temp_2fa_email');
    sessionStorage.removeItem('temp_2fa_credentials');

    return {
      success: false,
      message: '2FA session error. Please login again.'
    };
  } finally {
    this.setLoading(false);
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

  const demoUser: User = {
    id: matchedUser.userName + '-' + Date.now(),
    firstName: matchedUser.firstName,
    lastName: matchedUser.lastName,
    userName: matchedUser.userName,
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
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        username: updateData.userName,
        email: updateData.email,
        profilepath: updateData.profilePath,
        twoFactorEnabled: updateData.enable2fa  // ✅ Send as twoFactorEnabled to match DB column
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

    console.log('🔍 DEBUG Complete backend response:', JSON.stringify(data, null, 2));
    console.log('🔍 DEBUG data.user:', JSON.stringify(data.user, null, 2));
    console.log('🔍 DEBUG data.twoFactorEnabled:', data.twoFactorEnabled); // ✅ Updated debug log

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

// Add these methods to your AuthService class

/**
 * Initiate password reset process
 * Generates verification code and sends it to user's email
 */
async initiatePasswordReset(email: string, newPassword: string): Promise<AuthResponse> {
  this.setLoading(true);

  try {
    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔢 Generated password reset code:', verificationCode);

    // Store code and password temporarily (in real app, store in backend)
    localStorage.setItem('password_reset_code', verificationCode);
    localStorage.setItem('password_reset_email', email);
    localStorage.setItem('password_reset_password', newPassword);

    // Send verification code to backend
    const response = await fetch(`${API_BASE_URL}/users/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        code: verificationCode
      })
    });

    console.log('📥 Password reset verification response status:', response.status);

    if (response.status === 404) {
      return {
        success: false,
        message: 'Email address not found in our system'
      };
    }

    if (response.status === 200 || response.status === 201) {
      console.log('✅ Password reset verification code sent successfully');
      return {
        success: true,
        message: 'Verification code sent to your email'
      };
    }

    // Handle other errors
    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      message: errorData.message || 'Failed to send verification code. Please try again.'
    };

  } catch (error) {
    console.error('❌ Error initiating password reset:', error);
    return {
      success: false,
      message: ERROR_MESSAGES.NETWORK_ERROR
    };
  } finally {
    this.setLoading(false);
  }
}

/**
 * Complete password reset after code verification
 */
async completePasswordReset(email: string, code: string, newPassword: string): Promise<AuthResponse> {
  this.setLoading(true);

  try {
    // Verify the code matches what we stored
    const storedCode = localStorage.getItem('password_reset_code');
    const storedEmail = localStorage.getItem('password_reset_email');
    const storedPassword = localStorage.getItem('password_reset_password');

    if (!storedCode || !storedEmail || !storedPassword) {
      return {
        success: false,
        message: 'Password reset session expired. Please start over.'
      };
    }

    if (storedEmail !== email || storedCode !== code || storedPassword !== newPassword) {
      return {
        success: false,
        message: 'Invalid verification code'
      };
    }

    // Send password reset to backend
    const response = await fetch(`${API_BASE_URL}/users/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        newPassword: newPassword
      })
    });

    if (response.status === 200) {
      // Clean up temporary storage
      localStorage.removeItem('password_reset_code');
      localStorage.removeItem('password_reset_email');
      localStorage.removeItem('password_reset_password');

      console.log('✅ Password reset completed successfully');
      return {
        success: true,
        message: 'Password reset successful'
      };
    }

    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      message: errorData.message || 'Failed to reset password. Please try again.'
    };

  } catch (error) {
    console.error('❌ Error completing password reset:', error);
    return {
      success: false,
      message: ERROR_MESSAGES.NETWORK_ERROR
    };
  } finally {
    this.setLoading(false);
  }
}

/**
 * Resend password reset verification code
 */
async resendPasswordResetCode(email: string, newPassword: string): Promise<AuthResponse> {
  console.log('📧 Resending password reset verification code');

  // Simply call initiatePasswordReset again to generate and send a new code
  return this.initiatePasswordReset(email, newPassword);
}


}

export const authService = new AuthService();

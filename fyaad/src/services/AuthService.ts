import { AuthState, User, LoginCredentials, SignupCredentials, AuthResponse } from '@/types/User';
import { STORAGE_KEYS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/utils/Constants';
import { globalEventManager, AppEvent } from '@/utils/EventManager';

/**
 * Authentication service for managing user login/logout and session
 */
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

  /**
   * Initialize authentication state from localStorage
   */
  private initializeFromStorage(): void {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        const user = JSON.parse(userData);
        this.state = {
          isAuthenticated: true,
          isLoading: false,
          token,
          user,
        };
      }
    } catch (error) {
      console.error('Error loading auth state from storage:', error);
      this.clearStoredAuth();
    }
  }

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.state.user;
  }

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return this.state.token;
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    this.setLoading(true);

    try {
      // Validate credentials
      const validation = this.validateLoginCredentials(credentials);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // TODO: Replace with actual API call
      const response = await this.mockLoginAPI(credentials);

      if (response.success && response.token && response.user) {
        this.setAuthState(response.token, response.user);
        globalEventManager.emit(AppEvent.AUTH_LOGIN, response.user);

        return {
          success: true,
          message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
          token: response.token,
          user: response.user,
        };
      } else {
        return {
          success: false,
          message: response.message || ERROR_MESSAGES.INVALID_CREDENTIALS,
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: ERROR_MESSAGES.NETWORK_ERROR,
      };
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Sign up new user
   */
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    this.setLoading(true);

    try {
      // Validate credentials
      const validation = this.validateSignupCredentials(credentials);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // TODO: Replace with actual API call
      const response = await this.mockSignupAPI(credentials);

      if (response.success && response.token && response.user) {
        this.setAuthState(response.token, response.user);
        globalEventManager.emit(AppEvent.AUTH_SIGNUP, response.user);

        return {
          success: true,
          message: SUCCESS_MESSAGES.SIGNUP_SUCCESS,
          token: response.token,
          user: response.user,
        };
      } else {
        return {
          success: false,
          message: response.message || ERROR_MESSAGES.SIGNUP_FAILED,
        };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: ERROR_MESSAGES.NETWORK_ERROR,
      };
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // TODO: Call logout API to invalidate token on server
      // await this.callLogoutAPI();

      this.clearAuthState();
      globalEventManager.emit(AppEvent.AUTH_LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      this.clearAuthState();
      globalEventManager.emit(AppEvent.AUTH_LOGOUT);
    }
  }

  /**
   * Verify current token validity
   */
  async verifyToken(): Promise<boolean> {
    if (!this.state.token) {
      return false;
    }

    try {
      // TODO: Replace with actual API call
      const isValid = await this.mockVerifyTokenAPI(this.state.token);

      if (!isValid) {
        this.clearAuthState();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      this.clearAuthState();
      return false;
    }
  }

  /**
   * Set authentication state
   */
  private setAuthState(token: string, user: User): void {
    this.state = {
      isAuthenticated: true,
      isLoading: false,
      token,
      user,
    };

    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this.state = {
      isAuthenticated: false,
      isLoading: false,
      token: null,
      user: null,
    };

    this.clearStoredAuth();
  }

  /**
   * Clear stored authentication data
   */
  private clearStoredAuth(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.state.isLoading = loading;
  }

  /**
   * Validate login credentials
   */
  private validateLoginCredentials(credentials: LoginCredentials): { isValid: boolean; message?: string } {
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

  /**
   * Validate signup credentials
   */
  private validateSignupCredentials(credentials: SignupCredentials): { isValid: boolean; message?: string } {
    if (!credentials.email) {
      return { isValid: false, message: ERROR_MESSAGES.EMAIL_REQUIRED };
    }

    if (!credentials.password) {
      return { isValid: false, message: ERROR_MESSAGES.PASSWORD_REQUIRED };
    }

    if (!credentials.firstName) {
      return { isValid: false, message: 'First name is required.' };
    }

    if (!credentials.lastName) {
      return { isValid: false, message: 'Last name is required.' };
    }

    if (!this.isValidEmail(credentials.email)) {
      return { isValid: false, message: ERROR_MESSAGES.INVALID_EMAIL };
    }

    if (credentials.password.length < 6) {
      return { isValid: false, message: ERROR_MESSAGES.PASSWORD_TOO_SHORT };
    }

    return { isValid: true };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Mock login API call (replace with real API)
   */
  private async mockLoginAPI(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful login for demo purposes
    if (credentials.email === 'demo@ftpong.com' && credentials.password === 'demo123') {
      return {
        success: true,
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: '1',
          email: credentials.email,
          firstName: 'Demo',
          lastName: 'User',
          createdAt: new Date(),
          updatedAt: new Date(),
          gameStats: {
            gamesPlayed: 10,
            gamesWon: 6,
            gamesLost: 4,
            totalScore: 150,
            highestScore: 25,
            winRate: 0.6,
            averageScore: 15,
          },
        },
      };
    }

    return {
      success: false,
      message: ERROR_MESSAGES.INVALID_CREDENTIALS,
    };
  }

  /**
   * Mock signup API call (replace with real API)
   */
  private async mockSignupAPI(credentials: SignupCredentials): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Mock successful signup
    return {
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: Date.now().toString(),
        email: credentials.email,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        gameStats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          totalScore: 0,
          highestScore: 0,
          winRate: 0,
          averageScore: 0,
        },
      },
    };
  }

  /**
   * Mock token verification API call (replace with real API)
   */
  private async mockVerifyTokenAPI(token: string): Promise<boolean> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock token validity check
    return token.startsWith('mock-jwt-token');
  }
}

// Export singleton instance
export const authService = new AuthService();

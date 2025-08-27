import { API_ENDPOINTS, ERROR_MESSAGES } from '@//utils/Constants';
import { authService } from './AuthService';


interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  requiresAuth?: boolean;
}

/**
 * API response wrapper
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

/**
 * API service for handling HTTP requests
 */
export class ApiService {
  private baseUrl: string;
  private defaultTimeout: number = 10000; // 10 seconds

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make HTTP request
   */
  private async makeRequest<T>(
    url: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      requiresAuth = true,
    } = config;

    try {
      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Add auth token if required and available
      if (requiresAuth) {
        const token = authService.getToken();
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        } else {
          throw new Error('Authentication required');
        }
      }

      // Build request init
      const requestInit: RequestInit = {
        method,
        headers: requestHeaders,
      };

      // Add body for non-GET requests
      if (body && method !== 'GET') {
        requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      // Make request with timeout
      const response = await Promise.race([
        fetch(`${this.baseUrl}${url}`, requestInit),
        timeoutPromise,
      ]);

      // Handle response
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: errorText || `HTTP ${response.status}`,
          statusCode: response.status,
        };
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: T;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      return {
        success: true,
        data,
        statusCode: response.status,
      };

    } catch (error) {
      console.error('API request error:', error);

      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: ERROR_MESSAGES.NETWORK_ERROR,
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(url: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'PATCH', body });
  }

  /**
   * Upload file
   */
  async uploadFile(url: string, file: File, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};

      // Add auth token if required
      if (config.requiresAuth !== false) {
        const token = authService.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        statusCode: response.status,
      };

    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Set base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set default timeout
   */
  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', {
        requiresAuth: false,
        timeout: 5000,
      });
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

/**
 * API endpoints wrapper with typed methods
 */
class FTPongAPI extends ApiService {
  constructor() {
    super(process.env.VITE_API_BASE_URL || 'http://localhost:3001');
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.post(API_ENDPOINTS.AUTH.LOGIN, { email, password }, { requiresAuth: false });
  }

  async signup(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    return this.post(API_ENDPOINTS.AUTH.SIGNUP, userData, { requiresAuth: false });
  }

  async logout() {
    return this.post(API_ENDPOINTS.AUTH.LOGOUT);
  }

  async verifyToken() {
    return this.get(API_ENDPOINTS.AUTH.VERIFY);
  }

  // User endpoints
  async getUserProfile() {
    return this.get(API_ENDPOINTS.USER.PROFILE);
  }

  async updateUserProfile(userData: any) {
    return this.put(API_ENDPOINTS.USER.PROFILE, userData);
  }

  async getFriends() {
    return this.get(API_ENDPOINTS.USER.FRIENDS);
  }

  async addFriend(userId: string) {
    return this.post(`${API_ENDPOINTS.USER.FRIENDS}/${userId}`);
  }

  async removeFriend(userId: string) {
    return this.delete(`${API_ENDPOINTS.USER.FRIENDS}/${userId}`);
  }

  async getNotifications() {
    return this.get(API_ENDPOINTS.USER.NOTIFICATIONS);
  }

  async markNotificationRead(notificationId: string) {
    return this.patch(`${API_ENDPOINTS.USER.NOTIFICATIONS}/${notificationId}`, { read: true });
  }

  // Game endpoints
  async startGame(gameSettings: any) {
    return this.post(API_ENDPOINTS.GAME.START, gameSettings);
  }

  async submitScore(gameResult: any) {
    return this.post(API_ENDPOINTS.GAME.SCORE, gameResult);
  }

  async getLeaderboard(limit: number = 10) {
    return this.get(`${API_ENDPOINTS.GAME.LEADERBOARD}?limit=${limit}`);
  }

  async getGameHistory(userId?: string) {
    const url = userId ? `/api/game/history/${userId}` : '/api/game/history';
    return this.get(url);
  }
}

// Export singleton instance
export const apiService = new FTPongAPI();

export { ApiService };

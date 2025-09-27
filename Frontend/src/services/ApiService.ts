import { API_ENDPOINTS, ERROR_MESSAGES, API_BASE_URL } from '../utils/Constants';
import { authService } from './AuthService';


interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  requiresAuth?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export class ApiService {
  private baseUrl: string;
  private defaultTimeout: number = 10000;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

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
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (requiresAuth) {
        const token = authService.getToken();
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        } else {
          throw new Error('Authentication required');
        }
      }

      const requestInit: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (body && method !== 'GET') {
        requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      const response = await Promise.race([
        fetch(`${this.baseUrl}${url}`, requestInit),
        timeoutPromise,
      ]);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: errorText || `HTTP ${response.status}`,
          statusCode: response.status,
        };
      }

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

  async get<T>(url: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'GET' });
  }

  async post<T>(url: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'POST', body });
  }

  async put<T>(url: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'PUT', body });
  }

  async delete<T>(url: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'DELETE' });
  }

  async patch<T>(url: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...config, method: 'PATCH', body });
  }

  async uploadFile(url: string, file: File, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};

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

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

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

class FTPongAPI extends ApiService {
  constructor() {
    super(API_BASE_URL);
  }

  // ===== User/Auth =====
  async login(email: string, password: string) {
    return this.post(API_ENDPOINTS.USER.LOGIN, { email, password }, { requiresAuth: false });
  }

  async signup(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    return this.post(API_ENDPOINTS.USER.CREATE, userData, { requiresAuth: false });
  }

  async logout() {
    // Assuming you have a logout endpoint on your backend
    return this.post('/users/logout'); // You can add it to API_ENDPOINTS if needed
  }

  async verifyEmail(email: string) {
    return this.post(API_ENDPOINTS.USER.VERIFY, { email }, { requiresAuth: false });
  }

  async getUserById(userId: string) {
    return this.get(API_ENDPOINTS.USER.GET_BY_ID(userId));
  }

  async updateUser(userId: string, userData: any) {
    return this.patch(API_ENDPOINTS.USER.UPDATE(userId), userData);
  }

  async deleteUser(userId: string) {
    return this.delete(API_ENDPOINTS.USER.DELETE(userId));
  }

  async lookupUser(query: { username?: string; email?: string }) {
    return this.post(API_ENDPOINTS.USER.LOOKUP, query, { requiresAuth: false });
  }

  async getEmail(query: { username?: string; email?: string }) {
    return this.post(API_ENDPOINTS.USER.GET_EMAIL, query, { requiresAuth: false });
  }

  // ===== Statistics =====
  async getStatistics(userId: string) {
    return this.get(API_ENDPOINTS.STATISTICS.GET_BY_USER(userId));
  }

  async updateStatistics(userId: string, data: any) {
    return this.patch(API_ENDPOINTS.STATISTICS.UPDATE(userId), data);
  }

  // ===== Friends / Relations =====
  async getFriends(userId: string) {
    return this.get(API_ENDPOINTS.RELATION.FRIENDS(userId));
  }

  async getRequests(userId: string) {
    return this.get(API_ENDPOINTS.RELATION.REQUESTS(userId));
  }

  async createRelation(relationData: any) {
    return this.post(API_ENDPOINTS.RELATION.CREATE, relationData);
  }

  async updateRelation(relationData: any) {
    return this.patch(API_ENDPOINTS.RELATION.UPDATE, relationData);
  }

  async deleteRelation(relationData: any) {
    return this.delete(API_ENDPOINTS.RELATION.DELETE, relationData);
  }

  // ===== Relation Types =====
  async getRelationTypes() {
    return this.get(API_ENDPOINTS.RELATION_TYPE.LIST);
  }

  async getRelationTypeId(type: string) {
    return this.post(API_ENDPOINTS.RELATION_TYPE.GET_ID, { type });
  }

  // ===== Settings =====
  async getSettings(username: string) {
    return this.get(API_ENDPOINTS.SETTINGS.GET_BY_USERNAME(username));
  }

  async updateSettings(settingsData: any) {
    return this.post(API_ENDPOINTS.SETTINGS.CREATE_UPDATE, settingsData);
  }

  // ===== Languages =====
  async getLanguages() {
    return this.get(API_ENDPOINTS.LANGUAGES.LIST);
  }

  // ===== Tournament =====
  async createTournament(tournamentData: { 
    name: string; 
    size: number; 
    playerIds: string[];
  }) {
    return this.post(API_ENDPOINTS.TOURNAMENT.CREATE, tournamentData);
  }

  async joinTournament(data: { code: string }) {
    return this.post(API_ENDPOINTS.TOURNAMENT.JOIN, data);
  }

  async getTournamentByCode(code: string) {
    return this.get(API_ENDPOINTS.TOURNAMENT.GET_BY_CODE(code));
  }

  async getTournamentById(id: string) {
    return this.get(API_ENDPOINTS.TOURNAMENT.GET_BY_ID(id));
  }

  async updateTournament(id: string, data: any) {
    return this.patch(API_ENDPOINTS.TOURNAMENT.UPDATE(id), data);
  }

  async deleteTournament(id: string) {
    return this.delete(API_ENDPOINTS.TOURNAMENT.DELETE(id));
  }

  async listTournaments() {
    return this.get(API_ENDPOINTS.TOURNAMENT.LIST);
  }

  // ===== Health / Default =====
  async getHealth() {
    return this.get(API_ENDPOINTS.DEFAULT.HEALTH);
  }

  async getOpenAPI() {
    return this.get(API_ENDPOINTS.DEFAULT.OPENAPI);
  }
}


export const apiService = new FTPongAPI();


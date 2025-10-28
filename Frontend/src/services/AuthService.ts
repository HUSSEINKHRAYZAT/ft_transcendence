import {
	AuthState,
	User,
	LoginCredentials,
	SignupCredentials,
	AuthResponse,
	WebSettings,
	UpdateProfileData,
	UserStats
} from "../types/User";
import {
	STORAGE_KEYS,
	ERROR_MESSAGES,
	SUCCESS_MESSAGES,
	API_BASE_URL
} from "../utils/Constants";
import { globalEventManager, AppEvent } from "../utils/EventManager";
import { SocketService } from "./SocketService";
import { circleOfConfusionPixelShader } from "@babylonjs/core";

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

export function mapBackendUserToUser(raw: any): User {
    // Use the raw object directly since OAuth responses can vary
    const u = raw;

    if (!u) {
        throw new Error("Invalid user payload from server.");
    }

    // Extract properties with all possible aliases
    const userId = u.id || u.sub || u.user_id || "";
    const userEmail = u.email || u.user_email || "";
    const userFirstName = u.firstName || u.first_name || u.given_name || "";
    const userLastName = u.lastName || u.last_name || u.family_name || "";
    const userName = u.username || u.user_name || u.name || "";

    // Handle nested user object (common in OAuth responses)
    if (u.user && typeof u.user === 'object') {
        const nestedUser = u.user;
        return mapBackendUserToUser(nestedUser);
    }

    // Validate that we have the minimum required fields
    if (!userId && !userEmail && !userName) {

        throw new Error("Insufficient user data from server - missing ID, email, and username.");
    }

    const mappedUser = {
        id: String(userId || ""),
        email: String(userEmail || ""),
        firstName: String(userFirstName || ""),
        lastName: String(userLastName || ""),
        userName: String(userName || ""),
        profilePath: u.profilePath || u.profile_path || u.picture || u.avatar_url ?
            String(u.profilePath || u.profile_path || u.picture || u.avatar_url) : undefined,
        createdAt: u.createdAt ? new Date(u.createdAt) : (u.created_at ? new Date(u.created_at) : new Date()),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : (u.updated_at ? new Date(u.updated_at) : new Date()),
        gameStats: undefined,
        enable2fa: Boolean(u.twoFactorEnabled || u.two_factor_enabled || u.enable2fa),
    };

    if (!mappedUser.id || !mappedUser.email) {

        throw new Error("User mapping failed - missing required ID or email.");
    }

    return mappedUser;
}

export class AuthService {
	private state: AuthState = {
		isAuthenticated: false,
		isLoading: false,
		token: null,
		user: null,
		statistics: null,
		settings: null,
	};

	private socketService: SocketService | null = null;

	constructor() {
		this.initializeFromStorage();
	}

	private initializeFromStorage(): void {
		try {
			const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
			const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
			const statsData = localStorage.getItem(STORAGE_KEYS.USER_STATISTICS);
			const settingsData = localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS);

			if (token && userData) {
				const parsedUser = JSON.parse(userData) as User;
				const parsedStats = statsData ? JSON.parse(statsData) as UserStats : null;
				const parsedSettings = settingsData ? JSON.parse(settingsData) as WebSettings : null;

				this.state = {
					isAuthenticated: true,
					isLoading: false,
					token,
					user: parsedUser,
					statistics: parsedStats,
					settings: parsedSettings,
				};
			}
		} catch (err) {

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

	async getStatistics(refresh: boolean = false): Promise<UserStats | null> {
		if (refresh && this.state.user) {
			await this.refreshStatistics();
		}
		return this.state.statistics;
	}

	getToken(): string | null {
		return this.state.token;
	}

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

			return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
		} finally {
			this.setLoading(false);
		}
	}

	async fetchAuthMe(token: string): Promise<any | null> {
		try {
			const endpoint = `${API_BASE_URL}/auth/me`;
			const response = await fetch(endpoint, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {

				return null;
			}

			const data = await response.json();
			return data;
		} catch (error) {

			return null;
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

			if (response.success && response.user && response.token) {
				await this.setAuthState(response.token, response.user);

				globalEventManager.emit(AppEvent.AUTH_SIGNUP, response.user);

				return {
					success: true,
					message: SUCCESS_MESSAGES.SIGNUP_SUCCESS,
					token: response.token,
					user: response.user
				};
			}

			return response;
		} catch (error) {

			return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
		} finally {
			this.setLoading(false);
		}
	}

async createSettingsAPI(username: string): Promise<boolean> {
    try {
        const endpoint = `${API_BASE_URL}/settings`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.state.token ? `Bearer ${this.state.token}` : '',
            },
            body: JSON.stringify({
                username: username,
                languageCode: 'en',
                accentColor: 'lime',
                backgroundTheme: 'dark'
            })
        });

        if (response.ok) {

            // Fetch the created settings and store locally
            const settings = await this.settingsAPI(username);
            if (settings) {
                this.state.settings = this.mapBackendSettingsToWebSettings(settings);
                localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(this.state.settings));
            }

            return true;
        } else {

            return false;
        }
    } catch (error) {

        return false;
    }
}

async updateUserSettings(settings: {
    username: string;
    languageCode: string;
    accentColor: string;
    backgroundTheme: string;
}): Promise<boolean> {
    try {
        const endpoint = `${API_BASE_URL}/settings`;
        const response = await fetch(endpoint, {
            method: 'POST', // Using POST as per your requirement
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.state.token ? `Bearer ${this.state.token}` : '',
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {

            // Update local state with new settings
            const updatedSettings = await this.settingsAPI(settings.username);
            if (updatedSettings) {
                this.state.settings = this.mapBackendSettingsToWebSettings(updatedSettings);
                localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(this.state.settings));
                globalEventManager.emit(AppEvent.SETTINGS_UPDATED, this.state.settings);
            }

            return true;
        } else {

            return false;
        }
    } catch (error) {

        return false;
    }
}

	getSettings(): WebSettings | null {
		return this.state.settings;
	}

	async refreshSettings(): Promise<WebSettings | null> {
		if (!this.state.user) return null;

		try {
			const settings = await this.settingsAPI(this.state.user.userName);
			if (settings) {
				this.state.settings = this.mapBackendSettingsToWebSettings(settings);
				localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(this.state.settings));
				return this.state.settings;
			}
			return null;
		} catch (error) {

			return null;
		}
	}

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

			if (res.status === 409) {
				const payload = await res.json().catch(() => ({}));
				return {
					success: false,
					message: payload?.error || "Conflict",
					conflict: payload?.conflict,
					suggestions: payload?.suggestions || [],
					statusCode: 409,
				};
			}

			if (!res.ok) {
				const errorPayload = await res.json().catch(() => ({}));
				return {
					success: false,
					message: errorPayload?.message || "Signup failed",
					statusCode: res.status,
				};
			}

			const data = await res.json();

			const user = mapBackendUserToUser(data.user ?? data);

			return {
				success: true,
				token: data.token ?? null,
				user,
				statusCode: res.status,
			};
		} catch (err) {

			return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
		}
	}

	async logout(): Promise<void> {
		try {
			this.clearAuthState();
			globalEventManager.emit(AppEvent.AUTH_LOGOUT);
		} catch (error) {

			this.clearAuthState();
			globalEventManager.emit(AppEvent.AUTH_LOGOUT);
		}
	}

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

			this.clearAuthState();
			return false;
		}
	}

async setAuthState(token: string, user: User): Promise<void> {
    this.state.token = token;
    this.state.user = user;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

    // Try to get existing settings first
    let settings = await this.settingsAPI(user.userName);

    // If no settings exist, create default ones
    if (!settings) {
        await this.createSettingsAPI(user.userName);
        settings = await this.settingsAPI(user.userName);
    }

    // Get statistics
    const statistics = await this.statisticsAPI(user.id);

    this.state = {
        isAuthenticated: true,
        isLoading: false,
        token,
        user,
        statistics,
        settings: settings ? this.mapBackendSettingsToWebSettings(settings) : null
    };

    // Store settings locally
    if (this.state.settings) {
        localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(this.state.settings));
    }

    // Initialize socket service
    this.socketService = new SocketService(token, this);
    if (this.state.user?.id && this.state.user?.userName) {
        this.socketService.connect(this.state.user.id, this.state.user.userName);
    }
}

	private async setAuthState_settings(username: string): Promise<WebSettings | null> {
		const raw = localStorage.getItem(STORAGE_KEYS.WEB_SETTINGS);

		if (!raw) {
			return await this.settingsAPI(username);
		}

		return JSON.parse(raw) as WebSettings;
	}

private async settingsAPI(username: string): Promise<any | null> {
    if (!this.state.token) return null;

    try {
        const res = await fetch(`${API_BASE_URL}/settings/${username}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.state.token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {

            return null;
        }

        const data = await res.json();
        return data;
    } catch (err) {

        return null;
    }
}

	private async setAuthState_statistics(userId: string): Promise<UserStats | null> {
		const raw = localStorage.getItem(STORAGE_KEYS.USER_STATISTICS);
		return raw ? JSON.parse(raw) as UserStats : await this.statisticsAPI(userId);
	}

	public async clearAuthState(): Promise<void> {
		const userId = this.state.user?.id;

		// Try to gracefully disconnect and set offline BEFORE clearing tokens
		if (userId) {
			try {
				await this.socketService?.disconnect(userId);
			} catch (err) {

			}
		}

		this.state = {
			isAuthenticated: false,
			isLoading: false,
			token: null,
			user: null,
			statistics: null,
			settings: null
		};

		this.clearStoredAuth();

		// Reset themes to default when unauthenticated
		if (typeof window !== 'undefined') {
			const simpleThemeManager = (window as any).simpleThemeManager;
			const backgroundThemeManager = (window as any).backgroundThemeManager;

			if (simpleThemeManager) {
				simpleThemeManager.resetTheme();
			}
			if (backgroundThemeManager) {
				backgroundThemeManager.resetTheme();
			}
		}
	}

	private clearStoredAuth(): void {
		localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
		localStorage.removeItem(STORAGE_KEYS.USER_DATA);
		localStorage.removeItem(STORAGE_KEYS.USER_STATISTICS);
		localStorage.removeItem(STORAGE_KEYS.WEB_SETTINGS);
		localStorage.removeItem(STORAGE_KEYS.GAME_SETTINGS);
	}

	private setLoading(loading: boolean): void {
		this.state.isLoading = loading;
	}

	public mapBackendSettingsToWebSettings(
    raw: any | undefined
	): WebSettings {
		if (!raw) {

			return {
				theme: "lime",
				backgroundTheme: "dark",
				language: "en"
			};
		}

		const mappedSettings: WebSettings = {
			theme: String(raw.accentColor ?? raw.accentColors ?? "lime"),
			backgroundTheme: String(raw.backgroundTheme ?? "dark"),
			language: String(raw.languageCode ?? raw.language ?? "en")
		};

		return mappedSettings;
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

			// Handle 303 - Email Not Verified
			if (res.status === 303) {

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

						return {
							success: false,
							message: `email not verified:${userEmail}`
						};
					} else {

						return {
							success: false,
							message: 'Unable to send verification email. Please contact support.'
						};
					}
				} catch (emailError) {

					return {
						success: false,
						message: 'Unable to send verification email. Please try again.'
					};
				}
			}

			// Handle 202 - 2FA Required
			if (res.status === 202) {

				try {
					// Get the response data first
					const responseData = await res.json().catch(() => ({}));
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

						// Store ALL the login data needed for completing auth after 2FA
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

						return {
							success: false,
							message: 'Unable to send 2FA verification code. Please contact support.'
						};
					}
				} catch (emailError) {

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

			return this.offlineDemoLogin(credentials);
		}
	}

	async refreshStatistics(): Promise<UserStats | null> {
		if (!this.state.user) return null;

		try {
			const stats = await this.statisticsAPI(this.state.user.id);
			if (stats) {
				// Update state
				this.state.statistics = stats;

				// Update localStorage
				localStorage.setItem("ft_pong_statistics", JSON.stringify(stats));

				// Emit event for components to refresh
				globalEventManager.emit(AppEvent.STATISTICS_UPDATED, stats);

				return stats;
			}
			return null;
		} catch (error) {

			return null;
		}
		}

	public async setStatus(status: string, userId: string, opts?: { keepalive?: boolean }): Promise<boolean> {
		const mode = status.toLowerCase();

		try {
			// Use in-memory token to avoid race conditions with localStorage clearing
			const token = this.state.token;
			if (!token) {

				return false;
			}

			const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ status: mode }),
				keepalive: opts?.keepalive === true, // allow keepalive when called on unload
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));

				return false;
			}

			await response.json().catch(() => ({}));
			return true;

		} catch (error) {

			return false;
		}
	}

	private async statisticsAPI(userId: string): Promise<UserStats | null> {
		if (!this.state.token) return null;

		try {
			const res = await fetch(`${API_BASE_URL}/statistics/${userId}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
			});

			if (!res.ok) {

				return null;
			}

			const data = await res.json();
			const stats: UserStats = {
				winCount: data.winCount ?? 0,
				lossCount: data.lossCount ?? 0,
				tournamentWinCount: data.tournamentWinCount ?? 0,
				tournamentCount: data.tournamentCount ?? 0,
				totalGames: data.totalGames ?? 0,
			};

			return stats;
		} catch (err) {

			return null;
		}
	}

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

			// Parse the stored user data
			const userData = JSON.parse(tempUserData);

			// Map the backend user data to frontend User type
			const user = mapBackendUserToUser(userData);

			// Use the temp token as the real token (backend already validated credentials)
			const realToken = tempToken;

			// Clear temporary session data
			sessionStorage.removeItem('temp_2fa_token');
			sessionStorage.removeItem('temp_2fa_user');
			sessionStorage.removeItem('temp_2fa_email');
			sessionStorage.removeItem('temp_2fa_credentials');

			// Fetch statistics
			const statistics = await this.statisticsAPI(user.id);

			// Set authentication state with stats
			this.setAuthState(realToken, user);

			// Emit login event
			globalEventManager.emit(AppEvent.AUTH_LOGIN, user);

			return {
				success: true,
				message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
				token: realToken,
				user: user
			};

		} catch (error) {

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

	private offlineDemoLogin(credentials: LoginCredentials): AuthResponse {
		return {
			success: false,
			message: 'Backend service is currently unavailable. Please try again later.'
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
					twoFactorEnabled: updateData.enable2fa
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

				}

				return { success: false, message: errorMessage };
			}

			const data = await res.json();

			const updatedUser = mapBackendUserToUser(data.user || data);

			return {
				success: true,
				user: updatedUser,
				message: 'Profile updated successfully'
			};

		} catch (err) {

			if (err instanceof TypeError && err.message.includes('fetch')) {
				return {
					success: false,
					message: 'Unable to connect to server. Please check your internet connection.'
				};
			}

			return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
		}
	}

	private validateProfileUpdateData(data: UpdateProfileData): { isValid: boolean; message?: string } {
		if (!data.firstName.trim()) {
			return { isValid: false, message: 'First name is required' };
		}

		if (!data.lastName.trim()) {
			return { isValid: false, message: 'Last name is required' };
		}

		if (!data.userName.trim()) {
			return { isValid: false, message: 'Username is required' };
		}

		if (!data.email.trim()) {
			return { isValid: false, message: 'Email is required' };
		}

		if (!this.isValidEmail(data.email)) {
			return { isValid: false, message: 'Please enter a valid email address' };
		}

		// Username validation
		if (data.userName.length < 3) {
			return { isValid: false, message: 'Username must be at least 3 characters long' };
		}

		if (!/^[a-zA-Z0-9._-]+$/.test(data.userName)) {
			return { isValid: false, message: 'Username can only contain letters, numbers, dots, hyphens, and underscores' };
		}

		return { isValid: true };
	}

	async initiatePasswordReset(email: string, newPassword: string): Promise<AuthResponse> {
		this.setLoading(true);

		try {
			const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

			localStorage.setItem('password_reset_code', verificationCode);
			localStorage.setItem('password_reset_email', email);
			localStorage.setItem('password_reset_password', newPassword);

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

			if (response.status === 404) {
				return {
					success: false,
					message: 'Email address not found in our system'
				};
			}

			if (response.status === 200 || response.status === 201) {
				return {
					success: true,
					message: 'Verification code sent to your email'
				};
			}

			const errorData = await response.json().catch(() => ({}));
			return {
				success: false,
				message: errorData.message || 'Failed to send verification code. Please try again.'
			};

		} catch (error) {

			return {
				success: false,
				message: ERROR_MESSAGES.NETWORK_ERROR
			};
		} finally {
			this.setLoading(false);
		}
	}

	async completePasswordReset(email: string, code: string, newPassword: string): Promise<AuthResponse> {
		this.setLoading(true);

		try {
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
				localStorage.removeItem('password_reset_code');
				localStorage.removeItem('password_reset_email');
				localStorage.removeItem('password_reset_password');

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

			return {
				success: false,
				message: ERROR_MESSAGES.NETWORK_ERROR
			};
		} finally {
			this.setLoading(false);
		}
	}

	async resendPasswordResetCode(email: string, newPassword: string): Promise<AuthResponse> {

		return this.initiatePasswordReset(email, newPassword);
	}

	async sendFriendRequest(usernameOne: string, usernameTwo: string): Promise<AuthResponse> {
		try {
			const response = await fetch(`${API_BASE_URL}/relation`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					usernameOne,
					usernameTwo,
					type: 'PENDING'
				}),
			});

			if (response.ok) {
				return { success: true, message: 'Friend request sent successfully' };
			} else {
				const errorData = await response.json().catch(() => ({}));
				return {
					success: false,
					message: errorData.message || 'Failed to send friend request',
					statusCode: response.status
				};
			}
		} catch (error) {

			return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
		}
	}

	async getFriendRequests(userId: string): Promise<AuthResponse> {
		try {
			const response = await fetch(`${API_BASE_URL}/relation/requests/${userId}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const data = await response.json();
				return { success: true, data };
			} else {
				const errorData = await response.json().catch(() => ({}));
				return {
					success: false,
					message: errorData.message || 'Failed to load friend requests',
					statusCode: response.status
				};
			}
		} catch (error) {

			return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
		}
	}

	async acceptFriendRequest(usernameOne: string, usernameTwo: string): Promise<AuthResponse> {
		try {
			const response = await fetch(`${API_BASE_URL}/relation`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					usernameOne,
					usernameTwo,
					type: 'FRIEND'
				}),
			});

			if (response.ok) {
				// Send WebSocket notification to the other user
				const currentUser = this.getUser();
				if (currentUser) {
					// Determine which username is the target (the one who sent the request)
					const targetUsername = usernameOne === currentUser.userName ? usernameTwo : usernameOne;

					// Get socket service and send notification
					const socketService = (window as any).socketService;
					if (socketService && socketService.sendFriendAccepted) {
						socketService.sendFriendAccepted(targetUsername);
					}
				}

				return { success: true, message: 'Friend request accepted' };
			} else {
				const errorData = await response.json().catch(() => ({}));
				return {
					success: false,
					message: errorData.message || 'Failed to accept friend request',
					statusCode: response.status
				};
			}
		} catch (error) {

			return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
		}
	}

async blockUserFromRequest(usernameOne: string, usernameTwo: string): Promise<AuthResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/relation`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.state.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernameOne,
                usernameTwo,
                type: 'BLOCKED'
            }),
        });

        if (response.ok) {
            // Send WebSocket notification to the blocked user
            const currentUser = this.getUser();
            if (currentUser) {
                // Determine which username is the target (the one being blocked)
                const targetUsername = usernameOne === currentUser.userName ? usernameTwo : usernameOne;

                // Get socket service and send notification
                const socketService = (window as any).socketService;
                if (socketService && socketService.sendUserBlocked) {
                    socketService.sendUserBlocked(targetUsername);
                }
            }

            return { success: true, message: 'User blocked successfully' };
        } else {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                message: errorData.message || 'Failed to block user',
                statusCode: response.status
            };
        }
    } catch (error) {

        return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
    }
}

// Replace your removeFriend method with this:

async removeFriend(usernameOne: string, usernameTwo: string): Promise<AuthResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/relation`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.state.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernameOne,
                usernameTwo
            }),
        });

        if (response.ok) {
            // Send WebSocket notification to the removed friend (using user-blocked type)
            const currentUser = this.getUser();
            if (currentUser) {
                // Determine which username is the target (the friend being removed)
                const targetUsername = usernameOne === currentUser.userName ? usernameTwo : usernameOne;

                // Get socket service and send notification
                // Using sendUserBlocked since the UI behavior should be the same
                const socketService = (window as any).socketService;
                if (socketService && socketService.sendUserBlocked) {
                    socketService.sendUserBlocked(targetUsername);
                }
            }

            return { success: true, message: 'Friend removed successfully' };
        } else {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                message: errorData.message || 'Failed to remove friend',
                statusCode: response.status
            };
        }
    } catch (error) {

        return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
    }
}

	async getFriendsList(userId: string): Promise<AuthResponse> {
		try {
			const response = await fetch(`${API_BASE_URL}/relation/friends/${userId}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const data = await response.json();
				return { success: true, data };
			} else {
				const errorData = await response.json().catch(() => ({}));
				return {
					success: false,
					message: errorData.message || 'Failed to load friends list',
					statusCode: response.status
				};
			}
		} catch (error) {

			return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
		}
	}

	async googleLogin(): Promise<AuthResponse> {
		this.setLoading(true);

		try {
			const authWindow = window.open(
				`${API_BASE_URL}/users/oauth-upsert`,
				'googleAuth',
				'width=500,height=600,scrollbars=yes,resizable=yes'
			);

			if (!authWindow) {
				return {
					success: false,
					message: 'Unable to open authentication popup. Please check your popup blocker.'
				};
			}

			// Wait for OAuth callback
			return new Promise<AuthResponse>((resolve) => {
				const messageHandler = async (event: MessageEvent) => {
					// Verify origin matches your frontend URL
					if (event.origin !== window.location.origin) {

						return;
					}

					const { token, user, error } = event.data;

					// Clean up
					window.removeEventListener('message', messageHandler);
					authWindow.close();

					if (error) {

						resolve({
							success: false,
							message: error
						});
						return;
					}

					if (!token || !user) {
						resolve({
							success: false,
							message: 'Invalid response from Google authentication'
						});
						return;
					}

					try {
						// Process the OAuth response through your backend
						const oauthResponse = await this.processOAuthCallback(token, user);

						if (oauthResponse.success && oauthResponse.user && oauthResponse.token) {
							// Fetch statistics for the user
							const statistics = await this.statisticsAPI(oauthResponse.user.id);

							// Set authentication state
							await this.setAuthState(oauthResponse.token, oauthResponse.user);

							// Emit login event
							globalEventManager.emit(AppEvent.AUTH_LOGIN, oauthResponse.user);

							resolve({
								success: true,
								message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
								token: oauthResponse.token,
								user: oauthResponse.user
							});
						} else {
							resolve({
								success: false,
								message: oauthResponse.message || 'Google authentication failed'
							});
						}
					} catch (processError) {

						resolve({
							success: false,
							message: 'Failed to process Google authentication'
						});
					}
				};

				// Listen for callback message
				window.addEventListener('message', messageHandler);

				// Handle popup closed manually
				const checkClosed = setInterval(() => {
					if (authWindow.closed) {
						clearInterval(checkClosed);
						window.removeEventListener('message', messageHandler);
						resolve({
							success: false,
							message: 'Google authentication was cancelled'
						});
					}
				}, 1000);
			});

		} catch (error) {

			return {
				success: false,
				message: ERROR_MESSAGES.NETWORK_ERROR
			};
		} finally {
			this.setLoading(false);
		}
	}

	private async processOAuthCallback(googleToken: string, googleUser: any): Promise<AuthResponse> {
		try {
			const endpoint = `${API_BASE_URL}/users/oauth-upsert`;

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
				body: JSON.stringify({
					provider: 'google',
					token: googleToken,
					user: googleUser
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				return {
					success: false,
					message: errorData.message || 'OAuth processing failed',
					statusCode: response.status
				};
			}

			const data = await response.json();

			if (!data.token || !data.user) {
				return {
					success: false,
					message: 'Invalid response from OAuth processing'
				};
			}

			// Map backend user to frontend User type
			const user = mapBackendUserToUser(data.user);

			return {
				success: true,
				token: data.token,
				user: user,
				message: data.isNewUser ? 'Account created successfully' : 'Welcome back!'
			};

		} catch (error) {

			return {
				success: false,
				message: ERROR_MESSAGES.NETWORK_ERROR
			};
		}
	}

	static handleOAuthCallback(): void {
		// This runs on the /auth/callback page
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('token');
		const userData = urlParams.get('user');
		const error = urlParams.get('error');

		if (window.opener) {
			if (error) {
				window.opener.postMessage({ error }, window.location.origin);
			} else if (token && userData) {
				try {
					const user = JSON.parse(decodeURIComponent(userData));
					window.opener.postMessage({ token, user }, window.location.origin);
				} catch (parseError) {
					window.opener.postMessage({
						error: 'Failed to parse user data'
					}, window.location.origin);
				}
			} else {
				window.opener.postMessage({
					error: 'Missing authentication data'
				}, window.location.origin);
			}

			window.close();
		}
	}

	public async routineStatistics(): Promise<UserStats | null> {
    if (!this.state.user) return null;

    // Fetch latest stats from API
    const stats = await this.statisticsAPI(this.state.user.id);

    if (stats) {
        // Update localStorage
        localStorage.setItem("ft_pong_statistics", JSON.stringify(stats));
    }

    // Return from localStorage as fallback
    const cached = localStorage.getItem("ft_pong_statistics");
    return cached ? JSON.parse(cached) as UserStats : stats;
}

async getBlockedUsers(userId: string): Promise<AuthResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/relation/blocked/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.state.token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        } else {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                message: errorData.message || 'Failed to load blocked users',
                statusCode: response.status
            };
        }
    } catch (error) {

        return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
    }
}

async getFriendStatistics(friendId: string): Promise<UserStats | null> {
    if (!this.state.token) {

        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/statistics/${friendId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.state.token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {

            return null;
        }

        const data = await response.json();

        const stats: UserStats = {
            winCount: data.winCount ?? 0,
            lossCount: data.lossCount ?? 0,
            tournamentWinCount: data.tournamentWinCount ?? 0,
            tournamentCount: data.tournamentCount ?? 0,
            totalGames: data.totalGames ?? 0,
        };

        return stats;
    } catch (error) {

        return null;
    }
}

async getUserById(userId: string): Promise<any | null> {
    if (!this.state.token) {

        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.state.token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {

            return null;
        }

        const data = await response.json();

        return data;
    } catch (error) {

        return null;
    }
}

/**
 * Get the full avatar path for a user
 * @param profilePath - The profile path from the user data (e.g., "dog.png")
 * @returns Full path to avatar (e.g., "/avatars/dog.png") or default panda
 */
getAvatarPath(profilePath: string | null | undefined): string {
    if (!profilePath) {
        return '/avatars/panda.png';
    }

    // If it's already a full path (starts with / or http), return as is
    if (profilePath.startsWith('/') || profilePath.startsWith('http')) {
        return profilePath;
    }

    return `/avatars/${profilePath}`;
}

	async incrementWinCount(userId: string): Promise<boolean> {
		if (!this.state.token) {

			return false;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/statistics/${userId}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					winDelta: 1,
					lossDelta: 0,
					tWinDelta: 0,
					tCountDelta: 0
				}),
			});

			if (!response.ok) {

				return false;
			}

			// Refresh statistics after update
			await this.refreshStatistics();
			return true;
		} catch (error) {

			return false;
		}
	}

	async incrementLossCount(userId: string): Promise<boolean> {
		if (!this.state.token) {

			return false;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/statistics/${userId}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					winDelta: 0,
					lossDelta: 1,
					tWinDelta: 0,
					tCountDelta: 0
				}),
			});

			if (!response.ok) {

				return false;
			}

			// Refresh statistics after update
			await this.refreshStatistics();
			return true;
		} catch (error) {

			return false;
		}
	}

	async incrementTournamentWin(userId: string): Promise<boolean> {
		if (!this.state.token) {

			return false;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/statistics/${userId}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					winDelta: 0,
					lossDelta: 0,
					tWinDelta: 1,
					tCountDelta: 1
				}),
			});

			if (!response.ok) {

				return false;
			}

			// Refresh statistics after update
			await this.refreshStatistics();
			return true;
		} catch (error) {

			return false;
		}
	}

	async incrementTournamentCount(userId: string): Promise<boolean> {
		if (!this.state.token) {

			return false;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/statistics/${userId}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${this.state.token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					winDelta: 0,
					lossDelta: 0,
					tWinDelta: 0,
					tCountDelta: 1
				}),
			});

			if (!response.ok) {

				return false;
			}

			// Refresh statistics after update
			await this.refreshStatistics();
			return true;
		} catch (error) {

			return false;
		}
	}

}

export const authService = new AuthService();

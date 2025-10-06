import { BaseModal } from './BaseModal';
import { authService } from '../../services/AuthService';
import { findElement } from '../../utils/DOMHelpers';
import { t } from '../../langs/LanguageManager';
import { API_BASE_URL } from '../../utils';

export class LoginModal extends BaseModal {
	private onSwitchToSignup?: () => void;

	constructor(onSwitchToSignup?: () => void) {
		super();
		this.onSwitchToSignup = onSwitchToSignup;
	}

	protected getModalTitle(): string {
		return t('Login');
	}

	protected getModalContent(): string {
		return `
			<form id="login-form">
				<div class="mb-4">
					<label class="block text-sm font-medium text-gray-300 mb-2">${t('Email / Username')}</label>
					<input type="text" id="login-email" required
								class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
								placeholder="${t('Enter your email or username')}">
				</div>
				<div class="mb-6">
					<label class="block text-sm font-medium text-gray-300 mb-2">${t('Password')}</label>
					<input type="password" id="login-password" required
								class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
								placeholder="${t('Enter your password')}">
				</div>
				<div id="login-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
				<button type="submit" id="login-submit"
								class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">
					${t('Login')}
				</button>

				<!-- Forgot Password Link -->
				<div class="text-center mb-4">
					<button type="button" id="forgot-password-link" class="text-sm text-gray-400 hover:text-lime-400 transition-colors duration-300">
						${t('Forgot your password?')}
					</button>
				</div>
			</form>
			<div class="text-center">
				<p class="text-gray-400">${t("Don't have an account?")}
					<button id="switch-to-signup" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">${t('Sign up')}</button>
				</p>
				<div class="mt-4 pt-4 border-t border-gray-700">
					<p class="text-xs text-gray-500 mb-3"></p>
					<button id="google-login" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 flex items-center justify-center space-x-2">
						<svg class="w-5 h-5" viewBox="0 0 24 24">
							<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
							<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
							<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
							<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
						</svg>
						<span>${t('Sign in with Google')}</span>
					</button>
				</div>
			</div>
		`;
	}

	protected setupEventListeners(): void {
		const switchBtn = findElement('#switch-to-signup');
		const googleBtn = findElement('#google-login');
		const forgotPasswordBtn = findElement('#forgot-password-link');
		const form = findElement('#login-form') as HTMLFormElement;

		if (switchBtn) {
			switchBtn.addEventListener('click', () => {
				console.log('🔄 Switch to signup clicked');
				this.close();
				if (this.onSwitchToSignup) {
					this.onSwitchToSignup();
				}
			});
		}

		if (googleBtn) {
			googleBtn.addEventListener('click', () => this.handleGoogleAuth());
		}

		if (forgotPasswordBtn) {
			forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
		}

		if (form) {
			form.addEventListener('submit', (e) => this.handleLogin(e));
		}

		setTimeout(() => {
			const firstInput = findElement('#login-email') as HTMLInputElement;
			if (firstInput) {
				firstInput.focus();
			}
		}, 100);
	}

	private async handleForgotPassword(): Promise<void> {
		console.log('🔐 Forgot password clicked...');

		try {
			this.close();

			const { ForgetPasswordModal } = await import('./ForgetPasswordModal');

			const forgotPasswordModal = new ForgetPasswordModal();
			forgotPasswordModal.showModal();

		} catch (error) {
			console.error('❌ Error loading forgot password modal:', error);
			this.showError('login-error', t('Unable to load password reset. Please try again.'));
		}
	}

	private handleGoogleAuth(): void {
		const cfg = { GATEWAY_URL: `${API_BASE_URL}` };
		const redirectTo = location.origin; // your frontend
		const startUrl = `${cfg.GATEWAY_URL}/authWithGoogle/start?redirectTo=${encodeURIComponent(redirectTo)}`;

		window.location.href = startUrl;
	}

	private async handleLogin(event: Event): Promise<void> {
		event.preventDefault();

		const emailInput = findElement('#login-email') as HTMLInputElement;
		const passwordInput = findElement('#login-password') as HTMLInputElement;
		const submitBtn = findElement('#login-submit') as HTMLButtonElement;
		const errorDiv = findElement('#login-error') as HTMLElement;

		if (!emailInput || !passwordInput || !submitBtn) {
			console.error('❌ Required form elements not found');
			return;
		}

		const email = emailInput.value.trim();
		const password = passwordInput.value; // Store password for potential retry

		errorDiv?.classList.add('hidden');

		if (!email || !password) {
			this.showError('login-error', t('Please fill in all fields'));
			return;
		}

		submitBtn.disabled = true;
		submitBtn.textContent = t('Logging in...');

		try {
			console.log('🔐 Attempting login with AuthService...');

			const result = await authService.login({
				email: email,
				password: password
			});

			console.log('🔐 Login result:', result);

			if (result.success && result.user && result.token) {
				console.log('✅ Login successful!');
				console.log('🎫 JWT Token stored:', result.token);
				console.log('👤 User data:', result.user);

				this.close();
				this.showToast('success', t('Welcome back!'), t('Hello {name}!', { name: result.user.firstName }));
				this.triggerAuthUpdate(true, result.user);
			} else {
				if (result.message && result.message.includes('email not verified:')) {
					const userEmail = result.message.split('email not verified:')[1];
					console.log('📧 Email not verified (303) - switching to verification modal');
					console.log('📧 Using email:', userEmail);

					this.close();

					// Pass both email and password for retry after verification
					this.showEmailVerificationModal(userEmail, password);

					this.showToast('info', t('Email Verification Required'),
						t('Please check your email and enter the verification code to continue.'));

					return;
				}

				if (result.message && result.message.includes('2fa required:')) {
					const userEmail = result.message.split('2fa required:')[1];
					console.log('🔐 2FA verification required (202) - switching to 2FA verification modal');
					console.log('📧 Using email:', userEmail);

					this.close();

					this.show2FAVerificationModal(userEmail);

					this.showToast('info', t('Two-Factor Authentication Required'),
						t('Please check your email and enter the 2FA verification code to continue.'));

					return;
				}

				console.error('❌ Login failed:', result.message);
				this.showError('login-error', result.message || t('Login failed'));
			}
		} catch (error) {
			console.error('❌ Login error:', error);
			this.showError('login-error', t('An unexpected error occurred'));
		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = t('Login');
		}
	}

	private async show2FAVerificationModal(userEmail: string): Promise<void> {
		try {
			console.log('🔐 Showing 2FA verification modal for email:', userEmail);

			const { VerifyModal } = await import('./VerifyModal');

			const verify2FAModal = new VerifyModal(
				userEmail,
				() => {
					console.log('✅ 2FA verification completed - user logged in successfully');
					this.showToast('success', t('Login Successful!'),
						t('Two-factor authentication completed successfully.'));

					const authState = authService.getState();
					if (authState.user) {
						this.triggerAuthUpdate(true, authState.user);
					}
				},
				() => {
					console.log('📧 2FA verification code resent');
				},
				undefined,
				true
			);

			verify2FAModal.showModal();

		} catch (error) {
			console.error('❌ Error loading 2FA verification modal:', error);
			this.showError('login-error', t('Unable to load 2FA verification. Please try again.'));
		}
	}

	private async showEmailVerificationModal(userEmail: string, password: string): Promise<void> {
		try {
			console.log('📧 Showing verification modal for email:', userEmail);

			const { VerifyModal } = await import('./VerifyModal');

			const verifyModal = new VerifyModal(
				userEmail,
				async () => {
					console.log('✅ Email verification completed - retrying login automatically');

					// Close verification modal
					verifyModal.close();

					// Retry login with the same credentials
					await this.retryLogin(userEmail, password);
				},
				() => {
					console.log('📧 Verification code resent');
					this.showToast('info', t('Code Resent'),
						t('A new verification code has been sent to your email.'));
				}
			);

			verifyModal.showModal();

		} catch (error) {
			console.error('❌ Error loading verification modal:', error);
			this.showError('login-error', t('Unable to load verification modal. Please try again.'));
		}
	}

	private async retryLogin(email: string, password: string): Promise<void> {
		try {
			console.log('🔄 Retrying login after successful verification...');

			const result = await authService.login({
				email: email,
				password: password
			});

			if (result.success && result.user && result.token) {
				console.log('✅ Login successful after verification!');
				console.log('🎫 JWT Token stored:', result.token);
				console.log('👤 User data:', result.user);

				this.close();
				this.showToast('success', t('Welcome!'), t('Hello {name}!', { name: result.user.firstName }));
				this.triggerAuthUpdate(true, result.user);
			} else {
				console.error('❌ Retry login failed:', result.message);
				this.showError('login-error', result.message || t('Login failed after verification'));

				// Re-open login modal if retry fails
				this.showModal();
			}
		} catch (error) {
			console.error('❌ Retry login error:', error);
			this.showError('login-error', t('An unexpected error occurred during login'));

			// Re-open login modal on error
			this.showModal();
		}
	}

	protected triggerAuthUpdate(isAuthenticated: boolean, user?: any): void {
		console.log('🔄 Triggering auth update:', { isAuthenticated, user: user?.email });

		// Dispatch the auth state change event
		window.dispatchEvent(new CustomEvent('auth-state-changed', {
			detail: { isAuthenticated, user }
		}));

		setTimeout(() => {
			if (typeof (window as any).addBasicNavbar === 'function') {
				(window as any).addBasicNavbar();
			}
			if (typeof (window as any).updateJumbotronButton === 'function') {
				(window as any).updateJumbotronButton();
			}
		}, 100);
	}

	showModal(): void {
		this.show('login');
	}

	async render(): Promise<void> {
		// This method exists for compatibility but doesn't actually render
		// The modal is shown using showModal() or when needed
		console.log('🔐 LoginModal render() called - use showModal() to display modal');
	}
}

(window as any).LoginModal = LoginModal;

export default LoginModal;

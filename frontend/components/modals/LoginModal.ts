// LoginModal.ts - Login modal component with i18n support and proper JWT handling
import { BaseModal } from './BaseModal';
import { authService } from '../../services/AuthService';
import { findElement } from '../../utils/DOMHelpers';
import { t } from '../../langs/LanguageManager';

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
				<p class="text-xs text-gray-500 mb-3">${t('Demo Accounts Available')}:</p>
				<div class="text-xs text-gray-400 space-y-1 mb-3">
					<div>• alice@ftpong.com / alice123</div>
					<div>• bob@ftpong.com / bob123</div>
					<div>• demo@ftpong.com / demo123</div>
				</div>
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
	const forgotPasswordBtn = findElement('#forgot-password-link'); // ✅ Add forgot password button
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

	// ✅ Add forgot password listener
	if (forgotPasswordBtn) {
		forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
	}

	if (form) {
		form.addEventListener('submit', (e) => this.handleLogin(e));
	}

	// Focus first input
	setTimeout(() => {
		const firstInput = findElement('#login-email') as HTMLInputElement;
		if (firstInput) {
			firstInput.focus();
		}
	}, 100);
}

/**
 * Handle forgot password button click
 */
private async handleForgotPassword(): Promise<void> {
	console.log('🔐 Forgot password clicked...');

	try {
		// Close login modal
		this.close();

		// Dynamically import ForgetPasswordModal
		const { ForgetPasswordModal } = await import('./ForgetPasswordModal');

		// Show forgot password modal
		const forgotPasswordModal = new ForgetPasswordModal();
		forgotPasswordModal.showModal();

	} catch (error) {
		console.error('❌ Error loading forgot password modal:', error);
		this.showError('login-error', t('Unable to load password reset. Please try again.'));
	}
}


private async handleGoogleAuth(): Promise<void> {
  console.log('🌐 Google login clicked...');

  this.showToast('info', t('Google Authentication'), t('Redirecting to Google...'));

  try {
    // 1. Start Google login (redirect or popup)
    const authWindow = window.open(
      "http://localhost:8080/auth/google",
      'googleAuth',
      'width=500,height=600'
    );

    // 2. Wait for the backend to finish OAuth and send us data
    //    (assuming your backend redirects to /auth/callback and posts message back)
    window.addEventListener("message", async (event) => {
      if (event.origin !== "http://localhost:8080") return;

      const { token, user, error } = event.data;

      if (error) {
        this.showToast('error', t('Google Authentication'), error);
        return;
      }

      if (!token || !user) {
        this.showToast('error', t('Google Authentication'), 'No token received from Google login.');
        return;
      }

      // 3. Set auth state (same as loginAPI success)
      authService['setAuthState'](token, user);

      this.close();
      this.showToast('success', t('Google Authentication'), t('Welcome {name}!', { name: user.firstName }));
      this.triggerAuthUpdate(true, user);
    });
  } catch (err) {
    console.error('Google OAuth failed:', err);
    this.showToast('error', t('Google Authentication'), 'Google login failed.');
  }
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
	const password = passwordInput.value;

	// Hide any previous errors
	errorDiv?.classList.add('hidden');

	if (!email || !password) {
		this.showError('login-error', t('Please fill in all fields'));
		return;
	}

	// Disable form during submission
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
			console.log('🎫 JWT Token stored:', result.token.substring(0, 20) + '...');
			console.log('👤 User data:', result.user);

			this.close();
			this.showToast('success', t('Welcome back!'), t('Hello {name}!', { name: result.user.firstName }));
			this.triggerAuthUpdate(true, result.user);
		} else {
			// ✅ Handle email verification needed
			if (result.message && result.message.includes('email not verified:')) {
				const userEmail = result.message.split('email not verified:')[1];
				console.log('📧 Email not verified (303) - switching to verification modal');
				console.log('📧 Using email:', userEmail);

				// Close the login modal
				this.close();

				// Show verification modal with the email from backend
				this.showEmailVerificationModal(userEmail);

				// Show info toast
				this.showToast('info', t('Email Verification Required'),
					t('Please check your email and enter the verification code to continue.'));

				return; // Exit early, don't show error
			}

			// ✅ NEW: Handle 2FA verification needed
			if (result.message && result.message.includes('2fa required:')) {
				const userEmail = result.message.split('2fa required:')[1];
				console.log('🔐 2FA verification required (202) - switching to 2FA verification modal');
				console.log('📧 Using email:', userEmail);

				// Close the login modal
				this.close();

				// Show 2FA verification modal
				this.show2FAVerificationModal(userEmail);

				// Show info toast
				this.showToast('info', t('Two-Factor Authentication Required'),
					t('Please check your email and enter the 2FA verification code to continue.'));

				return; // Exit early, don't show error
			}

			// Handle other login errors normally
			console.error('❌ Login failed:', result.message);
			this.showError('login-error', result.message || t('Login failed'));
		}
	} catch (error) {
		console.error('❌ Login error:', error);
		this.showError('login-error', t('An unexpected error occurred'));
	} finally {
		// Re-enable form
		submitBtn.disabled = false;
		submitBtn.textContent = t('Login');
	}
}

/**
 * ✅ NEW: Show 2FA verification modal
 */
private async show2FAVerificationModal(userEmail: string): Promise<void> {
	try {
		console.log('🔐 Showing 2FA verification modal for email:', userEmail);

		// Dynamically import VerifyModal
		const { VerifyModal } = await import('./VerifyModal');

		// Create 2FA verification modal with success callback
		const verify2FAModal = new VerifyModal(
			userEmail,
			() => {
				// On 2FA verification success - user is now logged in
				console.log('✅ 2FA verification completed - user logged in successfully');
				this.showToast('success', t('Login Successful!'),
					t('Two-factor authentication completed successfully.'));

				// Trigger auth update to refresh UI
				const authState = authService.getState();
				if (authState.user) {
					this.triggerAuthUpdate(true, authState.user);
				}
			},
			() => {
				// On resend 2FA code
				console.log('📧 2FA verification code resent');
			},
			undefined, // No auth token needed for 2FA (uses temp token)
			true // ✅ NEW: Flag to indicate this is 2FA verification
		);

		// Show the 2FA verification modal
		verify2FAModal.showModal();

	} catch (error) {
		console.error('❌ Error loading 2FA verification modal:', error);
		this.showError('login-error', t('Unable to load 2FA verification. Please try again.'));
	}
}

/**
 * Show email verification modal - now simplified since we already have the email
 */
private async showEmailVerificationModal(userEmail: string): Promise<void> {
	try {
		console.log('📧 Showing verification modal for email:', userEmail);

		// Dynamically import VerifyModal
		const { VerifyModal } = await import('./VerifyModal');

		// Create verification modal with success callback
		const verifyModal = new VerifyModal(
			userEmail,
			() => {
				// On verification success
				console.log('✅ Email verification completed - user can now login');
				this.showToast('success', t('Email Verified!'),
					t('Your email has been verified. You can now login.'));
			},
			() => {
				// On resend code
				console.log('📧 Verification code resent');
			}
		);

		// Show the verification modal
		verifyModal.showModal();

	} catch (error) {
		console.error('❌ Error loading verification modal:', error);
		this.showError('login-error', t('Unable to load verification modal. Please try again.'));
	}
}

/**
 * Optional: Auto-retry login after successful verification
 * You would need to store the password temporarily (not recommended for security)
 * Alternative: Just show success message and let user login again
 */
private async autoRetryLogin(email: string, password: string): Promise<void> {
	console.log('🔄 Auto-retrying login after verification...');

	try {
		const result = await authService.login({ email, password });

		if (result.success && result.user) {
			console.log('✅ Auto-login successful after verification!');
			this.showToast('success', t('Welcome!'), t('Hello {name}!', { name: result.user.firstName }));
			this.triggerAuthUpdate(true, result.user);
		} else {
			console.error('❌ Auto-login failed:', result.message);
			// Don't show error, just let them login manually
		}
	} catch (error) {
		console.error('❌ Auto-login error:', error);
		// Silent fail - user can login manually
	}
}

	/**
	 * Override triggerAuthUpdate to work with AuthService state
	 */
	protected triggerAuthUpdate(isAuthenticated: boolean, user?: any): void {
		console.log('🔄 Triggering auth update:', { isAuthenticated, user: user?.email });

		// Dispatch the auth state change event
		window.dispatchEvent(new CustomEvent('auth-state-changed', {
			detail: { isAuthenticated, user }
		}));

		// Update the UI components
		setTimeout(() => {
			if (typeof (window as any).addBasicNavbar === 'function') {
				(window as any).addBasicNavbar();
			}
			if (typeof (window as any).updateJumbotronButton === 'function') {
				(window as any).updateJumbotronButton();
			}
		}, 100);
	}

	/**
	 * Show login modal
	 */
	showModal(): void {
		this.show('login');
	}

	/**
	 * Add a render method for compatibility with component initialization
	 */
	async render(): Promise<void> {
		// This method exists for compatibility but doesn't actually render
		// The modal is shown using showModal() or when needed
		console.log('🔐 LoginModal render() called - use showModal() to display modal');
	}
}

// Make LoginModal globally available
(window as any).LoginModal = LoginModal;

export default LoginModal;

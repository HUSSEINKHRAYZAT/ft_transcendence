// LoginModal.ts - Login modal component with i18n support
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
          <input type="email" id="login-email" required
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
      </form>
      <div class="text-center">
        <p class="text-gray-400">${t("Don't have an account?")}
          <button id="switch-to-signup" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">${t('Sign up')}</button>
        </p>
        <div class="mt-4 pt-4 border-t border-gray-700">
          <button id="google-login" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 flex items-center justify-center space-x-2 mb-2">
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
   * Handle Google authentication
   */
  private handleGoogleAuth(): void {
    console.log('🌐 Google login clicked...');

    // Show temporary message
    this.showToast('info', t('Google Authentication'), t('Google OAuth will be implemented in the next version!'));

    // For demo purposes, create a Google user after 2 seconds
    setTimeout(() => {
      const googleUser = {
        id: 'google-' + Date.now(),
        firstName: 'Google',
        lastName: 'User',
        email: 'google.user@gmail.com',
        avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      };

      localStorage.setItem('ft_pong_auth_token', 'google-token-' + Date.now());
      localStorage.setItem('ft_pong_user_data', JSON.stringify(googleUser));

      this.close();
      this.showToast('success', t('Google Authentication'), t('Welcome {name}!', { name: googleUser.firstName }));

      // Trigger auth state update
      this.triggerAuthUpdate(true, googleUser);
    }, 2000);
  }

  /**
   * Handle login form submission
   */
  private async handleLogin(event: Event): Promise<void> {
    event.preventDefault();

    const emailInput = findElement('#login-email') as HTMLInputElement;
    const passwordInput = findElement('#login-password') as HTMLInputElement;
    const submitBtn = findElement('#login-submit') as HTMLButtonElement;
    const errorDiv = findElement('#login-error') as HTMLElement;

    if (!emailInput || !passwordInput || !submitBtn) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Clear previous errors
    errorDiv?.classList.add('hidden');

    // Disable form during submission
    submitBtn.disabled = true;
    submitBtn.textContent = t('Logging in...');

    try {
      // Check if authService is available, otherwise use fallback
      if (typeof authService !== 'undefined') {
        const result = await authService.login({ email, password });

        if (result.success) {
          this.close();
          this.showToast('success', t('Welcome back!'), t('Hello {name}!', { name: result.user?.firstName }));
          // Trigger auth state update
          this.triggerAuthUpdate(true, result.user);
        } else {
          this.showError('login-error', result.message || t('Login failed'));
        }
      } else {
        // Fallback login logic (same as in main.ts)
        if (email === 'demo@ftpong.com' && password === 'demo123') {
          const userData = {
            id: '1',
            firstName: 'Demo',
            lastName: 'User',
            email: email
          };

          localStorage.setItem('ft_pong_auth_token', 'demo-token-' + Date.now());
          localStorage.setItem('ft_pong_user_data', JSON.stringify(userData));

          this.close();
          this.showToast('success', t('Welcome back!'), t('Hello Demo!'));

          // Trigger auth state update
          this.triggerAuthUpdate(true, userData);
        } else {
          this.showError('login-error', t('Invalid credentials. Try: demo@ftpong.com / demo123'));
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('login-error', t('An unexpected error occurred'));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t('Login');
    }
  }

  /**
   * Show login modal
   */
  showModal(): void {
    this.show('login');
  }
}

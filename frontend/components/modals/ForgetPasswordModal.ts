import { BaseModal } from './BaseModal';
import { findElement } from '../../utils/DOMHelpers';
import { t } from '../../langs/LanguageManager';
import { authService } from '../../services/AuthService';

export class ForgetPasswordModal extends BaseModal {
  constructor() {
    super();
  }

  protected getModalTitle(): string {
    return t('Reset Password');
  }

  protected getModalContent(): string {
    return `
      <div class="text-center mb-6">
        <div class="w-16 h-16 mx-auto mb-4 bg-lime-500/20 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m0 0a2 2 0 01-2 2m2-2H9m6 0V9a2 2 0 00-2-2M9 7a2 2 0 012 2v0a2 2 0 002 2m-2-4H9m0 0V7a2 2 0 012-2m-2 2V7a2 2 0 00-2 2v4a2 2 0 002 2h2m-6-4v4a2 2 0 002 2h4"></path>
          </svg>
        </div>
        <p class="text-gray-300 mb-2">${t('Enter your email and new password')}</p>
        <p class="text-gray-400 text-sm">${t('We will send you a verification code')}</p>
      </div>

      <form id="forgot-password-form">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t('Email Address')}</label>
          <input type="email" id="forgot-email" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${t('Enter your email address')}">
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t('New Password')}</label>
          <input type="password" id="forgot-password" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${t('Enter your new password')}">
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t('Confirm Password')}</label>
          <input type="password" id="forgot-confirm-password" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${t('Confirm your new password')}">
        </div>

        <div id="forgot-password-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>

        <div class="flex gap-3">
          <button type="button" id="cancel-forgot-btn" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors duration-300">
            ${t('Cancel')}
          </button>
          <button type="submit" id="send-verification-btn" class="flex-1 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded transition-colors duration-300">
            ${t('Send Verification Code')}
          </button>
        </div>
      </form>
    `;
  }

  protected setupEventListeners(): void {
    const form = findElement('#forgot-password-form') as HTMLFormElement;
    const cancelBtn = findElement('#cancel-forgot-btn') as HTMLButtonElement;

    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // Focus first input
    setTimeout(() => {
      const firstInput = findElement('#forgot-email') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const emailInput = findElement('#forgot-email') as HTMLInputElement;
    const passwordInput = findElement('#forgot-password') as HTMLInputElement;
    const confirmPasswordInput = findElement('#forgot-confirm-password') as HTMLInputElement;
    const submitBtn = findElement('#send-verification-btn') as HTMLButtonElement;
    const errorDiv = findElement('#forgot-password-error') as HTMLElement;

    if (!emailInput || !passwordInput || !confirmPasswordInput || !submitBtn) {
      console.error('❌ Required form elements not found');
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Hide previous errors
    errorDiv?.classList.add('hidden');

    // Basic validation
    if (!email || !password || !confirmPassword) {
      this.showError('forgot-password-error', t('Please fill in all fields'));
      return;
    }

    if (password !== confirmPassword) {
      this.showError('forgot-password-error', t('Passwords do not match'));
      return;
    }

    // Disable form during submission
    submitBtn.disabled = true;
    submitBtn.textContent = t('Sending...');

    try {
      console.log('🔐 Starting password reset for email:', email);

      // Use AuthService for password reset
      const result = await authService.initiatePasswordReset(email, password);

      if (result.success) {
        console.log('✅ Password reset initiated successfully');

        // Close current modal and show verification modal
        this.close();
        this.showPasswordResetVerificationModal(email, password);

        this.showToast('info', t('Verification Code Sent'),
          t('Please check your email and enter the verification code'));
      } else {
        // Handle specific errors
        if (result.message?.includes('not found') || result.message?.includes('404')) {
          this.showError('forgot-password-error', t('Email address not found in our system'));
        } else {
          this.showError('forgot-password-error', result.message || t('Failed to send verification code. Please try again.'));
        }
      }

    } catch (error) {
      console.error('❌ Error initiating password reset:', error);
      this.showError('forgot-password-error', t('Network error. Please try again.'));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t('Send Verification Code');
    }
  }

  private async showPasswordResetVerificationModal(email: string, newPassword: string): Promise<void> {
    try {
      console.log('📧 Showing password reset verification modal');

      // Dynamically import VerifyModal
      const { VerifyModal } = await import('./VerifyModal');

      // Create a custom verification modal class inside this function
      class PasswordResetVerifyModal extends VerifyModal {
        private newPassword: string;

        constructor(
          userEmail: string,
          newPassword: string,
          onVerificationSuccess?: () => void,
          onResendCode?: () => void
        ) {
          // Call parent constructor
          super(userEmail, onVerificationSuccess, onResendCode);
          this.newPassword = newPassword;
        }

        protected getModalTitle(): string {
          return t('Verify Password Reset');
        }

        // Override the handleVerify method to use AuthService
        private async handlePasswordResetVerify(): Promise<void> {
          const inputs = [
            findElement('#code-1') as HTMLInputElement,
            findElement('#code-2') as HTMLInputElement,
            findElement('#code-3') as HTMLInputElement,
            findElement('#code-4') as HTMLInputElement,
            findElement('#code-5') as HTMLInputElement,
            findElement('#code-6') as HTMLInputElement,
          ].filter(Boolean);

          const code = inputs.map(input => input.value).join('');

          if (code.length !== 6) {
            this.showVerifyError(t('Please enter all 6 digits'));
            return;
          }

          const submitBtn = findElement('#verify-submit') as HTMLButtonElement;
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = t('Resetting Password...');
          }

          try {
            // Use AuthService to complete password reset
            const result = await authService.completePasswordReset((this as any).userEmail, code, this.newPassword);

            if (result.success) {
              this.showVerifySuccess();
              setTimeout(() => {
                this.close();
                if ((this as any).onVerificationSuccess) {
                  (this as any).onVerificationSuccess();
                }
              }, 1500);
            } else {
              this.showVerifyError(result.message || t('Invalid verification code'));
              this.clearVerifyInputs();
            }
          } catch (error) {
            console.error('❌ Error completing password reset:', error);
            this.showVerifyError(t('Network error. Please try again.'));
            this.clearVerifyInputs();
          }

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = t('Reset Password');
          }
        }

        // Override setupEventListeners to use our custom verify method
        protected setupEventListeners(): void {
          // Call parent setup first
          super.setupEventListeners();

          // Override the form submission
          const form = findElement('#verify-form') as HTMLFormElement;
          if (form) {
            // Remove existing listeners by cloning the form
            const newForm = form.cloneNode(true) as HTMLFormElement;
            form.parentNode?.replaceChild(newForm, form);

            newForm.addEventListener('submit', (e) => {
              e.preventDefault();
              this.handlePasswordResetVerify();
            });
          }

          // Override the submit button text
          const submitBtn = findElement('#verify-submit') as HTMLButtonElement;
          if (submitBtn) {
            submitBtn.textContent = t('Reset Password');
          }
        }

        private showVerifyError(message: string): void {
          const errorDiv = findElement('#verify-error') as HTMLElement;
          if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            errorDiv.className = 'mt-2 text-red-400 text-xs text-center';
          }
        }

        private showVerifySuccess(): void {
          const errorDiv = findElement('#verify-error') as HTMLElement;
          if (errorDiv) {
            errorDiv.textContent = t('Password reset successful!');
            errorDiv.className = 'mt-2 text-lime-400 text-xs text-center';
            errorDiv.classList.remove('hidden');
          }
        }

        private clearVerifyInputs(): void {
          const inputs = [
            findElement('#code-1') as HTMLInputElement,
            findElement('#code-2') as HTMLInputElement,
            findElement('#code-3') as HTMLInputElement,
            findElement('#code-4') as HTMLInputElement,
            findElement('#code-5') as HTMLInputElement,
            findElement('#code-6') as HTMLInputElement,
          ].filter(Boolean);

          inputs.forEach(input => {
            input.value = '';
          });

          if (inputs[0]) {
            inputs[0].focus();
          }
        }
      }

      // Now create and show the modal
      const verifyModal = new PasswordResetVerifyModal(
        email,
        newPassword,
        () => {
          // On verification success
          console.log('✅ Password reset completed successfully');
          this.showToast('success', t('Password Reset Successful'),
            t('Your password has been updated successfully. You can now login.'));
        },
        () => {
          // On resend code
          console.log('📧 Resending password reset verification code');
          authService.resendPasswordResetCode(email, newPassword);
        }
      );

      verifyModal.showModal();

    } catch (error) {
      console.error('❌ Error showing verification modal:', error);
      this.showError('forgot-password-error', t('Unable to load verification modal. Please try again.'));
    }
  }

  showModal(): void {
    this.show('forgot-password');
  }
}

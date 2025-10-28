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
          <div id="password-error" class="hidden mt-1 text-red-400 text-xs"></div>
          <div id="password-strength" class="mt-2">
            <div class="flex space-x-1">
              <div class="password-req" id="length-req">
                <span class="text-gray-400 text-xs">✗ ${t("signup.passwordReqLength") || 'At least 8 characters'}</span>
              </div>
            </div>
            <div class="flex space-x-1 mt-1">
              <div class="password-req" id="chars-digits-req">
                <span class="text-gray-400 text-xs">✗ ${t("signup.passwordReqCharsDigits") || 'Contains letters and numbers'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t('Confirm Password')}</label>
          <input type="password" id="forgot-confirm-password" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${t('Confirm your new password')}">
          <div id="confirm-password-error" class="hidden mt-1 text-red-400 text-xs"></div>
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

    // Setup password validation
    this.setupPasswordValidation();
    this.setupConfirmPasswordValidation();

    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    setTimeout(() => {
      const firstInput = findElement('#forgot-email') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  private setupPasswordValidation(): void {
    const passwordInput = findElement("#forgot-password") as HTMLInputElement;
    const passwordError = findElement("#password-error") as HTMLElement;

    const lengthReq = findElement("#length-req") as HTMLElement;
    const charsDigitsReq = findElement("#chars-digits-req") as HTMLElement;

    const validatePassword = () => {
      const password = passwordInput.value;
      let isValid = true;

      passwordInput.classList.remove('border-red-500', 'border-green-500');

      // Check minimum length (8 characters)
      const lengthSpan = lengthReq?.querySelector('span');
      if (password.length >= 8) {
        if (lengthSpan) {
          lengthSpan.className = 'text-green-400 text-xs';
          lengthSpan.textContent = `✓ ${t("validation.password.lengthValid") || 'At least 8 characters'}`;
        }
      } else {
        if (lengthSpan) {
          lengthSpan.className = 'text-red-400 text-xs';
          lengthSpan.textContent = `✗ ${t("validation.password.length") || 'At least 8 characters'}`;
        }
        isValid = false;
      }

      // Check for both letters and digits
      const hasLetters = /[a-zA-Z]/.test(password);
      const hasDigits = /\d/.test(password);
      const hasBothLettersAndDigits = hasLetters && hasDigits;

      const charsDigitsSpan = charsDigitsReq?.querySelector('span');
      if (hasBothLettersAndDigits) {
        if (charsDigitsSpan) {
          charsDigitsSpan.className = 'text-green-400 text-xs';
          charsDigitsSpan.textContent = `✓ ${t("validation.password.charsDigitsValid") || 'Contains letters and numbers'}`;
        }
      } else {
        if (charsDigitsSpan) {
          charsDigitsSpan.className = 'text-red-400 text-xs';
          charsDigitsSpan.textContent = `✗ ${t("validation.password.charsDigits") || 'Contains letters and numbers'}`;
        }
        if (password.length > 0) {
          isValid = false;
        }
      }

      // Update input styling based on validation
      if (password.length === 0) {
        passwordInput.classList.remove('border-red-500', 'border-green-500');
        passwordError.classList.add('hidden');
      } else if (isValid && password.length >= 8 && hasBothLettersAndDigits) {
        passwordInput.classList.remove('border-red-500');
        passwordInput.classList.add('border-green-500');
        passwordError.classList.add('hidden');
      } else if (password.length > 0) {
        passwordInput.classList.remove('border-green-500');
        passwordInput.classList.add('border-red-500');

        let errorMsg = '';
        if (password.length < 8) {
          errorMsg = t("validation.password.length") || 'Password must be at least 8 characters';
        } else if (!hasBothLettersAndDigits) {
          errorMsg = t("validation.password.charsDigits") || 'Password must contain both letters and numbers';
        }

        if (errorMsg) {
          passwordError.textContent = errorMsg;
          passwordError.classList.remove('hidden');
        }
      }

      // Trigger confirm password validation
      this.validateConfirmPassword();

      return isValid;
    };

    passwordInput?.addEventListener('keyup', validatePassword);
    passwordInput?.addEventListener('blur', validatePassword);
  }

  private setupConfirmPasswordValidation(): void {
    const confirmPasswordInput = findElement("#forgot-confirm-password") as HTMLInputElement;
    const confirmPasswordError = findElement("#confirm-password-error") as HTMLElement;

    confirmPasswordInput?.addEventListener('keyup', () => {
      this.validateConfirmPassword();
    });

    confirmPasswordInput?.addEventListener('blur', () => {
      this.validateConfirmPassword();
    });
  }

  private validateConfirmPassword(): boolean {
    const passwordInput = findElement("#forgot-password") as HTMLInputElement;
    const confirmPasswordInput = findElement("#forgot-confirm-password") as HTMLInputElement;
    const confirmPasswordError = findElement("#confirm-password-error") as HTMLElement;

    if (!passwordInput || !confirmPasswordInput || !confirmPasswordError) return false;

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    confirmPasswordInput.classList.remove('border-red-500', 'border-green-500');

    if (confirmPassword.length === 0) {
      confirmPasswordError.classList.add('hidden');
      return true;
    }

    if (password !== confirmPassword) {
      confirmPasswordError.textContent = t('Passwords do not match');
      confirmPasswordError.classList.remove('hidden');
      confirmPasswordInput.classList.add('border-red-500');
      return false;
    }

    confirmPasswordError.classList.add('hidden');
    confirmPasswordInput.classList.remove('border-red-500');
    confirmPasswordInput.classList.add('border-green-500');
    return true;
  }

  private validateAllFields(): boolean {
    const passwordInput = findElement("#forgot-password") as HTMLInputElement;
    const confirmPasswordInput = findElement("#forgot-confirm-password") as HTMLInputElement;

    if (!passwordInput || !confirmPasswordInput) return false;

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Check password strength
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasDigits = /\d/.test(password);
    const hasBothLettersAndDigits = hasLetters && hasDigits;

    const isPasswordValid = password.length >= 8 && hasBothLettersAndDigits;
    const isConfirmValid = password === confirmPassword;

    if (!isPasswordValid) {
      passwordInput.classList.add('border-red-500');
    }

    if (!isConfirmValid) {
      confirmPasswordInput.classList.add('border-red-500');
    }

    return isPasswordValid && isConfirmValid;
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const emailInput = findElement('#forgot-email') as HTMLInputElement;
    const passwordInput = findElement('#forgot-password') as HTMLInputElement;
    const confirmPasswordInput = findElement('#forgot-confirm-password') as HTMLInputElement;
    const submitBtn = findElement('#send-verification-btn') as HTMLButtonElement;
    const errorDiv = findElement('#forgot-password-error') as HTMLElement;

    if (!emailInput || !passwordInput || !confirmPasswordInput || !submitBtn) {

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

    // Validate all fields
    if (!this.validateAllFields()) {
      this.showError('forgot-password-error', t('Please fix the validation errors above'));
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

      // Use AuthService for password reset
      const result = await authService.initiatePasswordReset(email, password);

      if (result.success) {

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

      this.showError('forgot-password-error', t('Network error. Please try again.'));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t('Send Verification Code');
    }
  }

  private async showPasswordResetVerificationModal(email: string, newPassword: string): Promise<void> {
    try {

      // Create a custom verification modal specifically for password reset
      this.createPasswordResetVerificationModal(email, newPassword);

    } catch (error) {

      this.showError('forgot-password-error', t('Unable to load verification modal. Please try again.'));
    }
  }

  private createPasswordResetVerificationModal(email: string, newPassword: string): void {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
    overlay.id = 'password-reset-verify-modal';

    // Create modal content
    overlay.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-auto border border-gray-700">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-white">${t('Verify Password Reset')}</h2>
          <button id="close-password-reset-verify" class="text-gray-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-4 bg-lime-500/20 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <p class="text-gray-300 mb-2">${t('We sent a verification code to your email')}</p>
          <p class="text-lime-400 font-semibold">${email}</p>
          <p class="text-gray-400 text-sm mt-2">${t('Enter the 6-digit code to reset your password')}</p>
        </div>

        <form id="password-reset-verify-form">
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-3 text-center">${t('Verification Code')}</label>
            <div class="flex justify-center space-x-2 mb-2">
              <input type="text" id="reset-code-1" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-2" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-3" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-4" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-5" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-6" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
            </div>
            <div id="reset-verify-error" class="hidden mt-2 text-red-400 text-xs text-center"></div>
          </div>

          <div class="mb-4">
            <button type="submit" id="reset-verify-submit"
                    class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-3 px-4 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
              ${t('Reset Password')}
            </button>
          </div>
        </form>

        <div class="text-center">
          <p class="text-gray-400 text-sm mb-3">${t('Didn\'t receive the code?')}</p>
          <button id="reset-resend-code" class="text-lime-500 hover:text-lime-400 transition-colors duration-300 text-sm font-medium">
            ${t('Resend Code')}
          </button>
          <div id="reset-resend-timer" class="hidden text-gray-500 text-xs mt-1"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Setup event listeners for the custom modal
    this.setupPasswordResetVerifyListeners(email, newPassword, overlay);

    // Focus first input
    setTimeout(() => {
      const firstInput = overlay.querySelector('#reset-code-1') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  private setupPasswordResetVerifyListeners(email: string, newPassword: string, overlay: HTMLElement): void {
    const inputs = [
      overlay.querySelector('#reset-code-1') as HTMLInputElement,
      overlay.querySelector('#reset-code-2') as HTMLInputElement,
      overlay.querySelector('#reset-code-3') as HTMLInputElement,
      overlay.querySelector('#reset-code-4') as HTMLInputElement,
      overlay.querySelector('#reset-code-5') as HTMLInputElement,
      overlay.querySelector('#reset-code-6') as HTMLInputElement,
    ].filter(Boolean);

    const form = overlay.querySelector('#password-reset-verify-form') as HTMLFormElement;
    const closeBtn = overlay.querySelector('#close-password-reset-verify') as HTMLButtonElement;
    const resendBtn = overlay.querySelector('#reset-resend-code') as HTMLButtonElement;

    // Setup code inputs with auto-focus
    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;

        if (!/^\d*$/.test(value)) {
          target.value = '';
          return;
        }

        this.hideResetVerifyError(overlay);

        if (value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }

        const allFilled = inputs.every(inp => inp.value);
        if (allFilled) {
          setTimeout(() => this.handlePasswordResetVerification(email, newPassword, overlay), 100);
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData?.getData('text') || '';
        const digits = pasteData.replace(/\D/g, '').slice(0, 6);

        digits.split('').forEach((digit, i) => {
          if (inputs[i]) {
            inputs[i].value = digit;
          }
        });

        if (digits.length === 6) {
          inputs[5].focus();
          setTimeout(() => this.handlePasswordResetVerification(email, newPassword, overlay), 100);
        } else if (digits.length > 0) {
          inputs[Math.min(digits.length - 1, 5)].focus();
        }
      });

      input.addEventListener('focus', () => {
        input.select();
      });
    });

    // Form submission
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePasswordResetVerification(email, newPassword, overlay);
      });
    }

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
    }

    // Resend code
    if (resendBtn) {
      resendBtn.addEventListener('click', () => {
        this.handleResendPasswordResetCode(email, newPassword, overlay);
      });
    }

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  private async handlePasswordResetVerification(email: string, newPassword: string, overlay: HTMLElement): Promise<void> {
    const inputs = [
      overlay.querySelector('#reset-code-1') as HTMLInputElement,
      overlay.querySelector('#reset-code-2') as HTMLInputElement,
      overlay.querySelector('#reset-code-3') as HTMLInputElement,
      overlay.querySelector('#reset-code-4') as HTMLInputElement,
      overlay.querySelector('#reset-code-5') as HTMLInputElement,
      overlay.querySelector('#reset-code-6') as HTMLInputElement,
    ].filter(Boolean);

    const code = inputs.map(input => input.value).join('');
    const submitBtn = overlay.querySelector('#reset-verify-submit') as HTMLButtonElement;

    if (code.length !== 6) {
      this.showResetVerifyError(overlay, t('Please enter all 6 digits'));
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      this.showResetVerifyError(overlay, t('Please enter numbers only'));
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('Resetting Password...');
    }

    try {
      const result = await authService.completePasswordReset(email, code, newPassword);

      if (result.success) {
        this.showResetVerifySuccess(overlay);
        setTimeout(() => {
          document.body.removeChild(overlay);
          this.showToast('success', t('Password Reset Successful'),
            t('Your password has been updated successfully. You can now login.'));
        }, 1500);
      } else {
        this.showResetVerifyError(overlay, result.message || t('Invalid verification code'));
        this.clearResetVerifyInputs(overlay);
      }
    } catch (error) {

      this.showResetVerifyError(overlay, t('Network error. Please try again.'));
      this.clearResetVerifyInputs(overlay);
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t('Reset Password');
    }
  }

  private async handleResendPasswordResetCode(email: string, newPassword: string, overlay: HTMLElement): Promise<void> {
    const resendBtn = overlay.querySelector('#reset-resend-code') as HTMLButtonElement;
    const timerDiv = overlay.querySelector('#reset-resend-timer') as HTMLElement;

    try {
      await authService.resendPasswordResetCode(email, newPassword);
      this.showToast('info', t('Code Resent'), t('A new verification code has been sent to your email'));

      if (resendBtn && timerDiv) {
        this.startResetResendCooldown(resendBtn, timerDiv);
      }
    } catch (error) {

      this.showToast('error', 'Error', 'Failed to resend verification code');
    }
  }

  private startResetResendCooldown(button: HTMLButtonElement, timerDiv: HTMLElement): void {
    let countdown = 30;
    button.disabled = true;
    button.textContent = t('Code Sent');

    timerDiv.classList.remove('hidden');

    const timer = setInterval(() => {
      timerDiv.textContent = `You can request a new code in ${countdown} seconds`;
      countdown--;

      if (countdown < 0) {
        clearInterval(timer);
        button.disabled = false;
        button.textContent = t('Resend Code');
        timerDiv.classList.add('hidden');
      }
    }, 1000);
  }

  private showResetVerifyError(overlay: HTMLElement, message: string): void {
    const errorDiv = overlay.querySelector('#reset-verify-error') as HTMLElement;
    const inputs = [
      overlay.querySelector('#reset-code-1') as HTMLInputElement,
      overlay.querySelector('#reset-code-2') as HTMLInputElement,
      overlay.querySelector('#reset-code-3') as HTMLInputElement,
      overlay.querySelector('#reset-code-4') as HTMLInputElement,
      overlay.querySelector('#reset-code-5') as HTMLInputElement,
      overlay.querySelector('#reset-code-6') as HTMLInputElement,
    ].filter(Boolean);

    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }

    inputs.forEach(input => {
      input.classList.add('border-red-500');
      input.classList.remove('border-lime-500');
    });
  }

  private showResetVerifySuccess(overlay: HTMLElement): void {
    const errorDiv = overlay.querySelector('#reset-verify-error') as HTMLElement;
    const inputs = [
      overlay.querySelector('#reset-code-1') as HTMLInputElement,
      overlay.querySelector('#reset-code-2') as HTMLInputElement,
      overlay.querySelector('#reset-code-3') as HTMLInputElement,
      overlay.querySelector('#reset-code-4') as HTMLInputElement,
      overlay.querySelector('#reset-code-5') as HTMLInputElement,
      overlay.querySelector('#reset-code-6') as HTMLInputElement,
    ].filter(Boolean);

    if (errorDiv) {
      errorDiv.textContent = t('Password reset successful!');
      errorDiv.className = 'mt-2 text-lime-400 text-xs text-center';
      errorDiv.classList.remove('hidden');
    }

    inputs.forEach(input => {
      input.classList.add('border-lime-500');
      input.classList.remove('border-red-500');
    });
  }

  private hideResetVerifyError(overlay: HTMLElement): void {
    const errorDiv = overlay.querySelector('#reset-verify-error') as HTMLElement;
    const inputs = [
      overlay.querySelector('#reset-code-1') as HTMLInputElement,
      overlay.querySelector('#reset-code-2') as HTMLInputElement,
      overlay.querySelector('#reset-code-3') as HTMLInputElement,
      overlay.querySelector('#reset-code-4') as HTMLInputElement,
      overlay.querySelector('#reset-code-5') as HTMLInputElement,
      overlay.querySelector('#reset-code-6') as HTMLInputElement,
    ].filter(Boolean);

    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }

    inputs.forEach(input => {
      input.classList.remove('border-red-500');
    });
  }

  private clearResetVerifyInputs(overlay: HTMLElement): void {
    const inputs = [
      overlay.querySelector('#reset-code-1') as HTMLInputElement,
      overlay.querySelector('#reset-code-2') as HTMLInputElement,
      overlay.querySelector('#reset-code-3') as HTMLInputElement,
      overlay.querySelector('#reset-code-4') as HTMLInputElement,
      overlay.querySelector('#reset-code-5') as HTMLInputElement,
      overlay.querySelector('#reset-code-6') as HTMLInputElement,
    ].filter(Boolean);

    inputs.forEach(input => {
      input.value = '';
    });

    if (inputs[0]) {
      inputs[0].focus();
    }
  }

  showModal(): void {
    this.show('forgot-password');
  }
}

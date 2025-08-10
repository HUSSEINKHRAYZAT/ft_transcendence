// VerifyModal.ts - Email verification modal component
import { BaseModal } from './BaseModal';
import { findElement } from '../../utils/DOMHelpers';

export class VerifyModal extends BaseModal {
  private userEmail: string = '';
  private onVerificationSuccess?: () => void;
  private onResendCode?: () => void;

  constructor(userEmail: string, onVerificationSuccess?: () => void, onResendCode?: () => void) {
    super();
    this.userEmail = userEmail;
    this.onVerificationSuccess = onVerificationSuccess;
    this.onResendCode = onResendCode;
  }

  protected getModalTitle(): string {
    return 'Verify Your Email';
  }

  protected getModalContent(): string {
    return `
      <div class="text-center mb-6">
        <div class="w-16 h-16 mx-auto mb-4 bg-lime-500/20 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
        <p class="text-gray-300 mb-2">We've sent a 4-digit verification code to:</p>
        <p class="text-lime-400 font-semibold">${this.userEmail}</p>
        <p class="text-gray-400 text-sm mt-2">Please enter the code below to continue</p>
      </div>

      <form id="verify-form">
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-3 text-center">Verification Code</label>
          <div class="flex justify-center space-x-2 mb-2">
            <input type="text" id="code-1" maxlength="1"
                   class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                   pattern="[0-9]" inputmode="numeric">
            <input type="text" id="code-2" maxlength="1"
                   class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                   pattern="[0-9]" inputmode="numeric">
            <input type="text" id="code-3" maxlength="1"
                   class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                   pattern="[0-9]" inputmode="numeric">
            <input type="text" id="code-4" maxlength="1"
                   class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                   pattern="[0-9]" inputmode="numeric">
          </div>
          <div id="verify-error" class="hidden mt-2 text-red-400 text-xs text-center"></div>
        </div>

        <div class="mb-4">
          <button type="submit" id="verify-submit"
                  class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-3 px-4 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            Verify Email
          </button>
        </div>
      </form>

      <div class="text-center">
        <p class="text-gray-400 text-sm mb-3">Didn't receive the code?</p>
        <button id="resend-code" class="text-lime-500 hover:text-lime-400 transition-colors duration-300 text-sm font-medium">
          Resend Code
        </button>
        <div id="resend-timer" class="hidden text-gray-500 text-xs mt-1"></div>
      </div>

      <div class="mt-6 pt-4 border-t border-gray-700 text-center">
        <p class="text-xs text-gray-500 mb-2">Having trouble?</p>
        <button id="change-email" class="text-gray-400 hover:text-gray-300 transition-colors duration-300 text-xs">
          Use a different email address
        </button>
      </div>
    `;
  }

  protected setupEventListeners(): void {
    this.setupCodeInputs();
    this.setupFormSubmission();
    this.setupResendCode();
    this.setupChangeEmail();

    // Focus first input
    setTimeout(() => {
      const firstInput = findElement('#code-1') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  /**
   * Setup 4-digit code input behavior
   */
  private setupCodeInputs(): void {
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    inputs.forEach((input, index) => {
      // Move to next input on input
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;

        // Only allow numbers
        if (!/^\d*$/.test(value)) {
          target.value = '';
          return;
        }

        // Clear error styling when user types
        this.clearErrors();

        // Move to next input if value is entered
        if (value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }

        // Auto-submit if all fields are filled
        if (index === inputs.length - 1 && value) {
          const allFilled = inputs.every(inp => inp.value);
          if (allFilled) {
            setTimeout(() => this.handleVerify(), 100);
          }
        }
      });

      // Handle backspace
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
      });

      // Handle paste
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData?.getData('text') || '';
        const digits = pasteData.replace(/\D/g, '').slice(0, 4);

        digits.split('').forEach((digit, i) => {
          if (inputs[i]) {
            inputs[i].value = digit;
          }
        });

        if (digits.length === 4) {
          inputs[3].focus();
          setTimeout(() => this.handleVerify(), 100);
        } else if (digits.length > 0) {
          inputs[Math.min(digits.length - 1, 3)].focus();
        }
      });

      // Select all on focus
      input.addEventListener('focus', () => {
        input.select();
      });
    });
  }

  /**
   * Setup form submission
   */
  private setupFormSubmission(): void {
    const form = findElement('#verify-form') as HTMLFormElement;

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleVerify();
      });
    }
  }

  /**
   * Setup resend code functionality
   */
  private setupResendCode(): void {
    const resendBtn = findElement('#resend-code') as HTMLButtonElement;
    const timerDiv = findElement('#resend-timer') as HTMLElement;

    if (resendBtn) {
      resendBtn.addEventListener('click', () => {
        this.handleResendCode();
        this.startResendCooldown(resendBtn, timerDiv);
      });
    }
  }

  /**
   * Setup change email functionality
   */
  private setupChangeEmail(): void {
    const changeEmailBtn = findElement('#change-email') as HTMLButtonElement;

    if (changeEmailBtn) {
      changeEmailBtn.addEventListener('click', () => {
        this.close();
        // This would typically go back to signup modal
        console.log('👤 Change email requested - going back to signup');
      });
    }
  }

  /**
   * Handle verification code submission
   */
  private handleVerify(): void {
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    const code = inputs.map(input => input.value).join('');

    if (code.length !== 4) {
      this.showError('Please enter all 4 digits');
      return;
    }

    if (!/^\d{4}$/.test(code)) {
      this.showError('Please enter numbers only');
      return;
    }

    console.log('🔑 Verifying code:', code);

    // Disable submit button during verification
    const submitBtn = findElement('#verify-submit') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';
    }

    // Simulate verification (for now, accept 0000 as valid)
    setTimeout(() => {
      if (code === '0000') {
        this.showSuccess();
        setTimeout(() => {
          this.close();
          if (this.onVerificationSuccess) {
            this.onVerificationSuccess();
          }
        }, 1500);
      } else {
        this.showError('Invalid verification code. Please try again.');
        this.clearInputs();
      }

      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Email';
      }
    }, 1500);
  }

  /**
   * Handle resend code
   */
  private handleResendCode(): void {
    console.log('📧 Resending verification code to:', this.userEmail);

    // Show success message
    this.showToast('info', 'Code Resent', 'A new verification code has been sent to your email');

    // Call the resend callback if provided
    if (this.onResendCode) {
      this.onResendCode();
    }
  }

  /**
   * Start resend cooldown timer
   */
  private startResendCooldown(button: HTMLButtonElement, timerDiv: HTMLElement): void {
    let countdown = 30;
    button.disabled = true;
    button.textContent = 'Code Sent';

    timerDiv.classList.remove('hidden');

    const timer = setInterval(() => {
      timerDiv.textContent = `You can request another code in ${countdown} seconds`;
      countdown--;

      if (countdown < 0) {
        clearInterval(timer);
        button.disabled = false;
        button.textContent = 'Resend Code';
        timerDiv.classList.add('hidden');
      }
    }, 1000);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorDiv = findElement('#verify-error') as HTMLElement;
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }

    // Add error styling to inputs
    inputs.forEach(input => {
      input.classList.add('border-red-500');
      input.classList.remove('border-lime-500');
    });
  }

  /**
   * Show success message
   */
  private showSuccess(): void {
    const errorDiv = findElement('#verify-error') as HTMLElement;
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    if (errorDiv) {
      errorDiv.textContent = '✓ Email verified successfully!';
      errorDiv.className = 'mt-2 text-lime-400 text-xs text-center';
      errorDiv.classList.remove('hidden');
    }

    // Add success styling to inputs
    inputs.forEach(input => {
      input.classList.add('border-lime-500');
      input.classList.remove('border-red-500');
    });
  }

  /**
   * Clear error messages and styling
   */
  private clearErrors(): void {
    const errorDiv = findElement('#verify-error') as HTMLElement;
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }

    // Remove error styling from inputs
    inputs.forEach(input => {
      input.classList.remove('border-red-500');
    });
  }

  /**
   * Clear all input values
   */
  private clearInputs(): void {
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    inputs.forEach(input => {
      input.value = '';
    });

    // Focus first input
    if (inputs[0]) {
      inputs[0].focus();
    }
  }

  /**
   * Show modal - override to use custom ID
   */
  showModal(): void {
    this.show('verify');
  }
}

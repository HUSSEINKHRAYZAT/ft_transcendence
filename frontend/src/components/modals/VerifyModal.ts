
import { BaseModal } from './BaseModal';
import { findElement } from '../../utils/DOMHelpers';
import { t } from "../../langs/LanguageManager";

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
    return t('verify.title');
  }

  protected getModalContent(): string {
    return `
      <div class="text-center mb-6">
        <div class="w-16 h-16 mx-auto mb-4 bg-lime-500/20 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
        <p class="text-gray-300 mb-2">${t('verify.sentCode')}</p>
        <p class="text-lime-400 font-semibold">${this.userEmail}</p>
        <p class="text-gray-400 text-sm mt-2">${t('verify.enterCode')}</p>
      </div>

      <form id="verify-form">
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-3 text-center">${t('verify.codeLabel')}</label>
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
            ${t('verify.submitButton')}
          </button>
        </div>
      </form>

      <div class="text-center">
        <p class="text-gray-400 text-sm mb-3">${t('verify.noCodeReceived')}</p>
        <button id="resend-code" class="text-lime-500 hover:text-lime-400 transition-colors duration-300 text-sm font-medium">
          ${t('verify.resendButton')}
        </button>
        <div id="resend-timer" class="hidden text-gray-500 text-xs mt-1"></div>
      </div>

      <div class="mt-6 pt-4 border-t border-gray-700 text-center">
        <p class="text-xs text-gray-500 mb-2">${t('verify.havingTrouble')}</p>
        <button id="change-email" class="text-gray-400 hover:text-gray-300 transition-colors duration-300 text-xs">
          ${t('verify.changeEmailButton')}
        </button>
      </div>
    `;
  }

  protected setupEventListeners(): void {
    this.setupCodeInputs();
    this.setupFormSubmission();
    this.setupResendCode();
    this.setupChangeEmail();

    setTimeout(() => {
      const firstInput = findElement('#code-1') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  private setupCodeInputs(): void {
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;

        if (!/^\d*$/.test(value)) {
          target.value = '';
          return;
        }

        this.clearErrors();

        if (value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }

        if (index === inputs.length - 1 && value) {
          const allFilled = inputs.every(inp => inp.value);
          if (allFilled) {
            setTimeout(() => this.handleVerify(), 100);
          }
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

      input.addEventListener('focus', () => {
        input.select();
      });
    });
  }

  private setupFormSubmission(): void {
    const form = findElement('#verify-form') as HTMLFormElement;

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleVerify();
      });
    }
  }

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

  private setupChangeEmail(): void {
    const changeEmailBtn = findElement('#change-email') as HTMLButtonElement;

    if (changeEmailBtn) {
      changeEmailBtn.addEventListener('click', () => {
        this.close();
        console.log('👤 Change email requested - going back to signup');
      });
    }
  }

  private handleVerify(): void {
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    const code = inputs.map(input => input.value).join('');

    if (code.length !== 4) {
      this.showError(t('verify.errors.incompleteCode'));
      return;
    }

    if (!/^\d{4}$/.test(code)) {
      this.showError(t('verify.errors.numbersOnly'));
      return;
    }

    console.log('🔑 Verifying code:', code);

    const submitBtn = findElement('#verify-submit') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('verify.verifying');
    }

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
        this.showError(t('verify.errors.invalidCode'));
        this.clearInputs();
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('verify.submitButton');
      }
    }, 1500);
  }

  private handleResendCode(): void {
    console.log('📧 Resending verification code to:', this.userEmail);

    this.showToast(
      'info',
      t('verify.resendToast.title'),
      t('verify.resendToast.message')
    );

    if (this.onResendCode) {
      this.onResendCode();
    }
  }

  private startResendCooldown(button: HTMLButtonElement, timerDiv: HTMLElement): void {
    let countdown = 30;
    button.disabled = true;
    button.textContent = t('verify.codeSent');

    timerDiv.classList.remove('hidden');

    const timer = setInterval(() => {
      timerDiv.textContent = t('verify.resendTimer', { seconds: countdown });
      countdown--;

      if (countdown < 0) {
        clearInterval(timer);
        button.disabled = false;
        button.textContent = t('verify.resendButton');
        timerDiv.classList.add('hidden');
      }
    }, 1000);
  }

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

    inputs.forEach(input => {
      input.classList.add('border-red-500');
      input.classList.remove('border-lime-500');
    });
  }

  private showSuccess(): void {
    const errorDiv = findElement('#verify-error') as HTMLElement;
    const inputs = [
      findElement('#code-1') as HTMLInputElement,
      findElement('#code-2') as HTMLInputElement,
      findElement('#code-3') as HTMLInputElement,
      findElement('#code-4') as HTMLInputElement,
    ].filter(Boolean);

    if (errorDiv) {
      errorDiv.textContent = t('verify.successMessage');
      errorDiv.className = 'mt-2 text-lime-400 text-xs text-center';
      errorDiv.classList.remove('hidden');
    }

    inputs.forEach(input => {
      input.classList.add('border-lime-500');
      input.classList.remove('border-red-500');
    });
  }

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

    inputs.forEach(input => {
      input.classList.remove('border-red-500');
    });
  }

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

    if (inputs[0]) {
      inputs[0].focus();
    }
  }

  showModal(): void {
    this.show('verify');
  }
}

import { BaseModal } from "./BaseModal";
import { authService } from "../../services/AuthService";
import { findElement } from "../../utils/DOMHelpers";
import { VerifyModal } from './VerifyModal';
import { t } from "../../langs/LanguageManager";

export class SignupModal extends BaseModal {
  private onSwitchToLogin?: () => void;

  constructor(onSwitchToLogin?: () => void) {
    super();
    this.onSwitchToLogin = onSwitchToLogin;
  }

  protected getModalTitle(): string {
    return t("signup.title");
  }

  protected getModalContent(): string {
    return `
      <form id="signup-form">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t("signup.firstNameLabel")}</label>
          <input type="text" id="signup-firstname" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${t("signup.firstNamePlaceholder")}">
          <div id="firstname-error" class="hidden mt-1 text-red-400 text-xs"></div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t("signup.lastNameLabel")}</label>
          <input type="text" id="signup-lastname" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${t("signup.lastNamePlaceholder")}">
          <div id="lastname-error" class="hidden mt-1 text-red-400 text-xs"></div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t("signup.usernameLabel")}</label>
          <input type="text" id="signup-username" required minlength="3"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                placeholder="${t("signup.usernamePlaceholder")}">
          <div id="username-suggestions" class="hidden mt-2 p-2 bg-yellow-900/50 border border-yellow-500 rounded text-yellow-200 text-sm">
            <p class="font-bold mb-1">${t("signup.usernameTaken")}</p>
            <div id="suggestion-list" class="space-y-1"></div>
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t("signup.emailLabel")}</label>
          <input type="email" id="signup-email" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${t("signup.emailPlaceholder")}">
        </div>
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">${t("signup.passwordLabel")}</label>
          <input type="password" id="signup-password" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${t("signup.passwordPlaceholder")}">
          <div id="password-error" class="hidden mt-1 text-red-400 text-xs"></div>
          <div id="password-strength" class="mt-2">
            <div class="flex space-x-1">
              <div class="password-req" id="length-req">
                <span class="text-gray-400 text-xs">✗ ${t("signup.passwordReqLength")}</span>
              </div>
            </div>
            <div class="flex space-x-1 mt-1">
              <div class="password-req" id="number-req">
                <span class="text-gray-400 text-xs">✗ ${t("signup.passwordReqNumber")}</span>
              </div>
            </div>
          </div>
        </div>
        <div id="signup-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
        <button type="submit" id="signup-submit"
                class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">
          ${t("signup.submitButton")}
        </button>
      </form>
      <div class="text-center">
        <p class="text-gray-400">${t("signup.haveAccount")}
          <button type="button" id="switch-to-login" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">${t("signup.loginLink")}</button>
        </p>
        <div class="mt-4 pt-4 border-t border-gray-700">
          <button id="google-signup" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300">
            ${t("signup.googleButton")}
          </button>
        </div>
      </div>
    `;
  }

  protected setupEventListeners(): void {
    this.setupNameValidation();
    this.setupPasswordValidation();
    this.setupUsernameValidation();
    this.setupEmailValidation();

    const form = findElement("#signup-form") as HTMLFormElement;
    form?.addEventListener("submit", (e) => this.handleSignup(e));

    const switchBtn = findElement("#switch-to-login");
    switchBtn?.addEventListener("click", () => {
      this.close();
      this.onSwitchToLogin?.();
    });

    const googleBtn = findElement("#google-signup");
    googleBtn?.addEventListener("click", () => this.handleGoogleSignup());
  }

  private setupNameValidation(): void {
    const firstNameInput = findElement("#signup-firstname") as HTMLInputElement;
    const lastNameInput = findElement("#signup-lastname") as HTMLInputElement;
    const firstNameError = findElement("#firstname-error") as HTMLElement;
    const lastNameError = findElement("#lastname-error") as HTMLElement;

    const validateName = (input: HTMLInputElement, errorElement: HTMLElement, fieldName: string) => {
      const value = input.value;
      const alphabeticRegex = /^[a-zA-Z\s]*$/;

      input.classList.remove('border-red-500', 'border-green-500');

      if (value.length === 0) {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500', 'border-green-500');
        return true;
      }

      if (!alphabeticRegex.test(value)) {
        errorElement.textContent = t("validation.name.lettersOnly", { fieldName });
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        return false;
      } else if (value.trim().length < 2) {
        errorElement.textContent = t("validation.name.minLength", { fieldName });
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        return false;
      } else {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500');
        return true;
      }
    };

    firstNameInput?.addEventListener('keyup', () => {
      validateName(firstNameInput, firstNameError, t("fields.firstName"));
    });

    lastNameInput?.addEventListener('keyup', () => {
      validateName(lastNameInput, lastNameError, t("fields.lastName"));
    });

    firstNameInput?.addEventListener('blur', () => {
      validateName(firstNameInput, firstNameError, t("fields.firstName"));
    });

    lastNameInput?.addEventListener('blur', () => {
      validateName(lastNameInput, lastNameError, t("fields.lastName"));
    });
  }

  private setupPasswordValidation(): void {
    const passwordInput = findElement("#signup-password") as HTMLInputElement;
    const passwordError = findElement("#password-error") as HTMLElement;

    const lengthReq = findElement("#length-req") as HTMLElement;
    const numberReq = findElement("#number-req") as HTMLElement;

    let uppercaseReq = findElement("#uppercase-req") as HTMLElement;
    if (!uppercaseReq) {
      uppercaseReq = document.createElement("div");
      uppercaseReq.id = "uppercase-req";
      uppercaseReq.className = "password-req";
      uppercaseReq.innerHTML = `<span class="text-gray-400 text-xs">✗ ${t("validation.password.uppercase")}</span>`;
      lengthReq.parentElement?.appendChild(uppercaseReq);
    }
    let specialReq = findElement("#special-req") as HTMLElement;
    if (!specialReq) {
      specialReq = document.createElement("div");
      specialReq.id = "special-req";
      specialReq.className = "password-req";
      specialReq.innerHTML = `<span class="text-gray-400 text-xs">✗ ${t("validation.password.specialChar")}</span>`;
      lengthReq.parentElement?.appendChild(specialReq);
    }

    const validatePassword = () => {
      const password = passwordInput.value;
      let isValid = true;

      passwordInput.classList.remove('border-red-500', 'border-green-500');

      const lengthSpan = lengthReq?.querySelector('span');
      if (password.length >= 6) {
        if (lengthSpan) {
          lengthSpan.className = 'text-green-400 text-xs';
          lengthSpan.textContent = `✓ ${t("validation.password.lengthValid")}`;
        }
      } else {
        if (lengthSpan) {
          lengthSpan.className = 'text-red-400 text-xs';
          lengthSpan.textContent = `✗ ${t("validation.password.length")}`;
        }
        isValid = false;
      }

      const hasNumber = /\d/.test(password);
      const numberSpan = numberReq?.querySelector('span');
      if (hasNumber) {
        if (numberSpan) {
          numberSpan.className = 'text-green-400 text-xs';
          numberSpan.textContent = `✓ ${t("validation.password.numberValid")}`;
        }
      } else {
        if (numberSpan) {
          numberSpan.className = 'text-red-400 text-xs';
          numberSpan.textContent = `✗ ${t("validation.password.number")}`;
        }
        if (password.length > 0) {
          isValid = false;
        }
      }

      const hasUppercase = /[A-Z]/.test(password);
      const uppercaseSpan = uppercaseReq?.querySelector('span');
      if (hasUppercase) {
        if (uppercaseSpan) {
          uppercaseSpan.className = 'text-green-400 text-xs';
          uppercaseSpan.textContent = `✓ ${t("validation.password.uppercaseValid")}`;
        }
      } else {
        if (uppercaseSpan) {
          uppercaseSpan.className = 'text-red-400 text-xs';
          uppercaseSpan.textContent = `✗ ${t("validation.password.uppercase")}`;
        }
        if (password.length > 0) {
          isValid = false;
        }
      }

      const hasSpecialChar = /[!@#$%^&*()_\-+=\[\]{}|\\:;"'<>,.?\/]/.test(password);
      const specialSpan = specialReq?.querySelector('span');
      if (hasSpecialChar) {
        if (specialSpan) {
          specialSpan.className = 'text-green-400 text-xs';
          specialSpan.textContent = `✓ ${t("validation.password.specialCharValid")}`;
        }
      } else {
        if (specialSpan) {
          specialSpan.className = 'text-red-400 text-xs';
          specialSpan.textContent = `✗ ${t("validation.password.specialChar")}`;
        }
        if (password.length > 0) {
          isValid = false;
        }
      }

      if (password.length === 0) {
        passwordInput.classList.remove('border-red-500', 'border-green-500');
        passwordError.classList.add('hidden');
      } else if (isValid && password.length >= 6) {
        passwordInput.classList.remove('border-red-500');
        passwordInput.classList.add('border-green-500');
        passwordError.classList.add('hidden');
      } else if (password.length > 0) {
        passwordInput.classList.remove('border-green-500');
        passwordInput.classList.add('border-red-500');

        let errorMsg = '';
        if (password.length < 6) {
          errorMsg = t("validation.password.length");
        } else if (!hasNumber) {
          errorMsg = t("validation.password.number");
        } else if (!hasUppercase) {
          errorMsg = t("validation.password.uppercase");
        } else if (!hasSpecialChar) {
          errorMsg = t("validation.password.specialChar");
        }

        if (errorMsg) {
          passwordError.textContent = errorMsg;
          passwordError.classList.remove('hidden');
        }
      }

      return isValid;
    };

    passwordInput?.addEventListener('keyup', validatePassword);
    passwordInput?.addEventListener('blur', validatePassword);
  }

  private setupUsernameValidation(): void {
    const usernameInput = findElement("#signup-username") as HTMLInputElement;
    const usernameSuggestions = findElement("#username-suggestions") as HTMLElement;

    const showError = (message: string) => {
      if (!usernameSuggestions) return;
      usernameSuggestions.classList.add("hidden");
      let errorDiv = findElement("#username-error") as HTMLElement;
      if (!errorDiv) {
        errorDiv = document.createElement("div");
        errorDiv.id = "username-error";
        errorDiv.className = "mt-1 text-red-400 text-xs";
        usernameInput.parentElement?.appendChild(errorDiv);
      }
      errorDiv.textContent = message;
      errorDiv.classList.remove("hidden");
      usernameInput.classList.add("border-red-500");
      usernameInput.classList.remove("border-green-500");
    };

    const hideError = () => {
      const errorDiv = findElement("#username-error") as HTMLElement;
      if (errorDiv) {
        errorDiv.classList.add("hidden");
        errorDiv.textContent = "";
      }
      usernameInput.classList.remove("border-red-500");
      usernameInput.classList.add("border-green-500");
    };

    const validateUsername = () => {
      const value = usernameInput.value.trim();

      if (value.length === 0) {
        hideError();
        return true;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        showError(t("validation.username.allowedChars"));
        return false;
      }

      if (!/[a-zA-Z]/.test(value)) {
        showError(t("validation.username.letterRequired"));
        return false;
      }
      if (!/\d/.test(value)) {
        showError(t("validation.username.numberRequired"));
        return false;
      }

      hideError();
      return true;
    };

    usernameInput?.addEventListener("keyup", validateUsername);
    usernameInput?.addEventListener("blur", validateUsername);
  }

  private setupEmailValidation(): void {
    const emailInput = findElement("#signup-email") as HTMLInputElement;
    let emailError = findElement("#email-error") as HTMLElement;
    if (!emailError) {
      emailError = document.createElement("div");
      emailError.id = "email-error";
      emailError.className = "mt-1 text-red-400 text-xs hidden";
      emailInput.parentElement?.appendChild(emailError);
    }

    const validateEmail = () => {
      const value = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (value.length === 0) {
        emailError.classList.add("hidden");
        emailInput.classList.remove("border-red-500", "border-green-500");
        return true;
      }

      if (!emailRegex.test(value)) {
        emailError.textContent = t("validation.email.invalid");
        emailError.classList.remove("hidden");
        emailInput.classList.add("border-red-500");
        emailInput.classList.remove("border-green-500");
        return false;
      }

      emailError.classList.add("hidden");
      emailInput.classList.remove("border-red-500");
      emailInput.classList.add("border-green-500");
      return true;
    };

    emailInput?.addEventListener("keyup", validateEmail);
    emailInput?.addEventListener("blur", validateEmail);
  }

  private validateAllFields(): boolean {
    const firstNameInput = findElement("#signup-firstname") as HTMLInputElement;
    const lastNameInput = findElement("#signup-lastname") as HTMLInputElement;
    const passwordInput = findElement("#signup-password") as HTMLInputElement;

    let isValid = true;

    if (firstNameInput) {
      const alphabeticRegex = /^[a-zA-Z\s]+$/;
      if (!alphabeticRegex.test(firstNameInput.value) || firstNameInput.value.trim().length < 2) {
        isValid = false;
        firstNameInput.classList.add('border-red-500');
      }
    }

    if (lastNameInput) {
      const alphabeticRegex = /^[a-zA-Z\s]+$/;
      if (!alphabeticRegex.test(lastNameInput.value) || lastNameInput.value.trim().length < 2) {
        isValid = false;
        lastNameInput.classList.add('border-red-500');
      }
    }

    if (passwordInput) {
      const password = passwordInput.value;
      const hasNumbers = /\d/.test(password);
      if (password.length < 6 || !hasNumbers) {
        isValid = false;
        passwordInput.classList.add('border-red-500');
      }
    }

    return isValid;
  }

  private handleGoogleSignup(): void {
    const googleBtn = findElement("#google-signup") as HTMLButtonElement;
    if (!googleBtn) return;

    googleBtn.disabled = true;
    googleBtn.textContent = t("signup.googleConnecting");

    setTimeout(() => {
      const googleUser = {
        id: "google-" + Date.now(),
        firstName: "Google",
        lastName: "User",
        email: "google.user@gmail.com",
        avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      };

      localStorage.setItem("ft_pong_auth_token", "google-token-" + Date.now());
      localStorage.setItem("ft_pong_user_data", JSON.stringify(googleUser));

      this.close();
      this.showToast(
        "success",
        t("toast.googleAuthTitle"),
        t("toast.welcomeMessage", { name: googleUser.firstName })
      );

      this.triggerAuthUpdate(true, googleUser);
    }, 2000);
  }

  private async handleSignup(event: Event): Promise<void> {
    event.preventDefault();

    const firstNameInput = findElement("#signup-firstname") as HTMLInputElement;
    const lastNameInput = findElement("#signup-lastname") as HTMLInputElement;
    const usernameInput = findElement("#signup-username") as HTMLInputElement;
    const emailInput = findElement("#signup-email") as HTMLInputElement;
    const passwordInput = findElement("#signup-password") as HTMLInputElement;
    const submitBtn = findElement("#signup-submit") as HTMLButtonElement;
    const errorDiv = findElement("#signup-error") as HTMLElement;
    const suggestionsDiv = findElement("#username-suggestions") as HTMLElement;

    if (
      !firstNameInput ||
      !lastNameInput ||
      !usernameInput ||
      !emailInput ||
      !passwordInput ||
      !submitBtn
    ) return;

    errorDiv?.classList.add("hidden");
    suggestionsDiv?.classList.add("hidden");

    if (!this.validateAllFields()) {
      this.showError("signup-error", t("validation.fixErrors"));
      return;
    }

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    submitBtn.disabled = true;
    submitBtn.textContent = t("signup.creatingAccount");

    try {
      if (typeof authService !== "undefined") {
        const result = await authService.signup({
          firstName,
          lastName,
          username,
          email,
          password,
        });

        if (result.success) {
          this.close();

      const verifyModal = new VerifyModal(
        email,
        () => { /* success callback */ },
        () => { /* resend callback */ },
        result.token 
      );

          verifyModal.showModal();
        }
        else
        {
          if (result.conflict === "username" && result.suggestions?.length) {
            this.showUsernameSuggestions(result.suggestions);
          } else {
            this.showError("signup-error", result.message || t("signup.failed"));
          }
        }
      } else {
        // Demo/fallback mode (localStorage)
        const userData = {
          id: Date.now().toString(),
          firstName,
          lastName,
          email,
          username,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
        };

        localStorage.setItem("ft_pong_auth_token", "demo-token-" + Date.now());
        localStorage.setItem("ft_pong_user_data", JSON.stringify(userData));

        this.close();

        const verifyModal = new VerifyModal(
          email,
          () => {
            this.showToast(
              "success",
              t("toast.accountCreated"),
              t("toast.welcomeUser", { name: firstName })
            );
            this.triggerAuthUpdate(true, userData);
          }
        );

        verifyModal.showModal();
      }
    } catch (error) {
      console.error("Signup error:", error);
      this.showError("signup-error", t("errors.unexpected"));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t("signup.submitButton");
    }
}

  private showUsernameSuggestions(suggestions: string[]): void {
    const suggestionsDiv = findElement("#username-suggestions");
    const suggestionList = findElement("#suggestion-list");

    if (!suggestionsDiv || !suggestionList) return;

    suggestionList.innerHTML = "";

    suggestions.forEach((suggestion) => {
      const suggestionBtn = document.createElement("button");
      suggestionBtn.type = "button";
      suggestionBtn.className =
        "text-lime-400 hover:text-lime-300 underline cursor-pointer";
      suggestionBtn.textContent = suggestion;

      suggestionBtn.addEventListener("click", () => {
        const usernameInput = findElement(
          "#signup-username"
        ) as HTMLInputElement;
        if (usernameInput) {
          usernameInput.value = suggestion;
        }
        suggestionsDiv.classList.add("hidden");
      });

      const suggestionDiv = document.createElement("div");
      suggestionDiv.appendChild(suggestionBtn);
      suggestionList.appendChild(suggestionDiv);
    });

    suggestionsDiv.classList.remove("hidden");
  }

  showModal(): void {
    this.show("signup");
  }
}

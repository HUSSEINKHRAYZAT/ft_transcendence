
import { BaseModal } from "./BaseModal";
import { authService } from "../../services/AuthService";
import { findElement } from "../../utils/DOMHelpers";
import { VerifyModal } from './VerifyModal';


export class SignupModal extends BaseModal {
  private onSwitchToLogin?: () => void;

  constructor(onSwitchToLogin?: () => void)
  {
    super();
    this.onSwitchToLogin = onSwitchToLogin;
  }

  protected getModalTitle(): string
  {
    return "Sign Up";
  }

  protected getModalContent(): string
  {
    return `
      <form id="signup-form">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">First Name</label>
          <input type="text" id="signup-firstname" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="Enter your first name">
          <div id="firstname-error" class="hidden mt-1 text-red-400 text-xs"></div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
          <input type="text" id="signup-lastname" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="Enter your last name">
          <div id="lastname-error" class="hidden mt-1 text-red-400 text-xs"></div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
          <input type="text" id="signup-username" required minlength="3"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                placeholder="Choose a unique username">
          <div id="username-suggestions" class="hidden mt-2 p-2 bg-yellow-900/50 border border-yellow-500 rounded text-yellow-200 text-sm">
            <p class="font-bold mb-1">Username taken! Try these alternatives:</p>
            <div id="suggestion-list" class="space-y-1"></div>
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input type="email" id="signup-email" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="Enter your email">
        </div>
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <input type="password" id="signup-password" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="Enter your password (min 6 characters with numbers)">
          <div id="password-error" class="hidden mt-1 text-red-400 text-xs"></div>
          <div id="password-strength" class="mt-2">
            <div class="flex space-x-1">
              <div class="password-req" id="length-req">
                <span class="text-gray-400 text-xs">✗ At least 6 characters</span>
              </div>
            </div>
            <div class="flex space-x-1 mt-1">
              <div class="password-req" id="number-req">
                <span class="text-gray-400 text-xs">✗ Contains numbers</span>
              </div>
            </div>
          </div>
        </div>
        <div id="signup-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
        <button type="submit" id="signup-submit"
                class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">
          Sign Up
        </button>
      </form>
      <div class="text-center">
        <p class="text-gray-400">Already have an account?
          <button type="button" id="switch-to-login" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">Login</button>
        </p>
        <div class="mt-4 pt-4 border-t border-gray-700">
          <button id="google-signup" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300">
            Continue with Google
          </button>
        </div>
      </div>
    `;
  }

  protected setupEventListeners(): void
  {
    this.setupNameValidation();
    this.setupPasswordValidation();
    this.setupUsernameValidation();
    this.setupEmailValidation();


    const form = findElement("#signup-form") as HTMLFormElement;
    form?.addEventListener("submit", (e) => this.handleSignup(e));

    const switchBtn = findElement("#switch-to-login");
    switchBtn?.addEventListener("click", () =>
    {
      this.close();
      this.onSwitchToLogin?.();
    });

    const googleBtn = findElement("#google-signup");
    googleBtn?.addEventListener("click", () => this.handleGoogleSignup());
  }

  private setupNameValidation(): void
  {
    const firstNameInput = findElement("#signup-firstname") as HTMLInputElement;
    const lastNameInput = findElement("#signup-lastname") as HTMLInputElement;
    const firstNameError = findElement("#firstname-error") as HTMLElement;
    const lastNameError = findElement("#lastname-error") as HTMLElement;

    const validateName = (input: HTMLInputElement, errorElement: HTMLElement, fieldName: string) =>
    {
      const value = input.value;
      const alphabeticRegex = /^[a-zA-Z\s]*$/;

      input.classList.remove('border-red-500', 'border-green-500');

      if (value.length === 0)
      {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500', 'border-green-500');
        return true;
      }

      if (!alphabeticRegex.test(value))
      {
        errorElement.textContent = `${fieldName} can only contain letters and spaces`;
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        return false;
      }
      else if (value.trim().length < 2)
      {
        errorElement.textContent = `${fieldName} must be at least 2 characters long`;
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        return false;
      }
      else
      {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500');
        return true;
      }
    };

    firstNameInput?.addEventListener('keyup', () => {
      validateName(firstNameInput, firstNameError, 'First name');
    });

    lastNameInput?.addEventListener('keyup', () => {
      validateName(lastNameInput, lastNameError, 'Last name');
    });

    // Also validate on blur for better UX
    firstNameInput?.addEventListener('blur', () => {
      validateName(firstNameInput, firstNameError, 'First name');
    });

    lastNameInput?.addEventListener('blur', () => {
      validateName(lastNameInput, lastNameError, 'Last name');
    });
  }

 private setupPasswordValidation(): void {
  const passwordInput = findElement("#signup-password") as HTMLInputElement;
  const passwordError = findElement("#password-error") as HTMLElement;

  // Update your password requirement indicators
  const lengthReq = findElement("#length-req") as HTMLElement;
  const numberReq = findElement("#number-req") as HTMLElement;

  // Create or update extra requirements elements for uppercase and special chars
  let uppercaseReq = findElement("#uppercase-req") as HTMLElement;
  if (!uppercaseReq) {
    uppercaseReq = document.createElement("div");
    uppercaseReq.id = "uppercase-req";
    uppercaseReq.className = "password-req";
    uppercaseReq.innerHTML = `<span class="text-gray-400 text-xs">✗ Contains uppercase letter</span>`;
    lengthReq.parentElement?.appendChild(uppercaseReq);
  }
  let specialReq = findElement("#special-req") as HTMLElement;
  if (!specialReq) {
    specialReq = document.createElement("div");
    specialReq.id = "special-req";
    specialReq.className = "password-req";
    specialReq.innerHTML = `<span class="text-gray-400 text-xs">✗ Contains special character</span>`;
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
        lengthSpan.textContent = '✓ At least 6 characters';
      }
    } else {
      if (lengthSpan) {
        lengthSpan.className = 'text-red-400 text-xs';
        lengthSpan.textContent = '✗ At least 6 characters';
      }
      isValid = false;
    }

    const hasNumber = /\d/.test(password);
    const numberSpan = numberReq?.querySelector('span');
    if (hasNumber) {
      if (numberSpan) {
        numberSpan.className = 'text-green-400 text-xs';
        numberSpan.textContent = '✓ Contains numbers';
      }
    } else {
      if (numberSpan) {
        numberSpan.className = 'text-red-400 text-xs';
        numberSpan.textContent = '✗ Contains numbers';
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
        uppercaseSpan.textContent = '✓ Contains uppercase letter';
      }
    } else {
      if (uppercaseSpan) {
        uppercaseSpan.className = 'text-red-400 text-xs';
        uppercaseSpan.textContent = '✗ Contains uppercase letter';
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
        specialSpan.textContent = '✓ Contains special character';
      }
    } else {
      if (specialSpan) {
        specialSpan.className = 'text-red-400 text-xs';
        specialSpan.textContent = '✗ Contains special character';
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
        errorMsg = 'Password must be at least 6 characters long';
      } else if (!hasNumber) {
        errorMsg = 'Password must contain at least one number';
      } else if (!hasUppercase) {
        errorMsg = 'Password must contain at least one uppercase letter';
      } else if (!hasSpecialChar) {
        errorMsg = 'Password must contain at least one special character';
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
    usernameSuggestions.classList.add("hidden"); // hide suggestions if showing error
    // We'll show error message below the username field (reuse suggestionsDiv or create a new error div)
    // Let's create a small inline error div if not existing:
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
      // no error for empty? or require?
      hideError();
      return true; // empty is allowed here, or you can enforce required elsewhere
    }

    // Check allowed chars: letters, digits, underscores only
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      showError("Username can only contain letters, digits, and underscores");
      return false;
    }

    // Check contains at least one letter and at least one digit
    if (!/[a-zA-Z]/.test(value)) {
      showError("Username must contain at least one letter");
      return false;
    }
    if (!/\d/.test(value)) {
      showError("Username must contain at least one digit");
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
  // We'll show error below email input (reuse #email-error or create new)
  let emailError = findElement("#email-error") as HTMLElement;
  if (!emailError) {
    emailError = document.createElement("div");
    emailError.id = "email-error";
    emailError.className = "mt-1 text-red-400 text-xs hidden";
    emailInput.parentElement?.appendChild(emailError);
  }

  const validateEmail = () => {
    const value = emailInput.value.trim();

    // Simple email regex (for basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (value.length === 0) {
      // you can require or allow empty — up to your API handler
      emailError.classList.add("hidden");
      emailInput.classList.remove("border-red-500", "border-green-500");
      return true;
    }

    if (!emailRegex.test(value)) {
      emailError.textContent = "Please enter a valid email address";
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


  private validateAllFields(): boolean
  {
    const firstNameInput = findElement("#signup-firstname") as HTMLInputElement;
    const lastNameInput = findElement("#signup-lastname") as HTMLInputElement;
    const passwordInput = findElement("#signup-password") as HTMLInputElement;

    let isValid = true;

    if (firstNameInput)
    {
      const alphabeticRegex = /^[a-zA-Z\s]+$/;
      if (!alphabeticRegex.test(firstNameInput.value) || firstNameInput.value.trim().length < 2)
      {
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
      if (password.length < 6 || !hasNumbers)
      {
        isValid = false;
        passwordInput.classList.add('border-red-500');
      }
    }

    return isValid;
  }

  private handleGoogleSignup(): void
  {
    const googleBtn = findElement("#google-signup") as HTMLButtonElement;
    if (!googleBtn) return;

    googleBtn.disabled = true;
    googleBtn.textContent = "Connecting to Google...";

    setTimeout(() =>
      {
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
        "Google Authentication",
        `Welcome ${googleUser.firstName}!`
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
    this.showError("signup-error", "Please fix the validation errors above");
    return;
  }

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating Account...";

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

        // ✨ Show verify modal
        const verifyModal = new VerifyModal(
          email,
          () => {
            this.showToast("success", "Account Created!", `Welcome to FT Pong, ${firstName}!`);
            this.triggerAuthUpdate(true, result.user);
          },
          () => {
            // Optional: Handle resend logic if needed
            console.log("🔁 Resend requested.");
          }
        );

        verifyModal.showModal();
      } else {
        if (result.conflict === "username" && result.suggestions?.length) {
          this.showUsernameSuggestions(result.suggestions);
        } else {
          this.showError("signup-error", result.message || "Signup failed");
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

      // ✨ Show verify modal
      const verifyModal = new VerifyModal(
        email,
        () => {
          this.showToast("success", "Account Created!", `Welcome to FT Pong, ${firstName}!`);
          this.triggerAuthUpdate(true, userData);
        }
      );

      verifyModal.showModal();
    }
  } catch (error) {
    console.error("Signup error:", error);
    this.showError("signup-error", "An unexpected error occurred");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign Up";
  }
}


  private showUsernameSuggestions(suggestions: string[]): void
  {
    const suggestionsDiv = findElement("#username-suggestions");
    const suggestionList = findElement("#suggestion-list");

    if (!suggestionsDiv || !suggestionList) return;

    suggestionList.innerHTML = "";

    suggestions.forEach((suggestion) =>
    {
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

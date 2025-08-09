// SignupModal.ts - Signup modal component
import { BaseModal } from "./BaseModal";
import { authService } from "../../services/AuthService";
import { findElement } from "../../utils/DOMHelpers";

export class SignupModal extends BaseModal {
  private onSwitchToLogin?: () => void;

  constructor(onSwitchToLogin?: () => void) {
    super();
    this.onSwitchToLogin = onSwitchToLogin;
  }

  protected getModalTitle(): string {
    return "Sign Up";
  }

  protected getModalContent(): string {
    return `
      <form id="signup-form">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">First Name</label>
          <input type="text" id="signup-firstname" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="Enter your first name">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
          <input type="text" id="signup-lastname" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="Enter your last name">
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
                 placeholder="Enter your password (min 6 characters)">
        </div>
        <div id="signup-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
        <button type="submit" id="signup-submit"
                class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">
          Sign Up
        </button>
      </form>
      <div class="text-center">
        <p class="text-gray-400">Already have an account?
          <button id="switch-to-login" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">Login</button>
        </p>
        <div class="mt-4 pt-4 border-t border-gray-700">
          <button id="google-signup" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 flex items-center justify-center space-x-2">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign up with Google</span>
          </button>
        </div>
      </div>
    `;
  }

  protected setupEventListeners(): void {
    const switchBtn = findElement("#switch-to-login");
    const googleBtn = findElement("#google-signup");
    const form = findElement("#signup-form") as HTMLFormElement;

    if (switchBtn) {
      switchBtn.addEventListener("click", () => {
        console.log("🔄 Switch to login clicked");
        this.close();
        if (this.onSwitchToLogin) {
          this.onSwitchToLogin();
        }
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener("click", () => this.handleGoogleAuth());
    }

    if (form) {
      form.addEventListener("submit", (e) => this.handleSignup(e));
    }

    // Focus first input
    setTimeout(() => {
      const firstInput = findElement("#signup-firstname") as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  /**
   * Handle Google authentication
   */
  private handleGoogleAuth(): void {
    console.log("🌐 Google signup clicked...");

    // Show temporary message
    this.showToast(
      "info",
      "Google Authentication",
      "Google OAuth will be implemented in the next version!"
    );

    // For demo purposes, create a Google user after 2 seconds
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
        "Google Authentication",
        `Welcome ${googleUser.firstName}!`
      );

      // Trigger auth state update
      this.triggerAuthUpdate(true, googleUser);
    }, 2000);
  }

  /**
   * Handle signup form submission
   */
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
    )
      return;

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Clear previous errors and suggestions
    errorDiv?.classList.add("hidden");
    suggestionsDiv?.classList.add("hidden");

    // Basic validation
    if (password.length < 6) {
      this.showError(
        "signup-error",
        "Password must be at least 6 characters long"
      );
      return;
    }

    if (username.length < 3) {
      this.showError(
        "signup-error",
        "Username must be at least 3 characters long"
      );
      return;
    }

    // Disable form during submission
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Account...";

    try {
      // Check if authService is available, otherwise use fallback
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
          this.showToast(
            "success",
            "Welcome!",
            `Account created for ${result.user?.firstName}!`
          );
          // Trigger auth state update
          this.triggerAuthUpdate(true, result.user);
        } else {
          // Handle conflict cases (email/username already exists)
          if (result.statusCode === 409) {
            if (result.conflict === "username" && result.suggestions) {
              this.showUsernameSuggestions(result.suggestions);
            } else if (result.conflict === "email") {
              this.showError(
                "signup-error",
                "Email already exists. Please use a different email or try logging in."
              );
            } else {
              this.showError(
                "signup-error",
                result.message || "Account already exists"
              );
            }
          } else {
            this.showError("signup-error", result.message || "Signup failed");
          }
        }
      } else {
        // Fallback signup logic
        const userData = {
          id: Date.now().toString(),
          firstName,
          lastName,
          username,
          email,
        };

        localStorage.setItem(
          "ft_pong_auth_token",
          "signup-token-" + Date.now()
        );
        localStorage.setItem("ft_pong_user_data", JSON.stringify(userData));

        this.close();
        this.showToast(
          "success",
          "Welcome!",
          `Account created for ${firstName}!`
        );

        // Trigger auth state update
        this.triggerAuthUpdate(true, userData);
      }
    } catch (error) {
      console.error("Signup error:", error);
      this.showError("signup-error", "An unexpected error occurred");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
    }
  }

  /**
   * Show username suggestions when username is taken
   */
  private showUsernameSuggestions(suggestions: string[]): void {
    const suggestionsDiv = findElement("#username-suggestions");
    const suggestionList = findElement("#suggestion-list");

    if (!suggestionsDiv || !suggestionList) return;

    // Clear previous suggestions
    suggestionList.innerHTML = "";

    // Add new suggestions
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

    // Show suggestions
    suggestionsDiv.classList.remove("hidden");
  }

  /**
   * Show signup modal
   */
  showModal(): void {
    this.show("signup");
  }
}

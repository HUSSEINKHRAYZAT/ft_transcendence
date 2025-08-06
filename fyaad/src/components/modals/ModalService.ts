// Fixed imports using relative paths instead of @ alias
import { globalEventManager, AppEvent } from '../../utils/EventManager';
import { ModalType, MODAL_CONTENT } from '../../utils/Constants';
import { authService } from '../../services/AuthService';
import { findElement, createElement } from '../../utils/DOMHelpers';

/**
 * Modal service for managing all modals in FT_PONG
 * Integrates with the proper event system and services
 */
export class ModalService {
  private modalContainer: HTMLElement | null = null;
  private activeModal: string | null = null;
  private backdropElement: HTMLElement | null = null;

  constructor() {
    this.modalContainer = document.getElementById('modal-container');
    if (!this.modalContainer) {
      console.error('❌ Modal container not found in DOM');
    }
  }

  /**
   * Show login modal
   */
  showLoginModal(): void {
    console.log('🔑 Opening login modal...');
    this.closeModal(); // Close any existing modal

    if (!this.modalContainer) {
      console.error('❌ Modal container not found');
      return;
    }

    this.activeModal = 'login';
    this.createBackdrop();

    const modalContent = createElement('div', {
      className: 'bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all duration-300 scale-95 opacity-0',
      innerHTML: `
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-lime-500">Login</h2>
          <button id="modal-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
        </div>
        <form id="login-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input type="email" id="login-email" required
                   class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                   placeholder="Enter your email">
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input type="password" id="login-password" required
                   class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                   placeholder="Enter your password">
          </div>
          <div id="login-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
          <button type="submit" id="login-submit"
                  class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">
            Login
          </button>
        </form>
        <div class="text-center">
          <p class="text-gray-400">Don't have an account?
            <button id="switch-to-signup" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">Sign up</button>
          </p>
          <div class="mt-4 pt-4 border-t border-gray-700">
            <button id="google-login" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 flex items-center justify-center space-x-2 mb-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </button>
            <p class="text-xs text-gray-500 mb-2">Demo Account:</p>
            <p class="text-xs text-gray-400">Email: demo@ftpong.com</p>
            <p class="text-xs text-gray-400">Password: demo123</p>
          </div>
        </div>
      `
    });

    if (this.backdropElement) {
      this.backdropElement.appendChild(modalContent);
    }

    this.setupLoginEventListeners();
    this.animateIn();
  }

  /**
   * Show signup modal
   */
  showSignupModal(): void {
    console.log('📝 Opening signup modal...');
    this.closeModal(); // Close any existing modal

    if (!this.modalContainer) return;

    this.activeModal = 'signup';
    this.createBackdrop();

    const modalContent = createElement('div', {
      className: 'bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all duration-300 scale-95 opacity-0',
      innerHTML: `
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-lime-500">Sign Up</h2>
          <button id="modal-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
        </div>
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
      `
    });

    if (this.backdropElement) {
      this.backdropElement.appendChild(modalContent);
    }

    this.setupSignupEventListeners();
    this.animateIn();
  }

  /**
   * Show info modal (About Us, Project, etc.) - Updated with carousel
   */
  showInfoModal(type: 'about' | 'project' | 'home'): void {
    console.log('ℹ️ Opening info modal:', type);

    if (!this.modalContainer) return;

    const content = this.getInfoModalContent(type);
    this.activeModal = `info-${type}`;
    this.createBackdrop();

    const modalContent = createElement('div', {
      className: 'bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0',
      innerHTML: `
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-lime-500">${content.title}</h2>
          <button id="modal-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
        </div>
        <div class="mb-6 text-gray-300">${content.body}</div>
        <button id="info-modal-close" class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
          Close
        </button>
      `
    });

    if (this.backdropElement) {
      this.backdropElement.appendChild(modalContent);
    }

    this.setupInfoEventListeners(type);
    this.animateIn();
  }

  /**
   * Close current modal
   */
  closeModal(): void {
    if (!this.activeModal || !this.modalContainer) return;

    console.log('❌ Closing modal:', this.activeModal);

    // Animate out
    this.animateOut(() => {
      if (this.backdropElement && this.modalContainer) {
        this.modalContainer.removeChild(this.backdropElement);
        this.backdropElement = null;
      }
      this.activeModal = null;
    });

    // Emit close event if globalEventManager is available
    if (typeof globalEventManager !== 'undefined') {
      globalEventManager.emit(AppEvent.MODAL_CLOSE);
    }
  }

  /**
   * Create backdrop container
   */
  private createBackdrop(): void {
    if (!this.modalContainer) return;

    this.backdropElement = createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm bg-black/75 opacity-0 transition-opacity duration-300'
    });

    // Close on backdrop click
    this.backdropElement.addEventListener('click', (e) => {
      if (e.target === this.backdropElement) {
        this.closeModal();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', this.handleEscapeKey);

    this.modalContainer.appendChild(this.backdropElement);
  }

  /**
   * Handle escape key press
   */
  private handleEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.activeModal) {
      this.closeModal();
    }
  };

  /**
   * Animate modal in
   */
  private animateIn(): void {
    if (!this.backdropElement) return;

    setTimeout(() => {
      if (this.backdropElement) {
        this.backdropElement.classList.remove('opacity-0');
        this.backdropElement.classList.add('opacity-100');

        const modalContent = this.backdropElement.querySelector('.transform');
        if (modalContent) {
          modalContent.classList.remove('scale-95', 'opacity-0');
          modalContent.classList.add('scale-100', 'opacity-100');
        }
      }
    }, 10);
  }

  /**
   * Animate modal out
   */
  private animateOut(callback: () => void): void {
    if (!this.backdropElement) {
      callback();
      return;
    }

    this.backdropElement.classList.remove('opacity-100');
    this.backdropElement.classList.add('opacity-0');

    const modalContent = this.backdropElement.querySelector('.transform');
    if (modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }

    setTimeout(() => {
      document.removeEventListener('keydown', this.handleEscapeKey);
      callback();
    }, 300);
  }

  /**
   * Setup login event listeners
   */
  private setupLoginEventListeners(): void {
    const closeBtn = findElement('#modal-close');
    const switchBtn = findElement('#switch-to-signup');
    const googleBtn = findElement('#google-login');
    const form = findElement('#login-form') as HTMLFormElement;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        console.log('🔄 Switch to signup clicked');
        // Don't close modal, just replace content immediately
        this.replaceModalContent('signup');
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.handleGoogleAuth('login'));
    }

    if (form) {
      form.addEventListener('submit', (e) => this.handleLogin(e));
    }
  }

  /**
   * Setup signup event listeners
   */
  private setupSignupEventListeners(): void {
    const closeBtn = findElement('#modal-close');
    const switchBtn = findElement('#switch-to-login');
    const googleBtn = findElement('#google-signup');
    const form = findElement('#signup-form') as HTMLFormElement;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        console.log('🔄 Switch to login clicked');
        // Don't close modal, just replace content immediately
        this.replaceModalContent('login');
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.handleGoogleAuth('signup'));
    }

    if (form) {
      form.addEventListener('submit', (e) => this.handleSignup(e));
    }
  }

  /**
   * Setup info modal event listeners - Updated for carousel
   */
  private setupInfoEventListeners(type: string): void {
    const closeBtn = findElement('#modal-close');
    const infoCloseBtn = findElement('#info-modal-close');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (infoCloseBtn) {
      infoCloseBtn.addEventListener('click', () => this.closeModal());
    }

    // Setup carousel for project modal
    if (type === 'project') {
      this.setupModuleCarousel();
    }
  }

  /**
   * Setup module carousel navigation
   */
  private setupModuleCarousel(): void {
    const modules = [
      'web', 'user', 'gameplay', 'ai', 'security',
      'devops', 'graphics', 'accessibility', 'serverside'
    ];

    let currentIndex = 0;

    const prevBtn = findElement('#prev-module');
    const nextBtn = findElement('#next-module');
    const moduleContent = findElement('#module-content');
    const moduleCounter = findElement('#module-counter');
    const dotsContainer = findElement('#dots-container');

    // Create dots
    if (dotsContainer) {
      modules.forEach((_, index) => {
        const dot = createElement('div', {
          className: `w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ${index === 0 ? 'bg-lime-500' : 'bg-gray-500 hover:bg-gray-400'}`,
          'data-index': index.toString()
        });

        dot.addEventListener('click', () => {
          currentIndex = index;
          updateCarousel();
        });

        dotsContainer.appendChild(dot);
      });
    }

    // Update carousel content
    const updateCarousel = () => {
      if (!moduleContent || !moduleCounter) return;

      const moduleData = this.getModuleData(modules[currentIndex]);
      if (!moduleData) return;

      // Update content with fade effect
      moduleContent.style.opacity = '0';

      setTimeout(() => {
        moduleContent.innerHTML = `
          <div class="text-center mb-4">
            <h3 class="text-xl font-bold text-lime-500">${moduleData.title}</h3>
          </div>
          ${moduleData.content}
        `;
        moduleContent.style.opacity = '1';
      }, 150);

      // Update counter
      moduleCounter.textContent = `${currentIndex + 1} / ${modules.length}`;

      // Update navigation buttons
      if (prevBtn) {
        (prevBtn as HTMLButtonElement).disabled = currentIndex === 0;
      }
      if (nextBtn) {
        (nextBtn as HTMLButtonElement).disabled = currentIndex === modules.length - 1;
      }

      // Update dots
      const dots = dotsContainer?.querySelectorAll('div');
      dots?.forEach((dot, index) => {
        if (index === currentIndex) {
          dot.className = 'w-3 h-3 rounded-full cursor-pointer transition-all duration-300 bg-lime-500';
        } else {
          dot.className = 'w-3 h-3 rounded-full cursor-pointer transition-all duration-300 bg-gray-500 hover:bg-gray-400';
        }
      });
    };

    // Navigation event listeners
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          updateCarousel();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < modules.length - 1) {
          currentIndex++;
          updateCarousel();
        }
      });
    }

    // Keyboard navigation
    const keyboardHandler = (e: KeyboardEvent) => {
      if (this.activeModal === 'info-project') {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          currentIndex--;
          updateCarousel();
        } else if (e.key === 'ArrowRight' && currentIndex < modules.length - 1) {
          currentIndex++;
          updateCarousel();
        }
      }
    };

    document.addEventListener('keydown', keyboardHandler);

    // Initialize carousel
    setTimeout(() => {
      updateCarousel();
    }, 100);
  }

  /**
   * Replace modal content without closing/reopening
   */
  private replaceModalContent(type: 'login' | 'signup'): void {
    if (!this.backdropElement) return;

    const existingContent = this.backdropElement.querySelector('.bg-gray-800');
    if (existingContent) {
      existingContent.remove();
    }

    this.activeModal = type;

    if (type === 'login') {
      const modalContent = createElement('div', {
        className: 'bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform scale-100 opacity-100',
        innerHTML: `
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-lime-500">Login</h2>
            <button id="modal-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
          </div>
          <form id="login-form">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input type="email" id="login-email" required
                     class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     placeholder="Enter your email">
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input type="password" id="login-password" required
                     class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     placeholder="Enter your password">
            </div>
            <div id="login-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
            <button type="submit" id="login-submit"
                    class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">
              Login
            </button>
          </form>
          <div class="text-center">
            <p class="text-gray-400">Don't have an account?
              <button id="switch-to-signup" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">Sign up</button>
            </p>
            <div class="mt-4 pt-4 border-t border-gray-700">
              <button id="google-login" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 flex items-center justify-center space-x-2 mb-2">
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
              <p class="text-xs text-gray-500 mb-2">Demo Account:</p>
              <p class="text-xs text-gray-400">Email: demo@ftpong.com</p>
              <p class="text-xs text-gray-400">Password: demo123</p>
            </div>
          </div>
        `
      });
      this.backdropElement.appendChild(modalContent);
      this.setupLoginEventListeners();
    }
    else
    {
      const modalContent = createElement('div', {
        className: 'bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform scale-100 opacity-100',
        innerHTML: `
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-lime-500">Sign Up</h2>
            <button id="modal-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
          </div>
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
        `
      });
      this.backdropElement.appendChild(modalContent);
      this.setupSignupEventListeners();
    }
  }

  /**
   * Handle Google authentication
   */
  private handleGoogleAuth(type: 'login' | 'signup'): void {
    console.log(`🌐 Google ${type} clicked...`);

    // Show temporary message
    this.showToast('info', 'Google Authentication', 'Google OAuth will be implemented in the next version!');

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

      this.closeModal();
      this.showToast('success', 'Google Authentication', `Welcome ${googleUser.firstName}!`);

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
    submitBtn.textContent = 'Logging in...';

    try {
      // Check if authService is available, otherwise use fallback
      if (typeof authService !== 'undefined') {
        const result = await authService.login({ email, password });

        if (result.success) {
          this.closeModal();
          this.showToast('success', 'Welcome back!', `Hello ${result.user?.firstName}!`);
          // Trigger auth state update
          this.triggerAuthUpdate(true, result.user);
        } else {
          this.showError('login-error', result.message || 'Login failed');
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

          this.closeModal();
          this.showToast('success', 'Welcome back!', 'Hello Demo!');

          // Trigger auth state update
          this.triggerAuthUpdate(true, userData);
        } else {
          this.showError('login-error', 'Invalid credentials. Try: demo@ftpong.com / demo123');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('login-error', 'An unexpected error occurred');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  }

  /**
   * Handle signup form submission
   */
  private async handleSignup(event: Event): Promise<void> {
    event.preventDefault();

    const firstNameInput = findElement('#signup-firstname') as HTMLInputElement;
    const lastNameInput = findElement('#signup-lastname') as HTMLInputElement;
    const emailInput = findElement('#signup-email') as HTMLInputElement;
    const passwordInput = findElement('#signup-password') as HTMLInputElement;
    const submitBtn = findElement('#signup-submit') as HTMLButtonElement;
    const errorDiv = findElement('#signup-error') as HTMLElement;

    if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput || !submitBtn) return;

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Clear previous errors
    errorDiv?.classList.add('hidden');

    // Basic validation
    if (password.length < 6) {
      this.showError('signup-error', 'Password must be at least 6 characters long');
      return;
    }

    // Disable form during submission
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    try {
      // Check if authService is available, otherwise use fallback
      if (typeof authService !== 'undefined') {
        const result = await authService.signup({
          firstName,
          lastName,
          email,
          password
        });

        if (result.success) {
          this.closeModal();
          this.showToast('success', 'Welcome!', `Account created for ${result.user?.firstName}!`);
          // Trigger auth state update
          this.triggerAuthUpdate(true, result.user);
        } else {
          this.showError('signup-error', result.message || 'Signup failed');
        }
      } else {
        // Fallback signup logic
        const userData = {
          id: Date.now().toString(),
          firstName,
          lastName,
          email
        };

        localStorage.setItem('ft_pong_auth_token', 'signup-token-' + Date.now());
        localStorage.setItem('ft_pong_user_data', JSON.stringify(userData));

        this.closeModal();
        this.showToast('success', 'Welcome!', `Account created for ${firstName}!`);

        // Trigger auth state update
        this.triggerAuthUpdate(true, userData);
      }
    } catch (error) {
      console.error('Signup error:', error);
      this.showError('signup-error', 'An unexpected error occurred');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }
  }

  /**
   * Trigger authentication state update
   */
  private triggerAuthUpdate(isAuthenticated: boolean, user?: any): void {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated, user }
    }));

    // Also trigger a page refresh for the main.ts addBasicNavbar function
    setTimeout(() => {
      if (typeof (window as any).addBasicNavbar === 'function') {
        (window as any).addBasicNavbar();
      }
    }, 100);
  }

  /**
   * Show error in modal
   */
  private showError(errorId: string, message: string): void {
    const errorDiv = findElement(`#${errorId}`);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Show toast notification
   */
  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    // Create toast container if it doesn't exist
    let toastContainer = findElement('#toast-container');
    if (!toastContainer) {
      toastContainer = createElement('div', {
        id: 'toast-container',
        className: 'fixed top-20 right-4 z-50 space-y-2'
      });
      document.body.appendChild(toastContainer);
    }

    const toastId = `toast-${Date.now()}`;
    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const colorMap = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-yellow-600',
      info: 'bg-blue-600'
    };

    const toast = createElement('div', {
      id: toastId,
      className: `${colorMap[type]} text-white p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`,
      innerHTML: `
        <div class="flex items-start">
          <div class="text-xl mr-3">${iconMap[type]}</div>
          <div class="flex-1">
            <div class="font-bold">${title}</div>
            <div class="text-sm opacity-90">${message}</div>
          </div>
          <button class="ml-3 text-white hover:text-gray-200 transition-colors duration-300" onclick="this.parentElement.parentElement.remove()">
            ✕
          </button>
        </div>
      `
    });

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    }, 100);

    // Auto remove after 3 seconds (shorter than before)
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
          if (toast.parentElement) {
            toast.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * Get info modal content - Updated for carousel
   */
  private getInfoModalContent(type: string): { title: string; body: string } {
    const content = {
      home: {
        title: 'Welcome to FT_PONG',
        body: 'Welcome to FT_PONG! Get ready for some retro gaming fun!'
      },
      about: {
        title: 'About Us',
        body: `
          <div class="text-left">
            <p class="mb-4">We are a team of five passionate 42-Beirut developers collaborating on the FT_TRANSCENDENCE project.</p>
            <h4 class="text-lg font-bold text-lime-500 mb-3">Our Team:</h4>
            <ul class="list-none space-y-2 text-lime-400">
              <li class="flex items-center space-x-2">
                <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
                <a href="https://github.com/Ali-Fayad" target="_blank" class="hover:underline">Ali Fayad [ Frontend ]</a>
              </li>
              <li class="flex items-center space-x-2">
                <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
                <a href="https://github.com/Fouad-Dahouk" target="_blank" class="hover:underline">Fouad Dahouk [ Socket ]</a>
              </li>
              <li class="flex items-center space-x-2">
                <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
                <a href="https://github.com/HUSSEINKHRAYZAT" target="_blank" class="hover:underline">Hussein Khrayzat [ Game ]</a>
              </li>
              <li class="flex items-center space-x-2">
                <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
                <a href="https://github.com/Husseinchr" target="_blank" class="hover:underline">Hussein Chrief [ DevOps ]</a>
              </li>
              <li class="flex items-center space-x-2">
                <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
                <a href="https://github.com/younes285" target="_blank" class="hover:underline">Mostafa Younes [ Backend ]</a>
              </li>
            </ul>
          </div>
        `
      },
      project: {
        title: 'Project Information',
        body: `
          <div class="text-left">
            <p class="text-gray-300 mb-6">FT_TRANSCENDENCE is a Milestone 6 project at 42 Beirut, designed as a full-stack web application centered around a modern remake of the classic Pong game.</p>

            <!-- Carousel Container -->
            <div id="module-carousel" class="relative">
              <!-- Navigation -->
              <div class="flex justify-between items-center mb-4">
                <button id="prev-module" class="bg-lime-600 hover:bg-lime-700 text-white p-2 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>

                <div class="text-center">
                  <span id="module-counter" class="text-lime-400 font-bold">1 / 9</span>
                </div>

                <button id="next-module" class="bg-lime-600 hover:bg-lime-700 text-white p-2 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </div>

              <!-- Module Content -->
              <div id="module-content" class="bg-gray-700 rounded-lg p-6 min-h-[300px] transition-all duration-300">
                <!-- Content will be dynamically loaded here -->
              </div>

              <!-- Dots Indicator -->
              <div class="flex justify-center mt-4 space-x-2" id="dots-container">
                <!-- Dots will be dynamically created -->
              </div>
            </div>
          </div>
        `
      }
    };

    return content[type as keyof typeof content] || content.home;
  }

  /**
   * Get module data for detailed view
   */
  private getModuleData(module: string): { title: string; content: string } | null {
    const modules: Record<string, { title: string; content: string }> = {
      web: {
        title: '🌐 Web Module [ 2 / 3 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Use a framework to build the backend.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">✅ Minor:</span> Use a framework or a toolkit to build the frontend.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">✅ Minor:</span> Use a database for the backend.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> Store the score of a tournament in the Blockchain.
            </div>
          </div>
        `
      },
      user: {
        title: '👤 User Management [ 2 / 2 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Standard user management, authentication, users across tournaments.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Implementing a remote authentication.
            </div>
          </div>
        `
      },
      gameplay: {
        title: '🎮 Gameplay [ 3.5 / 4.5 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Remote players can play Pong together.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Multiple players can play Pong at the same time.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">✅ Minor:</span> Add another game with the same user management.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">🔄 Minor:</span> Game customization options (half done).
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ Minor:</span> Live chat during the game.
            </div>
          </div>
        `
      },
      ai: {
        title: '🧠 AI-Algorithm [ 1 / 1.5 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Introduce an AI opponent.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ Minor:</span> User and AI statistics dashboard.
            </div>
          </div>
        `
      },
      security: {
        title: '🔒 Cybersecurity [ 1 / 2.5 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Implement WAF/ModSecurity with Hardened Configuration.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> GDPR Compliance Options with User Anonymization.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ Minor:</span> Implement Two-Factor Authentication (2FA).
            </div>
          </div>
        `
      },
      devops: {
        title: '⚙️ DevOps [ 1 / 2.5 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Infrastructure Setup for Log Management.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> Designing the Backend as Microservices.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ Minor:</span> Set up ELK (Elasticsearch, Logstash, Kibana) for log management.
            </div>
          </div>
        `
      },
      graphics: {
        title: '🎨 Graphics [ 1 / 1 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Use of advanced 3D techniques.
            </div>
          </div>
        `
      },
      accessibility: {
        title: '♿ Accessibility [ 1 / 2.5 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Support on all devices.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> Expanding Browser Compatibility.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ Minor:</span> Multiple language supports.
            </div>
          </div>
        `
      },
      serverside: {
        title: '🏓 Server-Side Pong [ 0 / 2 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> Replace basic Pong with server-side Pong and implement an API.
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> Enabling Pong gameplay via CLI against web users with API integration.
            </div>
          </div>
        `
      }
    };

    return modules[module] || null;
  }

  /**
   * Check if modal is currently open
   */
  isModalOpen(): boolean {
    return this.activeModal !== null;
  }

  /**
   * Get current active modal type
   */
  getActiveModal(): string | null {
    return this.activeModal;
  }

  /**
   * Emit modal open event (if globalEventManager is available)
   */
  /**
   * Cleanup and destroy modal service
   */
  destroy(): void {
    this.closeModal();
    document.removeEventListener('keydown', this.handleEscapeKey);
    console.log('🧹 ModalService destroyed');
  }
}

// Main entry point for FT_PONG application
import { waitForDOM } from './utils/DOMHelpers';
import './styles/main.css';

// The service initializes automatically when imported
// Add theme toggle to navbar or settings

// Component interfaces
interface Component {
  render(): Promise<void>;
  updateAuthState?(isAuthenticated: boolean, user: any): void;
}

// Global variables
let componentInstances: Component[] = [];
let isComponentsLoaded = false;

/**
 * Initialize application when script loads
 */
console.log('🚀 main.ts script loaded and executing...');
console.log('📅 Current time:', new Date().toISOString());
console.log('🌐 Document ready state:', document.readyState);

// Start initialization
initializeApplication();

/**
 * Main initialization function
 */
async function initializeApplication(): Promise<void> {
  console.log('🚀 Starting FT_PONG application initialization...');

  try {
    // Wait for DOM to be ready
    await waitForDOM();
    console.log('✅ DOM is ready!');

    // Hide loading screen
    hideLoadingScreen();

    // Try to load components with better error handling
    await loadComponents();

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    showInitializationError(error);
  }
}

/**
 * Load and initialize components
 */
async function loadComponents(): Promise<void> {
  console.log('📦 Attempting to load components...');

  try {
    // Dynamic imports with individual error handling
    const componentPromises = [
      loadComponent('./components/navbar/Navbar', 'Navbar'),
      loadComponent('./components/home/NotificationBox', 'NotificationBox'),
      loadComponent('./components/home/FriendsBox', 'FriendsBox'),
      loadComponent('./components/home/SettingsBox', 'SettingsBox'),
      loadComponent('./components/modals/ModalService', 'ModalService')
    ];

    const results = await Promise.allSettled(componentPromises);
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`📊 Component loading results: ${successful} successful, ${failed} failed`);

    if (successful >= 1) {
      // At least some components loaded successfully
      console.log('✅ Some components loaded, initializing with available components...');
      await initializeWithComponents(results);
      isComponentsLoaded = true;
    } else {
      // All components failed to load
      throw new Error('All components failed to load');
    }

  } catch (error) {
    console.error('❌ Component loading failed:', error);
    console.log('🔄 Falling back to basic content...');
    await initializeBasicContent();
  }
}

/**
 * Load a single component with error handling
 */
async function loadComponent(path: string, componentName: string): Promise<any> {
  try {
    console.log(`📦 Loading ${componentName} from ${path}...`);
    const module = await import(path);

    if (module[componentName]) {
      console.log(`✅ ${componentName} loaded successfully`);
      return { name: componentName, constructor: module[componentName], module };
    } else {
      throw new Error(`${componentName} not found in module`);
    }
  } catch (error) {
    console.error(`❌ Failed to load ${componentName}:`, error);
    throw error;
  }
}

/**
 * Initialize with successfully loaded TypeScript components
 */
async function initializeWithComponents(results: PromiseSettledResult<any>[]): Promise<void> {
  console.log('🧩 Initializing with loaded components...');

  // Extract successful components
  const components = results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map(result => result.value);

  try {
    // Initialize modal service first (if available)
    const modalServiceComponent = components.find(c => c.name === 'ModalService');
    if (modalServiceComponent) {
      const modalService = new modalServiceComponent.constructor();
      (window as any).modalService = modalService;
      console.log('🔑 Modal service initialized');
    } else {
      // Create basic modal service as fallback
      createBasicModalService();
    }

    // Add basic jumbotron content
    addBasicJumbotron();

    // Initialize other components
    const componentPromises: Promise<void>[] = [];
    const instancesCreated: Component[] = [];

    for (const component of components) {
      if (component.name !== 'ModalService') {
        try {
          console.log(`🧩 Initializing ${component.name}...`);
          const instance = new component.constructor() as Component;
          instancesCreated.push(instance);
          componentPromises.push(instance.render());
        } catch (error) {
          console.error(`❌ Failed to initialize ${component.name}:`, error);
        }
      }
    }

    // Wait for all component renders
    const renderResults = await Promise.allSettled(componentPromises);
    const successfulRenders = renderResults.filter(result => result.status === 'fulfilled').length;

    console.log(`✅ ${successfulRenders}/${componentPromises.length} components rendered successfully!`);

    // Store successful instances
    componentInstances = instancesCreated;

    // Setup authentication state listening
    setupAuthListeners(instancesCreated);

    // Check initial auth state
    updateAuthState(instancesCreated);

    // Add fallback content for any missing components
    addFallbackContent();

    console.log('🎮 FT_PONG Application initialized successfully with TypeScript components!');

  } catch (error) {
    console.error('❌ Failed to initialize with components:', error);
    throw error;
  }
}

/**
 * Fallback to basic content if TypeScript components fail
 */
async function initializeBasicContent(): Promise<void> {
  console.log('🔄 Initializing with basic content fallback...');

  try {
    // Create basic modal service
    createBasicModalService();

    // Add basic content
    addBasicNavbar();
    addBasicJumbotron();
    addBasicContentBoxes();

    console.log('✅ Basic content initialized successfully!');

  } catch (error) {
    console.error('❌ Failed to initialize basic content:', error);
    showInitializationError(error);
  }
}

/**
 * Hide loading screen
 */
function hideLoadingScreen(): void {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    console.log('✅ Loading screen found, hiding it...');
    loadingScreen.style.display = 'none';
    console.log('✅ Loading screen hidden successfully');
  }
}

/**
 * Create basic modal service as fallback
 */
function createBasicModalService(): void {
  (window as any).modalService = {
    showLoginModal: () => {
      console.log('🔑 Basic login modal');
      showBasicAuthModal('login');
    },
    showSignupModal: () => {
      console.log('📝 Basic signup modal');
      showBasicAuthModal('signup');
    },
    showProfileModal: () => {
      console.log('👤 Basic profile modal');
      showBasicProfileModal();
    },
    showInfoModal: (type: string) => {
      console.log(`ℹ️ Basic ${type} info modal`);
      showBasicInfoModal(type);
    },
    closeModal: () => {
      console.log('❌ Close basic modal');
      closeBasicModal();
    },
    isModalOpen: () => document.getElementById('basic-modal') !== null
  };
  console.log('🔑 Basic modal service created');
}

/**
 * Show basic authentication modal
 */
function showBasicAuthModal(type: 'login' | 'signup'): void {
  // Remove existing modal
  closeBasicModal();

  const isLogin = type === 'login';
  const title = isLogin ? 'Login' : 'Sign Up';

  const modal = document.createElement('div');
  modal.id = 'basic-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm bg-black/75';

  modal.innerHTML = `
    <div class="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all duration-300">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-lime-500">${title}</h2>
        <button onclick="closeBasicModal()" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
      </div>
      <form id="basic-auth-form">
        ${isLogin ? '' : `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-300 mb-2">First Name</label>
            <input type="text" id="firstName" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 transition-colors duration-300" placeholder="Enter your first name">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
            <input type="text" id="lastName" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 transition-colors duration-300" placeholder="Enter your last name">
          </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input type="text" id="username" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 transition-colors duration-300" placeholder="Enter your username">
          </div>
        `}
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input type="email" id="email" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 transition-colors duration-300" placeholder="Enter your email">
        </div>
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <input type="password" id="password" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 transition-colors duration-300" placeholder="Enter your password">
        </div>
        <div id="auth-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
        <button type="submit" class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">
          ${title}
        </button>
      </form>
      <div class="text-center">
        <p class="text-gray-400">${isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onclick="switchBasicAuthModal('${isLogin ? 'signup' : 'login'}')" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">${isLogin ? 'Sign up' : 'Login'}</button>
        </p>
        ${isLogin ? `
          <div class="mt-4 pt-4 border-t border-gray-700">
            <p class="text-xs text-gray-500 mb-2">Demo Account:</p>
            <p class="text-xs text-gray-400">Email: demo@ftpong.com</p>
            <p class="text-xs text-gray-400">Password: demo123</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeBasicModal();
    }
  });

  document.body.appendChild(modal);

  // Setup form submission
  const form = modal.querySelector('#basic-auth-form') as HTMLFormElement;
  if (form) {
    form.addEventListener('submit', (e) => handleBasicAuth(e, type));
  }

  // Focus first input
  const firstInput = modal.querySelector('input') as HTMLInputElement;
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Handle basic authentication
 */
function handleBasicAuth(event: Event, type: 'login' | 'signup'): void {
  event.preventDefault();

  const modal = document.getElementById('basic-modal');
  if (!modal) return;

  const emailInput = modal.querySelector('#email') as HTMLInputElement;
  const passwordInput = modal.querySelector('#password') as HTMLInputElement;
  const errorDiv = modal.querySelector('#auth-error') as HTMLElement;

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  errorDiv?.classList.add('hidden');

  if (!email || !password) {
    showBasicError('Please fill in all fields');
    return;
  }

  if (type === 'login') {
    // Demo login
    if (email === 'demo@ftpong.com' && password === 'demo123') {
      const userData = {
        id: '1',
        firstName: 'Demo',
        lastName: 'User',
        email,
        username: 'demo.user',
        gamesPlayed: 15,
        wins: 12,
        losses: 3
      };

      localStorage.setItem('ft_pong_auth_token', 'demo-token-' + Date.now());
      localStorage.setItem('ft_pong_user_data', JSON.stringify(userData));

      closeBasicModal();
      showBasicToast('success', 'Welcome back, Demo!');
      triggerAuthUpdate(true, userData);
    } else {
      showBasicError('Invalid credentials. Try: demo@ftpong.com / demo123');
    }
  } else {
    // Signup
    const firstNameInput = modal.querySelector('#firstName') as HTMLInputElement;
    const lastNameInput = modal.querySelector('#lastName') as HTMLInputElement;
    const usernameInput = modal.querySelector('#username') as HTMLInputElement;

    if (!firstNameInput || !lastNameInput || !usernameInput) return;

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const username = usernameInput.value.trim();

    if (!firstName || !lastName || !username) {
      showBasicError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      showBasicError('Password must be at least 6 characters long');
      return;
    }

    const userData = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      username,
      gamesPlayed: 0,
      wins: 0,
      losses: 0
    };

    localStorage.setItem('ft_pong_auth_token', 'signup-token-' + Date.now());
    localStorage.setItem('ft_pong_user_data', JSON.stringify(userData));

    closeBasicModal();
    showBasicToast('success', `Welcome ${firstName}!`);
    triggerAuthUpdate(true, userData);
  }
}


/**
 * Show basic error
 */
function showBasicError(message: string): void {
  const errorDiv = document.querySelector('#auth-error') as HTMLElement;
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }
}

/**
 * Switch between login and signup
 */
function switchBasicAuthModal(type: 'login' | 'signup'): void {
  showBasicAuthModal(type);
}

/**
 * Show basic profile modal
 */
function showBasicProfileModal(): void {
  closeBasicModal();

  const userData = localStorage.getItem('ft_pong_user_data');
  let user = null;

  try {
    user = userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  if (!user) {
    showBasicToast('error', 'No profile data found');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'basic-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm bg-black/75';

  modal.innerHTML = `
    <div class="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all duration-300">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-lime-500">Profile</h2>
        <button onclick="closeBasicModal()" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
      </div>

      <div class="text-center mb-6">
        <div class="w-20 h-20 rounded-full bg-lime-500 flex items-center justify-center text-2xl font-bold text-gray-900 mx-auto mb-3">
          ${(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
        </div>
        <h3 class="text-xl font-bold text-white">${user.firstName || ''} ${user.lastName || ''}</h3>
        <p class="text-gray-400">${user.email || 'No email'}</p>
      </div>

      <div class="space-y-3 mb-6">
        <div class="bg-gray-700 p-3 rounded">
          <span class="text-gray-400">Username:</span>
          <span class="text-white ml-2">${user.username || 'Not set'}</span>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <span class="text-gray-400">Games Played:</span>
          <span class="text-white ml-2">${user.gamesPlayed !== undefined ? user.gamesPlayed : '0'}</span>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <span class="text-gray-400">Wins:</span>
          <span class="text-lime-500 ml-2 font-bold">${user.wins !== undefined ? user.wins : '0'}</span>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <span class="text-gray-400">Losses:</span>
          <span class="text-red-400 ml-2 font-bold">${user.losses !== undefined ? user.losses : '0'}</span>
        </div>
      </div>

      <button onclick="closeBasicModal()" class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        Close
      </button>
    </div>
  `;

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeBasicModal();
    }
  });

  document.body.appendChild(modal);
}

/**
 * Show basic info modal
 */
function showBasicInfoModal(type: string): void {
  closeBasicModal();

  const titles = {
    about: 'About Us',
    project: 'Project Information',
    home: 'Welcome to FT_PONG'
  };

  const content = {
    about: `
      <p class="mb-4">We are a team of five passionate 42-Beirut developers collaborating on the FT_TRANSCENDENCE project.</p>
      <h4 class="text-lg font-bold text-lime-500 mb-3">Our Team:</h4>
      <ul class="list-none space-y-2 text-lime-400">
        <li>• Ali Fayad [ Frontend ]</li>
        <li>• Fouad Dahouk [ Socket ]</li>
        <li>• Hussein Khrayzat [ Game ]</li>
        <li>• Hussein Chrief [ DevOps ]</li>
        <li>• Mostafa Younes [ Backend ]</li>
      </ul>
    `,
    project: `
      <p class="mb-4">FT_TRANSCENDENCE is a Milestone 6 project at 42 Beirut, designed as a full-stack web application centered around a modern remake of the classic Pong game.</p>
      <p class="text-gray-400 text-sm">Note: Full project carousel available with TypeScript components.</p>
    `,
    home: 'Welcome to FT_PONG! Get ready for some retro gaming fun!'
  };

  const modal = document.createElement('div');
  modal.id = 'basic-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm bg-black/75';

  modal.innerHTML = `
    <div class="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 p-6 transform transition-all duration-300 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-lime-500">${titles[type as keyof typeof titles] || titles.home}</h2>
        <button onclick="closeBasicModal()" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
      </div>

      <div class="text-gray-300 mb-6">
        ${content[type as keyof typeof content] || content.home}
      </div>

      <button onclick="closeBasicModal()" class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        Close
      </button>
    </div>
  `;

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeBasicModal();
    }
  });

  document.body.appendChild(modal);
}

/**
 * Close basic modal
 */
function closeBasicModal(): void {
  const modal = document.getElementById('basic-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Show basic toast notification
 */
function showBasicToast(type: 'success' | 'error' | 'info', message: string): void {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `fixed top-20 right-4 z-50 ${colors[type]} text-white p-4 rounded-lg shadow-lg transform transition-all duration-300`;

  toast.innerHTML = `
    <div class="flex items-center">
      <span class="text-xl mr-3">${icons[type]}</span>
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">✕</button>
    </div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 3000);
}

// Make functions globally available
(window as any).closeBasicModal = closeBasicModal;
(window as any).switchBasicAuthModal = switchBasicAuthModal;

/**
 * Add basic navbar with profile functionality
 */
function addBasicNavbar(): void {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    // Check auth state to determine what to show
    const authToken = localStorage.getItem('ft_pong_auth_token');
    const userData = localStorage.getItem('ft_pong_user_data');
    const isAuthenticated = !!(authToken && userData);

    let user = null;
    if (userData) {
      try {
        user = JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    const authSection = isAuthenticated && user ?
      `<div class="flex items-center space-x-4">
         <button onclick="handleProfile()" class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-lime-500 bg-gray-700 hover:bg-gray-600 transition-colors duration-300">
           ${user.avatar ? `<img src="${user.avatar}" alt="Profile" class="w-6 h-6 rounded-full">` : '<div class="w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-xs font-bold text-gray-900">' + (user.firstName ? user.firstName.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'U')) + '</div>'}
           <span>${user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.username || user.email || 'User')}</span>
         </button>
         <button onclick="handleLogout()" class="px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-600 hover:text-white transition-colors duration-300">
           Logout
         </button>
       </div>` :
      `<button onclick="handleLogin()" class="bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">Login</button>`;

    navbar.innerHTML = `
      <div class="bg-gray-800 border-b border-gray-700">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center">
              <img src="https://img.icons8.com/color/48/ping-pong.png" alt="Pong Icon" class="w-6 h-6 mr-2">
              <span class="text-2xl font-bold text-lime-500">FT_PONG</span>
            </div>
            <div class="flex space-x-4">
              <button class="px-3 py-2 rounded-md text-sm font-medium text-lime-500 bg-gray-700">HOME</button>
              <button onclick="handleAbout()" class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300">ABOUT US</button>
              <button onclick="handleProject()" class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300">PROJECT</button>
            </div>
            <div>
              ${authSection}
            </div>
          </div>
        </div>
      </div>
    `;
    console.log('✅ Basic navbar added with profile functionality');
  }
}

// Global functions for navbar functionality
(window as any).handleProfile = function() {
  console.log('👤 Profile clicked...');
  if ((window as any).modalService) {
    (window as any).modalService.showProfileModal();
  } else {
    showBasicProfileModal();
  }
};

(window as any).handleLogin = function() {
  console.log('🔑 Login clicked...');
  if ((window as any).modalService) {
    (window as any).modalService.showLoginModal();
  } else {
    showBasicAuthModal('login');
  }
};

(window as any).handleAbout = function() {
  console.log('ℹ️ About clicked...');
  if ((window as any).modalService) {
    (window as any).modalService.showInfoModal('about');
  } else {
    showBasicInfoModal('about');
  }
};

(window as any).handleProject = function() {
  console.log('ℹ️ Project clicked...');
  if ((window as any).modalService) {
    (window as any).modalService.showInfoModal('project');
  } else {
    showBasicInfoModal('project');
  }
};

(window as any).handleLogout = function() {
  console.log('👋 Logout clicked...');

  // Show confirmation dialog
  const confirmed = confirm('Are you sure you want to logout?');

  if (confirmed) {
    // Clear authentication data
    localStorage.removeItem('ft_pong_auth_token');
    localStorage.removeItem('ft_pong_user_data');

    // Refresh navbar to show login button
    addBasicNavbar();

    // Dispatch auth state change event
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated: false, user: null }
    }));

    console.log('✅ User logged out successfully');
    if (isComponentsLoaded) {
      // Update components if loaded
      updateAuthState(componentInstances);
    } else {
      showBasicToast('success', 'You have been logged out successfully!');
    }
  }
};

/**
 * Add Pong-themed jumbotron with animated ball
 */
function addBasicJumbotron(): void {
  const jumbotron = document.getElementById('jumbotron');
  if (jumbotron) {
    jumbotron.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
        <!-- Pong Board Background -->
        <div class="pong-board absolute inset-4 border-4 border-lime-500 rounded-lg">
          <!-- Center Line -->
          <div class="center-line"></div>

          <!-- Animated Ball -->
          <div class="pong-ball"></div>

          <!-- Left Paddle -->
          <div class="paddle paddle-left"></div>

          <!-- Right Paddle -->
          <div class="paddle paddle-right"></div>
        </div>

        <!-- Content -->
        <div class="text-center max-w-600 p-8 z-10 relative">
          <h1 class="text-6xl font-bold mb-6 bg-gradient-to-r from-lime-500 to-green-600 bg-clip-text text-transparent">FT_PONG</h1>
          <p class="text-xl text-gray-100 mb-8">Experience the classic Pong game with a fresh lime twist!</p>
          <button onclick="handleGetStarted()" class="bg-lime-500 hover:bg-lime-600 text-white font-bold py-4 px-8 text-xl rounded transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-lime-500/25">Get Started</button>
        </div>
      </div>
    `;

    // Add CSS styles for the Pong animation
    addPongStyles();

    // Start ball animation
    startBallAnimation();

    console.log('✅ Pong-themed jumbotron added');
  }
}

/**
 * Add CSS styles for Pong animation
 */
function addPongStyles(): void {
  // Check if styles already exist
  if (document.getElementById('pong-styles')) return;

  const style = document.createElement('style');
  style.id = 'pong-styles';
  style.textContent = `
    .pong-board {
      background: rgba(17, 24, 39, 0.8);
      box-shadow:
        0 0 20px rgba(132, 204, 22, 0.3),
        inset 0 0 20px rgba(132, 204, 22, 0.1);
    }

    .center-line {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom,
        transparent 0%,
        #84cc16 10%,
        #84cc16 90%,
        transparent 100%);
      background-size: 100% 20px;
      background-repeat: repeat-y;
      transform: translateX(-50%);
      opacity: 0.6;
    }

    .pong-ball {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #84cc16;
      border-radius: 50%;
      box-shadow:
        0 0 10px rgba(132, 204, 22, 0.8),
        0 0 20px rgba(132, 204, 22, 0.4);
      transition: all 0.1s linear;
      z-index: 5;
    }

    .paddle {
      position: absolute;
      width: 8px;
      height: 60px;
      background: #84cc16;
      border-radius: 4px;
      box-shadow: 0 0 10px rgba(132, 204, 22, 0.6);
      animation: paddleMove 3s ease-in-out infinite;
    }

    .paddle-left {
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      animation-delay: 0s;
    }

    .paddle-right {
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      animation-delay: 1.5s;
    }

    @keyframes paddleMove {
      0%, 100% { transform: translateY(-50%); }
      25% { transform: translateY(-80%); }
      75% { transform: translateY(-20%); }
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .pong-board {
        inset: 1rem;
      }

      .paddle {
        height: 40px;
        width: 6px;
      }

      .pong-ball {
        width: 10px;
        height: 10px;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Start ball animation
 */
function startBallAnimation(): void {
  const ball = document.querySelector('.pong-ball') as HTMLElement;
  const board = document.querySelector('.pong-board') as HTMLElement;

  if (!ball || !board) return;

  // Ball properties
  let ballX = 100; // Starting X position
  let ballY = 100; // Starting Y position
  let velocityX = 2; // X velocity
  let velocityY = 1.5; // Y velocity

  function animateBall() {
    const boardRect = board.getBoundingClientRect();
    const boardWidth = boardRect.width - 20; // Account for border
    const boardHeight = boardRect.height - 20; // Account for border

    // Update position
    ballX += velocityX;
    ballY += velocityY;

    // Bounce off top and bottom walls
    if (ballY <= 0 || ballY >= boardHeight - 12) {
      velocityY = -velocityY;
      ballY = Math.max(0, Math.min(boardHeight - 12, ballY));
    }

    // Bounce off left and right walls
    if (ballX <= 0 || ballX >= boardWidth - 12) {
      velocityX = -velocityX;
      ballX = Math.max(0, Math.min(boardWidth - 12, ballX));
    }

    // Apply position
    ball.style.left = `${ballX}px`;
    ball.style.top = `${ballY}px`;

    // Continue animation
    requestAnimationFrame(animateBall);
  }

  // Start animation
  animateBall();
}

(window as any).handleGetStarted = function() {
  console.log('🚀 Get Started clicked...');
  const authToken = localStorage.getItem('ft_pong_auth_token');
  if (authToken) {
    showBasicToast('info', 'Game starting! (Game component will be added later)');
  } else {
    if ((window as any).modalService) {
      (window as any).modalService.showLoginModal();
    } else {
      showBasicAuthModal('login');
    }
  }
};

/**
 * Add basic content boxes
 */
function addBasicContentBoxes(): void {
  // Notifications box
  const notificationsBox = document.getElementById('notifications-box');
  if (notificationsBox) {
    notificationsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">📢 Notifications</h3>
      <p class="text-gray-400">TypeScript components not loaded. Using fallback content.</p>
    `;
  }

  // Friends box
  const friendsBox = document.getElementById('friends-box');
  if (friendsBox) {
    friendsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">👥 Friends</h3>
      <p class="text-gray-400">TypeScript components not loaded. Using fallback content.</p>
    `;
  }

  // Settings box
  const settingsBox = document.getElementById('settings-box');
  if (settingsBox) {
    settingsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">⚙️ Settings</h3>
      <p class="text-gray-400">TypeScript components not loaded. Using fallback content.</p>
    `;
  }

  console.log('✅ Basic content boxes added');
}

/**
 * Add fallback content for missing components
 */
function addFallbackContent(): void {
  // Check if components rendered properly, if not add fallback
  const notificationsBox = document.getElementById('notifications-box');
  const friendsBox = document.getElementById('friends-box');
  const settingsBox = document.getElementById('settings-box');

  if (notificationsBox && !notificationsBox.innerHTML.trim()) {
    notificationsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">📢 Notifications</h3>
      <p class="text-gray-400">Component failed to load. Using fallback content.</p>
    `;
  }

  if (friendsBox && !friendsBox.innerHTML.trim()) {
    friendsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">👥 Friends</h3>
      <p class="text-gray-400">Component failed to load. Using fallback content.</p>
    `;
  }

  if (settingsBox && !settingsBox.innerHTML.trim()) {
    settingsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">⚙️ Settings</h3>
      <p class="text-gray-400">Component failed to load. Using fallback content.</p>
    `;
  }
}

/**
 * Setup authentication state listeners
 */
function setupAuthListeners(components: Component[]): void {
  // Listen for auth state changes
  window.addEventListener('auth-state-changed', ((e: CustomEvent) => {
    console.log('🔄 Auth state changed:', e.detail);

    // Update navbar when auth state changes
    addBasicNavbar();

    // Update components
    updateAuthState(components);
  }) as EventListener);

  // Listen for storage changes (login/logout from other tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === 'ft_pong_auth_token' || e.key === 'ft_pong_user_data') {
      updateAuthState(components);
    }
  });
}

/**
 * Update authentication state
 */
function updateAuthState(components: Component[]): void {
  const authToken = localStorage.getItem('ft_pong_auth_token');
  const userData = localStorage.getItem('ft_pong_user_data');

  const isAuthenticated = !!(authToken && userData);
  let user = null;

  if (userData) {
    try {
      user = JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }

  console.log('🔄 Updating auth state:', { isAuthenticated, user });

  // Update navbar when auth state changes
  addBasicNavbar();

  // Update components
  components.forEach(component => {
    if (component.updateAuthState) {
      try {
        component.updateAuthState(isAuthenticated, user);
      } catch (error) {
        console.error('Error updating component auth state:', error);
      }
    }
  });
}

/**
 * Trigger authentication state update
 */
function triggerAuthUpdate(isAuthenticated: boolean, user?: any): void {
  // Dispatch custom event for components to listen to
  window.dispatchEvent(new CustomEvent('auth-state-changed', {
    detail: { isAuthenticated, user }
  }));

  // Also update the navbar immediately
  setTimeout(() => {
    addBasicNavbar();

    // Update components if they're loaded
    if (isComponentsLoaded && componentInstances.length > 0) {
      updateAuthState(componentInstances);
    }
  }, 100);
}

/**
 * Show initialization error to user
 */
function showInitializationError(error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

  const errorContainer = document.createElement('div');
  errorContainer.className = 'fixed inset-0 bg-gray-900 flex items-center justify-center z-50';
  errorContainer.innerHTML = `
    <div class="text-center p-8 max-w-md">
      <div class="text-red-500 text-6xl mb-4">⚠️</div>
      <h1 class="text-2xl font-bold text-white mb-4">Application Failed to Load</h1>
      <p class="text-gray-300 mb-6">
        Sorry, FT_PONG couldn't start properly. Please try refreshing the page.
      </p>
      <p class="text-sm text-gray-500 mb-6">
        Error: ${errorMessage}
      </p>
      <button
        onclick="window.location.reload()"
        class="bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
      >
        Refresh Page
      </button>
    </div>
  `;

  // Hide loading screen and show error
  hideLoadingScreen();
  document.body.appendChild(errorContainer);
}

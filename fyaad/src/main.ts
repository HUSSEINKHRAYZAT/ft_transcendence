// Main entry point for FT_PONG application
import { waitForDOM } from './utils/DOMHelpers';
import './styles/main.css';

// Try to import components with error handling
let Navbar: any, NotificationBox: any, FriendsBox: any, SettingsBox: any, ModalService: any;

try {
  console.log('📦 Importing components...');

  // Dynamic imports with better error handling
  Promise.all([
    import('./components/navbar/Navbar').then(m => Navbar = m.Navbar),
    import('./components/home/NotificationBox').then(m => NotificationBox = m.NotificationBox),
    import('./components/home/FriendsBox').then(m => FriendsBox = m.FriendsBox),
    import('./components/home/SettingsBox').then(m => SettingsBox = m.SettingsBox),
    import('./components/modals/ModalService').then(m => ModalService = m.ModalService)
  ]).then(() => {
    console.log('✅ All components imported successfully');
    initializeWithComponents();
  }).catch(error => {
    console.error('❌ Failed to import components:', error);
    console.log('🔄 Falling back to basic content...');
    initializeBasicContent();
  });

} catch (error) {
  console.error('❌ Import error:', error);
  initializeBasicContent();
}

/**
 * Initialize with TypeScript components
 */
async function initializeWithComponents(): Promise<void> {
  console.log('🚀 Starting TypeScript application initialization...');

  try {
    // Wait for DOM to be ready
    await waitForDOM();
    console.log('✅ DOM is ready!');

    // Hide loading screen
    hideLoadingScreen();

    // Initialize modal service and make it globally available
    const modalService = new ModalService();
    (window as any).modalService = modalService;
    console.log('🔑 Modal service initialized');

    // Add basic jumbotron content
    addBasicJumbotron();

    // Initialize components
    console.log('🧩 Initializing components...');

    const navbar = new Navbar();
    const notificationBox = new NotificationBox();
    const friendsBox = new FriendsBox();
    const settingsBox = new SettingsBox();

    // Render all components
    await Promise.all([
      navbar.render(),
      notificationBox.render(),
      friendsBox.render(),
      settingsBox.render()
    ]);

    console.log('✅ All components rendered successfully!');

    // Setup authentication state listening
    setupAuthListeners([navbar, notificationBox, friendsBox, settingsBox]);

    // Check initial auth state
    updateAuthState([navbar, notificationBox, friendsBox, settingsBox]);

    console.log('🎮 FT_PONG Application initialized successfully with TypeScript components!');

  } catch (error) {
    console.error('❌ Failed to initialize with components:', error);
    console.log('🔄 Falling back to basic content...');
    initializeBasicContent();
  }
}

/**
 * Fallback to basic content if TypeScript components fail
 */
async function initializeBasicContent(): Promise<void> {
  console.log('🔄 Initializing with basic content fallback...');

  try {
    await waitForDOM();
    hideLoadingScreen();

    // Create basic modal service
    createBasicModalService();

    // Add basic content
    addBasicNavbar();
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
    showLoginModal: () => alert('Login modal - TypeScript components not loaded'),
    showSignupModal: () => alert('Signup modal - TypeScript components not loaded'),
    showInfoModal: (type: string) => alert(`${type} info - TypeScript components not loaded`),
    closeModal: () => console.log('Close modal - using fallback')
  };
  console.log('🔑 Basic modal service created');
}

/**
 * Add basic navbar
 */
function addBasicNavbar(): void {
  const navbar = document.getElementById('navbar');
  if (navbar) {
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
              <button onclick="alert('About Us - TypeScript components not loaded')" class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300">ABOUT US</button>
              <button onclick="alert('Project Info - TypeScript components not loaded')" class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300">PROJECT</button>
            </div>
            <div>
              <button onclick="alert('Login - TypeScript components not loaded')" class="bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">Login</button>
            </div>
          </div>
        </div>
      </div>
    `;
    console.log('✅ Basic navbar added');
  }
}

/**
 * Add basic jumbotron content
 */
function addBasicJumbotron(): void {
  const jumbotron = document.getElementById('jumbotron');
  if (jumbotron) {
jumbotron.innerHTML = `
  <div class="min-h-screen flex items-center justify-center animated-gradient">
    <div class="text-center max-w-600 p-8">
      <h1 class="text-6xl font-bold mb-6 bg-gradient-to-r from-lime-500 to-green-600 bg-clip-text text-transparent">FT_PONG</h1>
      <p class="text-xl text-gray-100 mb-8">Experience the classic Pong game with a fresh lime twist!</p>
      <button onclick="handleGetStarted()" class="bg-lime-500 hover:bg-lime-600 text-white font-bold py-4 px-8 text-xl rounded transition-all duration-300 transform hover:scale-105">Get Started</button>
    </div>
  </div>
`;

    console.log('✅ Basic jumbotron added');
  }
}

/**
 * Handle Get Started button (global function)
 */
(window as any).handleGetStarted = function() {
  console.log('🚀 Get Started clicked...');
  if ((window as any).modalService) {
    const authToken = localStorage.getItem('ft_pong_auth_token');
    if (authToken) {
      alert('Game starting! (Game component will be added later)');
    } else {
      (window as any).modalService.showLoginModal();
    }
  } else {
    alert('Please login first to start playing!');
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
 * Setup authentication state listeners
 */
function setupAuthListeners(components: any[]): void {
  // Listen for auth state changes
  window.addEventListener('auth-state-changed', ((e: CustomEvent) => {
    console.log('🔄 Auth state changed:', e.detail);
    components.forEach(component => {
      if (component.updateAuthState) {
        component.updateAuthState(e.detail.isAuthenticated, e.detail.user);
      }
    });
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
function updateAuthState(components: any[]): void {
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

  components.forEach(component => {
    if (component.updateAuthState) {
      component.updateAuthState(isAuthenticated, user);
    }
  });
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

/**
 * Initialize application when script loads
 */
console.log('🚀 main.ts script loaded and executing...');
console.log('📅 Current time:', new Date().toISOString());
console.log('🌐 Document ready state:', document.readyState);

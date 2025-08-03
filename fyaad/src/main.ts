// Main entry point for FT_PONG application
import { waitForDOM } from './utils/DOMHelpers';
import './styles/main.css';

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  console.log('🔄 Starting application initialization...');

  try {
    console.log('⏳ Waiting for DOM to be ready...');
    // Wait for DOM to be ready
    await waitForDOM();
    console.log('✅ DOM is ready!');

    console.log('🔍 Looking for loading screen element...');
    // Hide loading screen first
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      console.log('✅ Loading screen found, hiding it...');
      loadingScreen.style.display = 'none';
      console.log('✅ Loading screen hidden successfully');
    } else {
      console.warn('⚠️ Loading screen element not found!');
    }

    // For now, just show a basic working state
    // We'll add the App class once all components are created
    console.log('🎮 FT_PONG Application initialized successfully!');

    console.log('🖼️ Showing basic content...');
    // Show basic content
    showBasicContent();
    console.log('✅ Basic content displayed');

    // Show debug info in development
    if (import.meta.env.DEV) {
      console.log('🟢 Development mode active');
      console.log('🌍 Environment variables:', {
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD,
        MODE: import.meta.env.MODE
      });
    }

  } catch (error) {
    console.error('❌ Failed to initialize FT_PONG application:', error);
    console.error('📍 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

    // Show error message to user
    showInitializationError(error);
  }
}

/**
 * Show basic content until components are ready
 */
function showBasicContent(): void {
  console.log('🏗️ Building basic content...');

  // Add basic navbar
  console.log('📍 Setting up navbar...');
  const navbar = document.getElementById('navbar');
  if (navbar) {
    console.log('✅ Navbar element found, adding content...');
    navbar.innerHTML = `
      <div class="bg-gray-800 border-b border-gray-700">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center">
              <span class="text-2xl font-bold text-lime-500">🏓 FT_PONG</span>
            </div>
            <div class="flex space-x-4">
              <button class="nav-link">HOME</button>
              <button class="nav-link">ABOUT US</button>
              <button class="nav-link">PROJECT</button>
            </div>
            <div>
              <button class="btn-lime">Login</button>
            </div>
          </div>
        </div>
      </div>
    `;
    console.log('✅ Navbar content added');
  } else {
    console.error('❌ Navbar element not found!');
  }

  // Add basic jumbotron
  console.log('📍 Setting up jumbotron...');
  const jumbotron = document.getElementById('jumbotron');
  if (jumbotron) {
    console.log('✅ Jumbotron element found, adding content...');
    jumbotron.innerHTML = `
      <div class="jumbotron">
        <div class="jumbotron-content">
          <h1>FT_PONG</h1>
          <p>Experience the classic Pong game with a fresh lime twist!</p>
          <button class="btn-lime text-xl px-8 py-4">Get Started</button>
        </div>
      </div>
    `;
    console.log('✅ Jumbotron content added');
  } else {
    console.error('❌ Jumbotron element not found!');
  }

  // Add basic content boxes
  console.log('📍 Setting up content boxes...');

  const notificationsBox = document.getElementById('notifications-box');
  if (notificationsBox) {
    console.log('✅ Notifications box found, adding content...');
    notificationsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">📢 Notifications</h3>
      <p class="text-gray-400">Please log in to view notifications</p>
    `;
    console.log('✅ Notifications box content added');
  } else {
    console.error('❌ Notifications box element not found!');
  }

  const friendsBox = document.getElementById('friends-box');
  if (friendsBox) {
    console.log('✅ Friends box found, adding content...');
    friendsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">👥 Friends</h3>
      <p class="text-gray-400">Please log in to view friends</p>
    `;
    console.log('✅ Friends box content added');
  } else {
    console.error('❌ Friends box element not found!');
  }

  const settingsBox = document.getElementById('settings-box');
  if (settingsBox) {
    console.log('✅ Settings box found, adding content...');
    settingsBox.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-lime-500">⚙️ Settings</h3>
      <p class="text-gray-400">Please log in to access settings</p>
    `;
    console.log('✅ Settings box content added');
  } else {
    console.error('❌ Settings box element not found!');
  }

  console.log('🎉 All basic content setup complete!');
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
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }

  document.body.appendChild(errorContainer);
}

/**
 * Handle unhandled errors
 */
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);

  if (import.meta.env.DEV) {
    // In development, show more detailed error info
    const errorInfo = {
      message: event.error?.message || event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    };
    console.table(errorInfo);
  }
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  if (import.meta.env.DEV) {
    console.log('Promise rejection details:', {
      reason: event.reason,
      promise: event.promise,
    });
  }
});

/**
 * Performance monitoring in development
 */
if (import.meta.env.DEV) {
  // Log performance metrics
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
      const domContentLoadedTime = perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;

      console.log('📊 Performance Metrics:');
      console.log(`⏱️ Page Load Time: ${loadTime}ms`);
      console.log(`🏗️ DOM Content Loaded: ${domContentLoadedTime}ms`);
      console.log(`🎯 DOM Interactive: ${perfData.domInteractive - perfData.navigationStart}ms`);
    }, 0);
  });
}

/**
 * Service worker registration (for future PWA features)
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🔧 Service Worker registered successfully:', registration);
    } catch (error) {
      console.log('❌ Service Worker registration failed:', error);
    }
  });
}

/**
 * Initialize application when script loads
 */
console.log('🚀 main.ts script loaded and executing...');
console.log('📅 Current time:', new Date().toISOString());
console.log('🌐 Document ready state:', document.readyState);

// Check if DOM is already loaded
if (document.readyState === 'loading') {
  console.log('⏳ DOM is still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded event fired!');
    initializeApp();
  });
} else {
  console.log('✅ DOM already loaded, initializing immediately...');
  initializeApp();
}

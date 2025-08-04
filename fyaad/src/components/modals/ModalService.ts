/**
 * Modal service for managing all modals in FT_PONG
 * This replaces the inline modal functions
 */
export class ModalService {
  private modalContainer: HTMLElement | null = null;
  private activeModal: string | null = null;

  constructor() {
    this.modalContainer = document.getElementById('modal-container');
  }

  /**
   * Show login modal
   */
  showLoginModal(): void {
    console.log('🔑 Opening login modal...');

    if (!this.modalContainer) {
      console.error('❌ Modal container not found');
      return;
    }

    this.activeModal = 'login';
    this.modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onclick="window.modalService?.closeModal(event)">
        <div class="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-lime-500">Login</h2>
            <button onclick="window.modalService?.closeModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
          <form onsubmit="window.modalService?.handleLogin(event)">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input type="email" id="login-email" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500" placeholder="Enter your email">
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input type="password" id="login-password" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500" placeholder="Enter your password">
            </div>
            <button type="submit" class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">Login</button>
          </form>
          <div class="text-center">
            <p class="text-gray-400">Are you new here? <button onclick="window.modalService?.showSignupModal()" class="text-lime-500 hover:text-lime-400">Sign up</button></p>
            <button onclick="window.modalService?.handleGoogleSignup()" class="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 flex items-center justify-center">
              <img src="/public/images/Google_white.png" alt="Google" class="w-5 h-5 mr-2">
              Sign up with Google
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show signup modal
   */
  showSignupModal(): void {
    console.log('📝 Opening signup modal...');

    if (!this.modalContainer) return;

    this.activeModal = 'signup';
    this.modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onclick="window.modalService?.closeModal(event)">
        <div class="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-lime-500">Sign Up</h2>
            <button onclick="window.modalService?.closeModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
          <form onsubmit="window.modalService?.handleSignup(event)">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">First Name</label>
              <input type="text" id="signup-firstname" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500" placeholder="Enter your first name">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
              <input type="text" id="signup-lastname" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500" placeholder="Enter your last name">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input type="email" id="signup-email" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500" placeholder="Enter your email">
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input type="password" id="signup-password" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500" placeholder="Enter your password">
            </div>
            <button type="submit" class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 mb-4">Sign Up</button>
          </form>
          <div class="text-center">
            <p class="text-gray-400">Already have an account? <button onclick="window.modalService?.showLoginModal()" class="text-lime-500 hover:text-lime-400">Login</button></p>
            <button onclick="window.modalService?.handleGoogleSignup()" class="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 flex items-center justify-center space-x-2">
              <img src="/public/images/Google_white.png" alt="Google" class="w-5 h-5">
              <span>Sign up with Google</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show info modal (About Us, Project, etc.)
   */
  showInfoModal(type: 'about' | 'project' | 'home'): void {
    console.log('ℹ️ Opening info modal:', type);

    if (!this.modalContainer) return;

    const content = this.getInfoModalContent(type);
    this.activeModal = `info-${type}`;

    this.modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onclick="window.modalService?.closeModal(event)">
        <div class="bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full mx-4 p-6" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-lime-500">${content.title}</h2>
            <button onclick="window.modalService?.closeModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
          <div class="mb-6">${content.body}</div>
          <button onclick="window.modalService?.closeModal()" class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">Close</button>
        </div>
      </div>
    `;
  }

  /**
   * Show module info modal
   */
  showModuleInfo(module: string): void {
    const moduleData = this.getModuleData(module);
    if (!moduleData || !this.modalContainer) return;

    this.activeModal = `module-${module}`;
    this.modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onclick="window.modalService?.closeModal(event)">
        <div class="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-lime-500">${moduleData.title}</h2>
            <button onclick="window.modalService?.closeModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
          <div class="mb-6">${moduleData.content}</div>
          <div class="flex gap-2">
            <button onclick="window.modalService?.showInfoModal('project')" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all duration-300">← Back</button>
            <button onclick="window.modalService?.closeModal()" class="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Close current modal
   */
  closeModal(event?: Event): void {
    if (event && event.target !== event.currentTarget) return;

    console.log('❌ Closing modal...');
    if (this.modalContainer) {
      this.modalContainer.innerHTML = '';
    }
    this.activeModal = null;
  }

  /**
   * Handle login form submission
   */
  handleLogin(event: Event): void {
    event.preventDefault();
    console.log('🔑 Handling login...');

    const emailInput = document.getElementById('login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('login-password') as HTMLInputElement;

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;

    // Demo login - use demo@ftpong.com / demo123
    if (email === 'demo@ftpong.com' && password === 'demo123') {
      const userData = {
        id: '1',
        firstName: 'Demo',
        lastName: 'User',
        email: email
      };

      localStorage.setItem('ft_pong_auth_token', 'demo-token-' + Date.now());
      localStorage.setItem('ft_pong_user_data', JSON.stringify(userData));

      alert('Login successful! Welcome back!');
      this.closeModal();

      // Trigger auth state update
      this.triggerAuthUpdate(true, userData);
    } else {
      alert('Invalid credentials. Try: demo@ftpong.com / demo123');
    }
  }

  /**
   * Handle signup form submission
   */
  handleSignup(event: Event): void {
    event.preventDefault();
    console.log('📝 Handling signup...');

    const firstNameInput = document.getElementById('signup-firstname') as HTMLInputElement;
    const lastNameInput = document.getElementById('signup-lastname') as HTMLInputElement;
    const emailInput = document.getElementById('signup-email') as HTMLInputElement;
    const passwordInput = document.getElementById('signup-password') as HTMLInputElement;

    if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput) return;

    const userData = {
      id: Date.now().toString(),
      firstName: firstNameInput.value,
      lastName: lastNameInput.value,
      email: emailInput.value
    };

    localStorage.setItem('ft_pong_auth_token', 'signup-token-' + Date.now());
    localStorage.setItem('ft_pong_user_data', JSON.stringify(userData));

    alert(`Account created for ${userData.firstName} ${userData.lastName}! You are now logged in.`);
    this.closeModal();

    // Trigger auth state update
    this.triggerAuthUpdate(true, userData);
  }

  /**
   * Handle Google signup
   */
  handleGoogleSignup(): void {
    console.log('🌐 Google signup clicked...');
    alert('Google signup will be implemented later!');
  }

  /**
   * Trigger authentication state update
   */
  private triggerAuthUpdate(isAuthenticated: boolean, user?: any): void {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated, user }
    }));
  }

  /**
   * Get info modal content
   */
  private getInfoModalContent(type: string): { title: string; body: string } {
    const content = {
      home: {
        title: 'Welcome to FT_PONG',
        body: 'This is the home page where you can start playing our lime-themed Pong game. Get ready for some retro gaming fun!'
      },
      about: {
        title: 'About Us',
        body: `
          We are a team of five 42-Beirut passionate developers collaborating on the FT_TRANSCENDENCE project.
          Check out our GitHub profiles:
          <ul class="list-none mt-2 text-lime-400 space-y-2">
            <li class="flex items-center space-x-2">
              <img src="https://img.icons8.com/ios-filled/50/ffffff/github.png" alt="GitHub" class="w-5 h-5">
              <a href="https://github.com/Ali-Fayad" target="_blank" class="hover:underline">Ali Fayad [ Frontend ]</a>
            </li>
            <li class="flex items-center space-x-2">
              <img src="https://img.icons8.com/ios-filled/50/ffffff/github.png" alt="GitHub" class="w-5 h-5">
              <a href="https://github.com/Fouad-Dahouk" target="_blank" class="hover:underline">Fouad Dahouk [ Socket ]</a>
            </li>
            <li class="flex items-center space-x-2">
              <img src="https://img.icons8.com/ios-filled/50/ffffff/github.png" alt="GitHub" class="w-5 h-5">
              <a href="https://github.com/HUSSEINKHRAYZAT" target="_blank" class="hover:underline">Hussein Khrayzat [ Game ]</a>
            </li>
            <li class="flex items-center space-x-2">
              <img src="https://img.icons8.com/ios-filled/50/ffffff/github.png" alt="GitHub" class="w-5 h-5">
              <a href="https://github.com/Husseinchr" target="_blank" class="hover:underline">Hussein Chrief [ DevOps ]</a>
            </li>
            <li class="flex items-center space-x-2">
              <img src="https://img.icons8.com/ios-filled/50/ffffff/github.png" alt="GitHub" class="w-5 h-5">
              <a href="https://github.com/younes285" target="_blank" class="hover:underline">Mostafa Younes [ Backend ]</a>
            </li>
          </ul>
        `
      },
      project: {
        title: 'Project Information',
        body: `
          <div class="text-left">
            <p class="text-gray-300 mb-4">FT_TRANSCENDENCE is a Milestone 6 project at 42 Beirut, designed as a full-stack web application centered around a modern remake of the classic Pong game.</p>
            <h4 class="text-lg font-bold text-lime-500 mb-3">Project Modules:</h4>
            <div class="grid grid-cols-2 gap-2 mb-4">
              <button onclick="window.modalService?.showModuleInfo('web')" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">🌐 Web [ 2 / 3 ]</button>
              <button onclick="window.modalService?.showModuleInfo('user')" class="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">👤 User Mng. [ 2 / 2 ]</button>
              <button onclick="window.modalService?.showModuleInfo('gameplay')" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">🎮 Gameplay [ 3.5 / 4.5 ]</button>
              <button onclick="window.modalService?.showModuleInfo('ai')" class="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">🧠 AI-Alg [ 1 / 1.5 ]</button>
              <button onclick="window.modalService?.showModuleInfo('security')" class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">🔒 Cybersecurity [ 1 / 2.5 ]</button>
              <button onclick="window.modalService?.showModuleInfo('devops')" class="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">⚙️ DevOps [ 1 / 2.5 ]</button>
              <button onclick="window.modalService?.showModuleInfo('graphics')" class="bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">🎨 Graphics [ 1 / 1 ]</button>
              <button onclick="window.modalService?.showModuleInfo('accessibility')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">♿ Accessibility [ 1 / 2.5 ]</button>
              <button onclick="window.modalService?.showModuleInfo('serverside')" class="col-span-2 bg-lime-600 hover:bg-lime-700 text-white text-sm font-medium py-2 px-3 rounded transition-all duration-300">🏓 Server-Side Pong [ 0 / 2 ]</button>
            </div>
          </div>
        `
      }
    };

    return content[type as keyof typeof content] || content.home;
  }

  /**
   * Get module data
   */
  private getModuleData(module: string): { title: string; content: string } | null {
    const modules: Record<string, { title: string; content: string }> = {
      web: {
        title: '🌐 Web Module [ 2 / 3 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-700 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Use a framework to build the backend.
            </div>
            <div class="bg-gray-700 p-3 rounded">
              <span class="text-blue-400 font-bold">✅ Minor:</span> Use a framework or a toolkit to build the frontend.
            </div>
            <div class="bg-gray-700 p-3 rounded">
              <span class="text-blue-400 font-bold">✅ Minor:</span> Use a database for the backend.
            </div>
            <div class="bg-gray-700 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> Store the score of a tournament in the Blockchain.
            </div>
          </div>
        `
      },
      user: {
        title: '👤 User Management [ 2 / 2 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-700 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Standard user management, authentication, users across tournaments.
            </div>
            <div class="bg-gray-700 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ Major:</span> Implementing a remote authentication.
            </div>
          </div>
        `
      },
      // Add other modules here...
      serverside: {
        title: '🏓 Server-Side Pong [ 0 / 2 ]',
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-700 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> Replace basic Pong with server-side Pong and implement an API.
            </div>
            <div class="bg-gray-700 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ Major:</span> Enabling Pong gameplay via CLI against web users with API integration.
            </div>
          </div>
        `
      }
    };

    return modules[module] || null;
  }
}

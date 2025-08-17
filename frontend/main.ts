import { waitForDOM } from '@/utils/DOMHelpers';
import '@/styles/main.css';
import { languageManager, t, SUPPORTED_LANGUAGES } from '@/langs/LanguageManager';
import simpleThemeManager from '@/utils/SimpleThemeManager';
import backgroundThemeManager from '@/utils/BackgroundThemeManager';

interface Component {
	render(): Promise<void>;
	updateAuthState?(isAuthenticated: boolean, user: any): void;
}

let componentInstances: Component[] = [];
let isComponentsLoaded = false;

console.log('🚀 main.ts script loaded and executing...');
console.log('📅 Current time:', new Date().toISOString());
console.log('🌐 Document ready state:', document.readyState);

initializeApplication();

async function initializeApplication(): Promise<void> {
  console.log('🚀 Starting FT_PONG application initialization...');

  try {
    await waitForDOM();
    console.log('✅ DOM is ready!');

    // Initialize managers
    console.log(`🌍 Language Manager initialized with: ${languageManager.getCurrentLanguage()}`);
    console.log(`🎨 Theme Manager initialized with: ${simpleThemeManager.getCurrentTheme()}`);
    console.log(`🌙 Background Theme Manager initialized with: ${backgroundThemeManager.getCurrentTheme()}`);

    // Check backend availability and show helpful message
    checkBackendStatus();

    // Listen for language changes globally
    languageManager.onLanguageChange((newLanguage) => {
      console.log(`🌍 Global language changed to: ${newLanguage}`);
      updateGlobalTranslations();
    });

    hideLoadingScreen();
    // Load only safe components that don't make API calls
    console.log('🔄 Loading safe components...');
    await loadSafeComponents();
  }
  catch (error) {
    console.error('❌ Failed to initialize application:', error);
    showInitializationError(error);
  }
}

function updateGlobalTranslations(): void {
  console.log('🔄 Updating global translations...');

  // Update navbar
  addBasicNavbar();

  // Update jumbotron button
  updateJumbotronButton();

  // Update any open modal content
  updateOpenModals();
}

async function loadSafeComponents(): Promise<void> {
	console.log('📦 Loading safe components (no API calls)...');

	try {
		// Load all components but handle failures gracefully  
		const safeComponents = [
			{ path: './components/home/SettingsBox', name: 'SettingsBox' },
			{ path: './components/home/NotificationBox', name: 'NotificationBox' },
			{ path: './components/home/FriendsBox', name: 'FriendsBox' },
			{ path: './components/modals/ModalService', name: 'ModalService' }
		];

		const componentPromises = safeComponents.map(comp => 
			loadComponent(comp.path, comp.name)
		);

		const results = await Promise.allSettled(componentPromises);
		const successful = results.filter(result => result.status === 'fulfilled').length;

		console.log(`📊 Component loading: ${successful}/${safeComponents.length} successful`);

		// Always try to initialize with available components
		await initializeWithSafeComponents(results);

	} catch (error) {
		console.error('❌ Safe component loading failed:', error);
		await initializeBasicContent();
	}
}

async function loadComponents(): Promise<void>
{
	console.log('📦 Attempting to load components...');

	try
	{
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

		if (successful >= 1)
			{
			console.log('✅ Some components loaded, initializing with available components...');
			await initializeWithComponents(results);
			isComponentsLoaded = true;
		}
		else
			throw new Error('All components failed to load');

	}
	catch (error)
	{
		console.error('❌ Component loading failed:', error);
		console.log('🔄 Falling back to basic content...');
		await initializeBasicContent();
	}
}

async function loadComponent(path: string, componentName: string): Promise<any>
{
  try
  {
    console.log(`📦 Loading ${componentName} from ${path}...`);
    const module = await import(/* @vite-ignore */ path);

    if (module[componentName])
	{
      console.log(`✅ ${componentName} loaded successfully`);
      return { name: componentName, constructor: module[componentName], module };
    }
	else
      throw new Error(`${componentName} not found in module`);
  }
  catch (error)
  {
    console.error(`❌ Failed to load ${componentName}:`, error);
    throw error;
  }
}

async function initializeWithSafeComponents(results: PromiseSettledResult<any>[]): Promise<void> {
	console.log('🧩 Initializing with safe components...');

	const components = results
		.filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
		.map(result => result.value);

	try {
		// Initialize modal service
		const modalServiceComponent = components.find(c => c.name === 'ModalService');
		if (modalServiceComponent) {
			const modalService = new modalServiceComponent.constructor();
			(window as any).modalService = modalService;
			console.log('🔑 Modal service initialized');
		} else {
			createBasicModalService();
		}

		// Add navbar and jumbotron
		addBasicNavbar();
		addBasicJumbotron();

		// Initialize safe components
		const instancesCreated: Component[] = [];
		for (const component of components) {
			if (component.name !== 'ModalService') {
				try {
					console.log(`🧩 Initializing ${component.name}...`);
					const instance = new component.constructor() as Component;
					instancesCreated.push(instance);
					await instance.render();
				} catch (error) {
					console.error(`❌ Failed to initialize ${component.name}:`, error);
				}
			}
		}

		// Add fallback content for any components that didn't load
		addFallbackContent();

		// Setup auth
		setupAuthListeners(instancesCreated);
		updateAuthState(instancesCreated);

		console.log('🎮 FT_PONG Application initialized with safe components!');

	} catch (error) {
		console.error('❌ Failed to initialize with safe components:', error);
		await initializeBasicContent();
	}
}

async function initializeWithComponents(results: PromiseSettledResult<any>[]): Promise<void>
{
	console.log('🧩 Initializing with loaded components...');

	const components = results
		.filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
		.map(result => result.value);

	try
	{
		const modalServiceComponent = components.find(c => c.name === 'ModalService');
		if (modalServiceComponent)
		{
			const modalService = new modalServiceComponent.constructor();
			(window as any).modalService = modalService;
			console.log('🔑 Modal service initialized');
		}
		else
			createBasicModalService();

		addBasicJumbotron();

		const componentPromises: Promise<void>[] = [];
		const instancesCreated: Component[] = [];

		for (const component of components)
		{
			if (component.name !== 'ModalService')
			{
				try
				{
					console.log(`🧩 Initializing ${component.name}...`);
					const instance = new component.constructor() as Component;
					instancesCreated.push(instance);
					componentPromises.push(instance.render());
				}
				catch (error)
				{
					console.error(`❌ Failed to initialize ${component.name}:`, error);
				}
			}
		}

		const renderResults = await Promise.allSettled(componentPromises);
		const successfulRenders = renderResults.filter(result => result.status === 'fulfilled').length;

		console.log(`✅ ${successfulRenders}/${componentPromises.length} components rendered successfully!`);

		componentInstances = instancesCreated;

		setupAuthListeners(instancesCreated);
		updateAuthState(instancesCreated);

		addFallbackContent();

		console.log('🎮 FT_PONG Application initialized successfully with TypeScript components!');

	}
	catch (error)
	{
		console.error('❌ Failed to initialize with components:', error);
		throw error;
	}
}

async function initializeBasicContent(): Promise<void>
{
	console.log('🔄 Initializing with basic content fallback...');

	try
	{
		createBasicModalService();

		addBasicNavbar();
		addBasicJumbotron();
		addBasicContentBoxes();

		console.log('✅ Basic content initialized successfully!');

	}
	catch (error)
	{
		console.error('❌ Failed to initialize basic content:', error);
		showInitializationError(error);
	}
}

function hideLoadingScreen(): void
{
	const loadingScreen = document.getElementById('loading-screen');
	if (loadingScreen) {
		console.log('✅ Loading screen found, hiding it...');
		loadingScreen.style.display = 'none';
		console.log('✅ Loading screen hidden successfully');
	}
}

function createBasicModalService(): void
{
  (window as any).modalService =
  {
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
    showPlayGameModal: () => {
      console.log('🎮 Basic play game modal');
      showBasicPlayGameModal();
    },
    closeModal: () => {
      console.log('❌ Close basic modal');
      closeBasicModal();
    },
    isModalOpen: () => document.getElementById('basic-modal') !== null
  };
  console.log('🔑 Basic modal service created');
}

function showBasicPlayGameModal(): void
{
  closeBasicModal();

  const modal = document.createElement('div');
  modal.id = 'basic-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm bg-black/75';

  modal.innerHTML = `
    <div class="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all duration-300">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-lime-500">🎮 Select Game Mode</h2>
        <button onclick="closeBasicModal()" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
      </div>

      <div class="space-y-4 mb-6">
        <button onclick="selectGameMode('single')" class="w-full btn-lime btn-shimmer">
          🤖 Single Player
        </button>

        <button onclick="selectGameMode('multiplayer')" class="w-full btn-secondary btn-shimmer">
          👥 Local Multiplayer
        </button>

        <button onclick="selectGameMode('tournament')" class="w-full btn-glass btn-shimmer">
          🏆 Tournament (4 Players)
        </button>
      </div>

      <button onclick="closeBasicModal()" class="w-full btn-outline">
        Cancel
      </button>
    </div>
  `;

  modal.addEventListener('click', (e) =>
	{
    if (e.target === modal)
      closeBasicModal();
  });

  document.body.appendChild(modal);
}

(window as any).selectGameMode = function(mode: string)
{
  console.log('🎮 Game mode selected:', mode);

  const user = JSON.parse(localStorage.getItem('ft_pong_user_data') || '{}');

  const gameData = {
    gameMode: mode,
    user: user,
    ...(mode === 'single' && { difficulty: 'medium' }),
    ...(mode === 'multiplayer' && { playerCount: 2 }),
    ...(mode === 'tournament' && { playerCount: 4 })
  };

  closeBasicModal();
  showBasicToast('success', 'Game Starting!');

  window.dispatchEvent(new CustomEvent('game-start-requested',{
    detail: gameData
  }));
};

function showBasicAuthModal(type: 'login' | 'signup'): void
{
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
						<input type="text" id="firstName" required class="input-modern" placeholder="Enter your first name">
					</div>
					<div class="mb-4">
						<label class="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
						<input type="text" id="lastName" required class="input-modern" placeholder="Enter your last name">
					</div>
				`}
				<div class="mb-4">
					<label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
					<input type="email" id="email" required class="input-modern" placeholder="Enter your email">
				</div>
				<div class="mb-6">
					<label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
					<input type="password" id="password" required class="input-modern" placeholder="Enter your password">
				</div>
				<div id="auth-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
				<button type="submit" class="w-full btn-lime mb-4">
					${title}
				</button>
			</form>
			<div class="text-center">
				<p class="text-gray-400">${isLogin ? "Don't have an account?" : "Already have an account?"}
					<button onclick="switchBasicAuthModal('${isLogin ? 'signup' : 'login'}')" class="text-lime-500 hover:text-lime-400 transition-colors duration-300">${isLogin ? 'Sign up' : 'Login'}</button>
				</p>
			</div>
		</div>
	`;

	modal.addEventListener('click', (e) =>
	{
		if (e.target === modal)
			closeBasicModal();
	});

	document.body.appendChild(modal);

	const form = modal.querySelector('#basic-auth-form') as HTMLFormElement;
	if (form)
		form.addEventListener('submit', (e) => handleBasicAuth(e, type));

	const firstInput = modal.querySelector('input') as HTMLInputElement;
	if (firstInput) {
		setTimeout(() => firstInput.focus(), 100);
	}
}

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

	if (!email || !password)
	{
		showBasicError('Please fill in all fields');
		return;
	}

	if (type === 'login')
	{
		if (email === 'demo@ftpong.com' && password === 'demo123')
		{
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
		}
		else
			showBasicError('Invalid credentials. Try: demo@ftpong.com / demo123');
	}
	else
	{
		const firstNameInput = modal.querySelector('#firstName') as HTMLInputElement;
		const lastNameInput = modal.querySelector('#lastName') as HTMLInputElement;

		if (!firstNameInput || !lastNameInput) return;

		const firstName = firstNameInput.value.trim();
		const lastName = lastNameInput.value.trim();

		if (!firstName || !lastName) {
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
			username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
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

function showBasicError(message: string): void
{
	const errorDiv = document.querySelector('#auth-error') as HTMLElement;
	if (errorDiv)
	{
		errorDiv.textContent = message;
		errorDiv.classList.remove('hidden');
	}
}

function switchBasicAuthModal(type: 'login' | 'signup'): void {
	showBasicAuthModal(type);
}


function showBasicProfileModal(): void
{
	closeBasicModal();

	const userData = localStorage.getItem('ft_pong_user_data');
	let user = null;

	try
	{
		user = userData ? JSON.parse(userData) : null;
	}
	catch (error)
	{
		console.error('Error parsing user data:', error);
	}

	if (!user)
	{
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

			<button onclick="closeBasicModal()" class="w-full btn-lime">
				Close
			</button>
		</div>
	`;

	modal.addEventListener('click', (e) => {
		if (e.target === modal) {
			closeBasicModal();
		}
	});

	document.body.appendChild(modal);
}

function showBasicInfoModal(type: string): void {
  closeBasicModal();

  const titles = {
    about: t('About Us'),
    project: t('Project Information'),
    home: t('Welcome to FT_PONG')
  };

  const content = {
    about: `
      <p class="mb-4">${t('We are a team of five passionate 42-Beirut developers collaborating on the FT_TRANSCENDENCE project')}</p>
      <h4 class="text-lg font-bold text-lime-500 mb-3">${t('Our Team:')}</h4>
      <ul class="list-none space-y-2 text-lime-400">
        <li>• ${t('Ali Fayad [ Frontend ]')}</li>
        <li>• ${t('Fouad Dahouk [ Socket ]')}</li>
        <li>• ${t('Hussein Khrayzat [ Game ]')}</li>
        <li>• ${t('Hussein Chrief [ DevOps ]')}</li>
        <li>• ${t('Mostafa Younes [ Backend ]')}</li>
      </ul>
    `,
    project: `
      <p class="mb-4">${t('FT_TRANSCENDENCE is a Milestone 6 project at 42 Beirut, designed as a full-stack web application centered around a modern remake of the classic Pong game')}</p>
      <p class="text-gray-400 text-sm">${t('Full project carousel available with TypeScript components')}</p>
    `,
    home: t('Get ready for some retro gaming fun!')
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
      <button onclick="closeBasicModal()" class="w-full btn-lime" data-i18n="Close">
        ${t('Close')}
      </button>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeBasicModal();
    }
  });

  document.body.appendChild(modal);
}

function closeBasicModal(): void {
	const modal = document.getElementById('basic-modal');
	if (modal) {
		modal.remove();
	}
}

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

(window as any).closeBasicModal = closeBasicModal;
(window as any).switchBasicAuthModal = switchBasicAuthModal;

function addBasicNavbar(): void
{
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const authToken = localStorage.getItem('ft_pong_auth_token');
    const userData = localStorage.getItem('ft_pong_user_data');
    const isAuthenticated = !!(authToken && userData);

    let user = null;
    if (userData) {
      try
	  {
        user = JSON.parse(userData);
      }
	  catch (error){
        console.error('Error parsing user data:', error);
      }
    }

    const authSection = isAuthenticated && user ?
      `<div class="relative">
		<button id="profile-dropdown-btn" class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-lime-500 bg-gray-700 hover:bg-gray-600 transition-colors duration-300">
		<div class="w-6 h-6 rounded-full bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white text-xs font-bold">
			${(user.firstName?.[0] || user.username?.[0] || user.email?.[0] || 'U').toUpperCase()}
		</div>
		<span>${user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.username || user.email || 'User')}</span>
		<svg class="w-4 h-4 transition-transform duration-200" id="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
		</svg>
		</button>
         <div id="profile-dropdown-menu" class="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-700 hidden opacity-0 transform scale-95 transition-all duration-200">
           <button onclick="handleProfile()" class="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-300" data-i18n="Profile">
             <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
             </svg>
             ${t('Profile')}
           </button>
           <button onclick="handleLogout()" class="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-red-400 transition-colors duration-300" data-i18n="Logout">
             <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
             </svg>
             ${t('Logout')}
           </button>
         </div>
       </div>` :
      `<button onclick="handleLogin()" class="btn-lime" data-i18n="Login">${t('Login')}</button>`;

    navbar.innerHTML = `
      <div class="bg-gray-800 border-b border-gray-700">
        <div class="container mx-auto px-4">
          <div class="grid grid-cols-3 items-center h-16">
            <div class="flex items-center justify-start">
              <img src="https://img.icons8.com/color/48/ping-pong.png" alt="Pong Icon" class="w-6 h-6 mr-2">
              <span class="text-2xl font-bold text-lime-500">FT_PONG</span>
            </div>
            <div class="flex items-center justify-center space-x-4">
              <button class="px-3 py-2 rounded-md text-sm font-medium text-lime-500 bg-gray-700" data-i18n="Home">${t('Home')}</button>
              <button onclick="handleAbout()" class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300" data-i18n="About">${t('About')}</button>
              <button onclick="handleProject()" class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300" data-i18n="Project">${t('Project')}</button>
            </div>
            <div class="flex items-center justify-end">
              ${authSection}
            </div>
          </div>
        </div>
      </div>
    `;

    if (isAuthenticated && user) {
      setupProfileDropdown();
    }
  }
}

/**
 * Setup profile dropdown functionality
 */
function setupProfileDropdown(): void {
	const dropdownBtn = document.getElementById('profile-dropdown-btn');
	const dropdownMenu = document.getElementById('profile-dropdown-menu');
	const dropdownArrow = document.getElementById('dropdown-arrow');

	if (!dropdownBtn || !dropdownMenu || !dropdownArrow) return;

	let isDropdownOpen = false;

	// Toggle dropdown
	const toggleDropdown = () => {
		isDropdownOpen = !isDropdownOpen;

		if (isDropdownOpen) {
			// Show dropdown
			dropdownMenu.classList.remove('hidden');
			setTimeout(() => {
				dropdownMenu.classList.remove('opacity-0', 'scale-95');
				dropdownMenu.classList.add('opacity-100', 'scale-100');
			}, 10);

			// Rotate arrow
			dropdownArrow.style.transform = 'rotate(180deg)';
		} else {
			// Hide dropdown
			dropdownMenu.classList.remove('opacity-100', 'scale-100');
			dropdownMenu.classList.add('opacity-0', 'scale-95');
			setTimeout(() => {
				dropdownMenu.classList.add('hidden');
			}, 200);

			// Reset arrow
			dropdownArrow.style.transform = 'rotate(0deg)';
		}
	};

	// Close dropdown
	const closeDropdown = () => {
		if (isDropdownOpen) {
			isDropdownOpen = false;
			dropdownMenu.classList.remove('opacity-100', 'scale-100');
			dropdownMenu.classList.add('opacity-0', 'scale-95');
			setTimeout(() => {
				dropdownMenu.classList.add('hidden');
			}, 200);
			dropdownArrow.style.transform = 'rotate(0deg)';
		}
	};

	// Dropdown button click
	dropdownBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleDropdown();
	});

	// Close dropdown when clicking outside
	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		if (!dropdownBtn.contains(target) && !dropdownMenu.contains(target)) {
			closeDropdown();
		}
	});

	// Close dropdown on escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeDropdown();
		}
	});

	// Close dropdown when clicking on menu items
	const menuItems = dropdownMenu.querySelectorAll('button');
	menuItems.forEach(item => {
		item.addEventListener('click', () => {
			closeDropdown();
		});
	});

	console.log('✅ Profile dropdown functionality setup complete');
}

// Make the function globally available
(window as any).addBasicNavbar = addBasicNavbar;

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

(window as any).handlePlayGame = async function() {
  console.log('🎮 Play Game clicked...');

  // Check if user is authenticated first
  const authToken = localStorage.getItem('ft_pong_auth_token');
  if (!authToken) {
    console.log('❌ User not authenticated, showing login modal');
    // User not authenticated, show login modal first
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      showBasicAuthModal('login');
    }
    return;
  }

  console.log('✅ User is authenticated, starting 3D Pong game...');
  
  // Start the 3D Pong game directly
  await start3DPongGame();
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

(window as any).testLogoutModal = function() {
  console.log('🧪 Testing logout modal...');

  const testConfig = {
    type: 'logout' as const,
    title: 'Confirm Logout',
    message: 'Are you sure you want to logout? You will need to login again to access your account.',
    confirmText: 'Yes, Logout',
    cancelText: 'Cancel',
    onConfirm: () => {
      console.log('✅ Logout confirmed in test');
      alert('Logout confirmed! (This is just a test)');
    },
    onCancel: () => {
      console.log('❌ Logout cancelled in test');
    }
  };

  console.log('🔍 Test config:', testConfig);

  // Try using modal service
  if ((window as any).modalService && (window as any).modalService.showMiniModal) {
    console.log('✅ Using modal service');
    (window as any).modalService.showMiniModal(testConfig);
  } else {
    console.log('❌ Modal service not available, creating direct modal');

    // ADD THIS: Create the modal directly (same code as testLogoutModalDirect)
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300';
    backdrop.id = 'test-logout-modal';

    backdrop.innerHTML = `
      <div class="bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-6 border border-gray-700">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-lime-500">${testConfig.title}</h2>
          <button id="test-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"></path>
            </svg>
          </div>
          <p class="text-gray-300 mb-6">${testConfig.message}</p>
          <div class="flex space-x-3">
            <button id="test-cancel" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-300">
              ${testConfig.cancelText}
            </button>
            <button id="test-confirm" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-300">
              ${testConfig.confirmText}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Add event listeners
    const closeBtn = backdrop.querySelector('#test-close');
    const cancelBtn = backdrop.querySelector('#test-cancel');
    const confirmBtn = backdrop.querySelector('#test-confirm');

    const closeModal = () => {
      backdrop.remove();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', () => {
      testConfig.onCancel();
      closeModal();
    });
    confirmBtn?.addEventListener('click', () => {
      testConfig.onConfirm();
      closeModal();
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
};

// Alternative direct test
(window as any).testLogoutModalDirect = function() {
  console.log('🧪 Testing logout modal DIRECTLY...');

  // Create modal HTML directly for testing
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300';
  backdrop.id = 'test-logout-modal';

  backdrop.innerHTML = `
    <div class="bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-6 border border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-lime-500">Confirm Logout</h2>
        <button id="test-close" class="text-gray-400 hover:text-white text-2xl transition-colors duration-300">&times;</button>
      </div>

      <div class="text-center">
        <div class="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
        </div>
        <p class="text-gray-300 mb-6">Are you sure you want to logout? You will need to login again to access your account.</p>
        <div class="flex space-x-3">
          <button id="test-cancel" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-300">
            Cancel
          </button>
          <button id="test-confirm" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-300">
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeBtn = backdrop.querySelector('#test-close');
  const cancelBtn = backdrop.querySelector('#test-cancel');
  const confirmBtn = backdrop.querySelector('#test-confirm');

  const closeModal = () => {
    backdrop.remove();
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', () => {
    console.log('❌ Test logout cancelled');
    closeModal();
  });
  confirmBtn?.addEventListener('click', () => {
    console.log('✅ Test logout confirmed');
    alert('Logout confirmed! (This is just a test)');
    closeModal();
  });

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
};


(window as any).handleLogout = function() {
  console.log('👋 Logout clicked...');
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
      // Same logout logic as above
      localStorage.removeItem('ft_pong_auth_token');
      localStorage.removeItem('ft_pong_user_data');

      if (typeof (window as any).addBasicNavbar === 'function') {
        (window as any).addBasicNavbar();
      }
      if (typeof (window as any).updateJumbotronButton === 'function') {
        (window as any).updateJumbotronButton();
      }

      window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { isAuthenticated: false, user: null }
      }));

      console.log('✅ User logged out successfully');

      if (typeof (window as any).showBasicToast === 'function') {
        (window as any).showBasicToast('success', 'You have been logged out successfully!');
      }
    }
  }

/**
 * Add Pong-themed jumbotron with game integration
 */

export function addBasicJumbotron(): void {
	const jumbotron = document.getElementById('jumbotron');
	if (jumbotron) {
		jumbotron.innerHTML = `
			<div class="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
				<!-- Pong Board Background -->
				<div class="pong-board absolute inset-4 border-4 border-lime-500 rounded-lg bg-gray-800">
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
					<h1 class="text-6xl font-bold mb-6 text-lime-500">FT_PONG</h1>
					<p class="text-xl text-white mb-8">${t('Experience the classic Pong game with a fresh lime twist!')}</p>

					<!-- Dynamic Button Container -->
					<div id="jumbotron-button-container">
						<!-- Button will be dynamically updated -->
					</div>
				</div>
			</div>
		`;

		// Add CSS styles for the Pong animation
		addPongStyles();

		startBallAnimation();

		// Initialize the button based on current auth state
		updateJumbotronButton();

		console.log('✅ Pong-themed jumbotron added with dynamic button');
	}
}

/**
 * Update jumbotron button based on auth state
 */
function updateJumbotronButton(): void {
  const buttonContainer = document.getElementById('jumbotron-button-container');
  if (!buttonContainer) return;

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

  buttonContainer.innerHTML = '';

  if (isAuthenticated && user) {
    buttonContainer.innerHTML = `
	<div class="space-y-4">
	<button onclick="handlePlayGame()" class="btn-lime btn-lg btn-shimmer" data-i18n="Play Game">
		🎮 ${t('Play Game')}
	</button>
	<p class="text-gray-300">${t('Welcome back!')}, <span class="text-lime-500 font-bold">${user.firstName || user.username || 'Player'}</span>!</p>
	</div>
    `;
  } else {
    buttonContainer.innerHTML = `
      <button onclick="handleGetStarted()" class="btn-lime btn-lg btn-shimmer" data-i18n="Start Game">
        ${t('Start Game')}
      </button>
    `;
  }
}

(window as any).handleGetStarted = function() {
  console.log('🚀 Get Started clicked...');
  const authToken = localStorage.getItem('ft_pong_auth_token');

  if (authToken) {
    console.log('✅ User authenticated, calling handlePlayGame...');
    // User is authenticated, call play game function
    (window as any).handlePlayGame();
  } else {
    console.log('❌ User not authenticated, showing login modal');
    // User not authenticated, show login modal
    if ((window as any).modalService) {
      (window as any).modalService.showLoginModal();
    } else {
      showBasicAuthModal('login');
    }
  }
};

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
			border-color: var(--lime-500, #84cc16) !important;
			box-shadow:
				0 0 20px var(--lime-500, #84cc16)50,
				inset 0 0 20px var(--lime-500, #84cc16)20;
		}

		.center-line {
			position: absolute;
			left: 50%;
			top: 0;
			bottom: 0;
			width: 2px;
			background: linear-gradient(to bottom,
				transparent 0%,
				var(--lime-500, #84cc16) 10%,
				var(--lime-500, #84cc16) 90%,
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
			background: var(--lime-500, #84cc16);
			border-radius: 50%;
			box-shadow:
				0 0 10px var(--lime-500, #84cc16)CC,
				0 0 20px var(--lime-500, #84cc16)66;
			transition: all 0.1s linear;
			z-index: 5;
		}

		.paddle {
			position: absolute;
			width: 8px;
			height: 60px;
			background: var(--lime-500, #84cc16);
			border-radius: 4px;
			box-shadow: 0 0 10px var(--lime-500, #84cc16)99;
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

		// Update jumbotron button
		updateJumbotronButton();

		// Update components
		updateAuthState(components);
	}) as EventListener);

	// Listen for storage changes (login/logout from other tabs)
	window.addEventListener('storage', (e) => {
		if (e.key === 'ft_pong_auth_token' || e.key === 'ft_pong_user_data') {
			updateAuthState(components);
		}
	});

	// Listen for game start requests from modal
	window.addEventListener('game-start-requested', ((e: CustomEvent) => {
		console.log('🎮 Game start requested:', e.detail);
		handleGameStartRequest(e.detail);
	}) as EventListener);
}

/**
 * Handle game start request from modal
 */
function handleGameStartRequest(gameData: any): void {
	console.log('🎮 Handling game start request:', gameData);

	try {
		// Store the game configuration
		localStorage.setItem('ft_pong_pending_game', JSON.stringify(gameData));

		// Log the game configuration for debugging
		console.log('📋 Game Configuration:');
		console.log('- Game Mode:', gameData.gameMode);
		if (gameData.difficulty) {
			console.log('- Difficulty:', gameData.difficulty);
		}
		if (gameData.playerCount) {
			console.log('- Player Count:', gameData.playerCount);
		}
		if (gameData.settings) {
			console.log('- Settings:', gameData.settings);
		}
		if (gameData.user) {
			console.log('- Player:', `${gameData.user.firstName} ${gameData.user.lastName}`);
		}

		// Show temporary message until game component is ready
		const gameMode = gameData.gameMode;
		const modeText = gameMode === 'single' ? 'Single Player' :
										gameMode === 'local' ? 'Local Multiplayer' :
										'Remote Multiplayer';

		let extraInfo = '';
		if (gameData.difficulty) {
			extraInfo = ` (${gameData.difficulty} difficulty)`;
		} else if (gameData.playerCount) {
			extraInfo = ` (${gameData.playerCount} players)`;
		}

		showBasicToast('success', 'Game Configuration Saved!');

		// TODO: Replace this section with actual game initialization
		// For now, we'll just log and show a message
		setTimeout(() => {
			showBasicToast('info', 'Game Handler Required');
		}, 1500);

		// The actual game handler should listen for 'game-start-requested' event
		// and use the gameData to initialize the appropriate game mode

	} catch (error) {
		console.error('Error handling game start request:', error);
		showBasicToast('error', 'Game Start Failed');
	}
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

	// Update jumbotron button
	updateJumbotronButton();

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
		updateJumbotronButton();

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

// Global variable to store the current game instance
let currentGameInstance: any = null;

/**
 * Start the 3D Pong game using Babylon.js
 */
async function start3DPongGame() {
	console.log('🎮 Starting 3D Pong game...');

	try {
		// Clean up any existing game first
		if (currentGameInstance) {
			await cleanupGame();
		}

		// Import the Babylon.js 3D Pong game and menu
		const { clearPongUI } = await import('../src/ui');
		const { Menu } = await import('../src/menu');
		const { Pong3D } = await import('../src/game/Pong3D');

		// Clear the current UI and replace with simple game container
		const jumbotron = document.getElementById('jumbotron');
		if (!jumbotron) {
			throw new Error('Jumbotron container not found');
		}

		// Simple game container in the jumbotron area
		jumbotron.innerHTML = `
			<div class="min-h-screen bg-black relative">
				<canvas id="gameCanvas" class="w-full h-full block"></canvas>
				<button id="exit-game" class="absolute top-4 left-4 btn-lime z-20">
					← Exit Game
				</button>
			</div>
		`;

		// Setup exit button with proper cleanup
		const exitBtn = document.getElementById('exit-game');
		if (exitBtn) {
			exitBtn.addEventListener('click', async () => {
				// Clean up the game properly before returning to menu
				await cleanupGame();
				addBasicJumbotron();
			});
		}

		// Clear any existing UI and get game configuration
		clearPongUI();
		const gameConfig = await Menu.render();
		
		// Start the 3D Pong game and store reference
		currentGameInstance = new Pong3D(gameConfig);
		
		console.log('✅ 3D Pong game started successfully');

	} catch (error) {
		console.error('❌ Failed to start 3D Pong game:', error);
		showBasicToast('error', 'Failed to start game');
	}
}

/**
 * Clean up the current game instance
 */
async function cleanupGame() {
	if (currentGameInstance) {
		console.log('🧹 Cleaning up game instance...');
		
		try {
			// Call the game's dispose method which handles theme cleanup and engine disposal
			if (currentGameInstance && typeof currentGameInstance.dispose === 'function') {
				currentGameInstance.dispose();
			}
			
			// Clear any game UI elements
			const { clearPongUI } = await import('../src/ui');
			clearPongUI();
			
			// Remove canvas if it exists
			const canvas = document.getElementById('gameCanvas');
			if (canvas) {
				canvas.remove();
			}
			
			console.log('✅ Game cleaned up successfully');
		} catch (error) {
			console.error('❌ Error during game cleanup:', error);
		}
		
		currentGameInstance = null;
	}
}


function updateOpenModals(): void {
  // Update any open modal buttons
  const modalClose = document.querySelector('[data-i18n="Close"]');
  if (modalClose) {
    modalClose.textContent = t('Close');
  }

  const modalCancel = document.querySelector('[data-i18n="Cancel"]');
  if (modalCancel) {
    modalCancel.textContent = t('Cancel');
  }

  const modalConfirm = document.querySelector('[data-i18n="Confirm"]');
  if (modalConfirm) {
    modalConfirm.textContent = t('Confirm');
  }
}

// 8. ADD event listener for settings changes:
window.addEventListener('storage', (e) => {
  if (e.key === 'ft_pong_game_settings') {
    // Sync language manager with settings changes
    languageManager.syncWithSettings();
  }
});

// 9. ADD global function to make available:
(window as any).updateGlobalTranslations = updateGlobalTranslations;

// Backend status check
async function checkBackendStatus() {
  try {
    const response = await fetch('http://localhost:3000/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      console.log('🌐 Backend server is available');
    } else {
      showOfflineMode();
    }
  } catch (error) {
    console.log('🔌 Backend server not available - running in offline demo mode');
    showOfflineMode();
  }
}

function showOfflineMode() {
  // Show a subtle notification that we're in offline mode
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <span>🔌</span>
      <span>Demo Mode - Use demo@ftpong.com / demo123</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">&times;</button>
    </div>
  `;
  document.body.appendChild(notification);
  
  // Auto-hide after 8 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 8000);
}

// Debug theme functions for console testing
(window as any).testThemes = function() {
  console.log('🎨 Available accent themes:', simpleThemeManager.getAvailableThemes());
  console.log('🌙 Available background themes:', backgroundThemeManager.getAvailableThemes());
  console.log('🎨 Current accent theme:', simpleThemeManager.getCurrentTheme());
  console.log('🌙 Current background theme:', backgroundThemeManager.getCurrentTheme());
};

(window as any).switchToOrange = function() {
  console.log('🧪 Testing orange theme...');
  simpleThemeManager.applyTheme('orange');
};

(window as any).switchToMidnight = function() {
  console.log('🧪 Testing midnight background...');
  backgroundThemeManager.applyBackgroundTheme('midnight');
};

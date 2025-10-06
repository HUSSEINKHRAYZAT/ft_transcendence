import {
  waitForDOM,
  languageManager,
  t,
  simpleThemeManager,
  backgroundThemeManager,
  authService
} from './';
import './styles/main.css';
import './styles/tournament-new.css';  // New tournament system styles
import { handleOAuthCallback } from './auth/callback';
import { API_BASE_URL } from './';
import { sessionBootstrap } from './utils/SessionBootstrap';
import type { GameConfig } from './types';
import { CameraConfig } from './game/config/camconfig';
import { NewTournamentMatchCoordinator } from './tournament/NewTournamentMatchCoordinator';

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash.includes('token')) {
        handleOAuthCallback();
    }
});


interface Component {
	render(): Promise<void>;
	updateAuthState?(isAuthenticated: boolean, user: any): void;
}

let componentInstances: Component[] = [];
let isComponentsLoaded = false;



bootstrapAndInitialize();

async function bootstrapAndInitialize(): Promise<void> {

  try {
    const sessionReadyPromise = new Promise<{ isAuthenticated: boolean; user: any }>((resolve) => {
      window.addEventListener('session-ready', ((e: CustomEvent) => {
        resolve(e.detail);
      }) as EventListener, { once: true });
    });

    await sessionBootstrap();

    const sessionData = await sessionReadyPromise;
    console.log('📊 Session data:', sessionData);

    await initializeApplication();

  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    await initializeApplication();
  }
}


async function initializeApplication(): Promise<void> {
  console.log('🚀 Starting FT_PONG application initialization...');

  try {
    await waitForDOM();

    checkBackendStatus();

    languageManager.onLanguageChange((newLanguage) => {
      console.log(`🌍 Global language changed to: ${newLanguage}`);
      updateGlobalTranslations();
    });

    hideLoadingScreen();
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

  addBasicNavbar();
  updateJumbotronButton();
  updateOpenModals();
}

async function loadSafeComponents(): Promise<void> {
    console.log('📦 Loading safe components (no API calls)...');

    try {
        const safeComponents = [
            { path: './components/home/SettingsBox', name: 'SettingsBox' },
            { path: './components/home/NotificationBox', name: 'NotificationBox' },
            { path: './components/home/FriendsBox', name: 'FriendsBox' },
            { path: './components/modals/ModalService', name: 'ModalService' },
            { path: './components/modals/StatisticsModal', name: 'StatisticsModal' },
            { path: './components/modals/ProfileModal', name: 'ProfileModal' },
            { path: './components/modals/LoginModal', name: 'LoginModal' }
        ];

        const componentPromises = safeComponents.map(comp =>
            loadComponent(comp.path, comp.name)
        );

        const results = await Promise.allSettled(componentPromises);
        const successful = results.filter(result => result.status === 'fulfilled').length;

        console.log(`📊 Component loading: ${successful}/${safeComponents.length} successful`);

        await initializeWithSafeComponents(results);

    } catch (error) {
        console.error('❌ Safe component loading failed:', error);
        await initializeBasicContent();
    }
}

async function loadComponent(path: string, componentName: string): Promise<any> {
    try {
        console.log(`📦 Loading ${componentName} from ${path}...`);
        const module = await import(/* @vite-ignore */ path);

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

async function initializeWithSafeComponents(results: PromiseSettledResult<any>[]): Promise<void> {
	console.log('🧩 Initializing with safe components...');

	const components = results
		.filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
		.map(result => result.value);

	try {
		const modalServiceComponent = components.find(c => c.name === 'ModalService');
		if (modalServiceComponent) {
			const modalService = new modalServiceComponent.constructor();
			(window as any).modalService = modalService;
			console.log('🔑 Modal service initialized');
		} else {
			createBasicModalService();
		}

		addBasicNavbar();
		addBasicJumbotron();

		// Check if starting a tournament match
		const startingMatch = sessionStorage.getItem('ft_pong_starting_tournament_match');
		if (startingMatch) {
			console.log('🏆 Auto-starting tournament match:', startingMatch);
			sessionStorage.removeItem('ft_pong_starting_tournament_match');
			
			setTimeout(async () => {
				try {
					const gameConfig = JSON.parse(startingMatch);
					const jumbotron = document.getElementById('jumbotron');
					if (jumbotron) {
						jumbotron.innerHTML = `
							<div class="min-h-screen bg-black relative">
								<canvas id="gameCanvas" class="w-full h-full block"></canvas>
							</div>
						`;
					}
					
					const { Pong3D } = await import('./game/core/Pong3D');
					currentGameInstance = new Pong3D(gameConfig);
				} catch (error) {
					console.error('Failed to start tournament match:', error);
				}
			}, 500);
		}

		const instancesCreated: Component[] = [];
		for (const component of components) {
			if (component.name !== 'ModalService') {
				try {
					console.log(`🧩 Initializing ${component.name}...`);

					if (component.name === 'StatisticsModal') {
						(window as any).StatisticsModal = component.constructor;
						console.log(`✅ ${component.name} made globally available`);
						continue;
					}

					if (component.name === 'ProfileModal') {
						(window as any).ProfileModal = component.constructor;
						console.log(`✅ ${component.name} made globally available`);
						continue;
					}

					if (component.name === 'LoginModal') {
						(window as any).LoginModal = component.constructor;
						console.log(`✅ ${component.name} made globally available`);
						continue;
					}

					const instance = new component.constructor() as Component;
					instancesCreated.push(instance);

					if ('render' in instance && typeof instance.render === 'function') {
						await instance.render();
					} else if ('showModal' in instance && typeof instance.showModal === 'function') {
						console.log(`✅ ${component.name} instance created (modal type)`);
					}

					else
					{
						console.log(`⚠️ ${component.name} has no render method, skipping render call`);
					}
				} catch (error) {
					console.error(`❌ Failed to initialize ${component.name}:`, error);
				}
			}
		}

		addFallbackContent();

		setupAuthListeners(instancesCreated);
		updateAuthState(instancesCreated);

		console.log('🎮 FT_PONG Application initialized with safe components!');

	} catch (error) {
		console.error('❌ Failed to initialize with safe components:', error);
		await initializeBasicContent();
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

        <button onclick="selectGameMode('create-tournament')" class="w-full btn-glass btn-shimmer" style="background: linear-gradient(135deg, #84cc16, #65a30d); border: 2px solid #84cc16;">
          🏆 Create Tournament
        </button>
        
        <button onclick="selectGameMode('join-tournament')" class="w-full btn-glass btn-shimmer" style="background: linear-gradient(135deg, #22c55e, #16a34a); border: 2px solid #22c55e;">
          🎯 Join Tournament
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

(window as any).selectGameMode = async function(mode: string)
{
  console.log('🎮 Game mode selected:', mode);

  closeBasicModal();

  const user = JSON.parse(localStorage.getItem('ft_pong_user_data') || '{}');

  // Handle tournament modes
  if (mode === 'create-tournament') {
    console.log('🏆 Creating Tournament...');
    showBasicToast('info', 'Opening Tournament Creation...');
    
    try {
      await showTournamentCreationModal();
    } catch (error) {
      console.error('Failed to show tournament creation:', error);
      showBasicToast('error', 'Failed to create tournament');
    }
    return;
  }
  
  if (mode === 'join-tournament') {
    console.log('� Joining Tournament...');
    showBasicToast('info', 'Opening Tournament Join...');
    
    try {
      await showTournamentJoinModal();
    } catch (error) {
      console.error('Failed to show tournament join:', error);
      showBasicToast('error', 'Failed to join tournament');
    }
    return;
  }

  // For other modes, use existing game start system
  const gameData = {
    gameMode: mode,
    user: user,
    ...(mode === 'single' && { difficulty: 'medium' }),
    ...(mode === 'multiplayer' && { playerCount: 2 })
  };

  showBasicToast('success', 'Game Starting!');

  window.dispatchEvent(new CustomEvent('game-start-requested',{
    detail: gameData
  }));
}

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

	const user = authService.getUser();
	const stats = authService.getStatistics();

	if (!user) {
    showBasicToast('error', 'No profile data found');
    return;
	}

	const safeStats = stats || {
		winCount: 0,
		lossCount: 0,
		tournamentWinCount: 0,
		tournamentCount: 0,
		totalGames: 0,
	};

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
					${(user.firstName || user.userName || 'U').charAt(0).toUpperCase()}
				</div>
				<h3 class="text-xl font-bold text-white">${user.firstName || ''} ${user.lastName || ''}</h3>
				<p class="text-gray-400">${user.email || 'No email'}</p>
			</div>

			<div class="space-y-3 mb-6">
				<div class="bg-gray-700 p-3 rounded">
					<span class="text-gray-400">Username:</span>
					<span class="text-white ml-2">'Not set'</span>
				</div>
				<div class="bg-gray-700 p-3 rounded">
					<span class="text-gray-400">Games Played:</span>
					<span class="text-white ml-2"></span>
				</div>
				<div class="bg-gray-700 p-3 rounded">
					<span class="text-gray-400">Wins:</span>
					<span class="text-lime-500 ml-2 font-bold"></span>
				</div>
				<div class="bg-gray-700 p-3 rounded">
					<span class="text-gray-400">Losses:</span>
					<span class="text-red-400 ml-2 font-bold"></span>
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

function addBasicNavbar(): void {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const authState = authService.getState();
    const isAuthenticated = authState.isAuthenticated;
    const user = authState.user;

    console.log('🔄 Updating navbar with auth state:', {
      isAuthenticated,
      user: user?.email,
      profilePath: user?.profilePath
    });

    let avatarHtml = '';
    if (isAuthenticated && user) {
      if (user.profilePath) {
        let avatarUrl = user.profilePath;
        if (!avatarUrl.startsWith('http')) {
          if (avatarUrl.startsWith('/avatars/') || avatarUrl.startsWith('avatars/')) {
          } else {
            avatarUrl = `/avatars/${avatarUrl}`;
          }
        }
        avatarHtml = `
          <div class="w-6 h-6 rounded-full border border-lime-500 overflow-hidden">
            <img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover">
          </div>`;
      } else {
        avatarHtml = `
          <div class="w-6 h-6 rounded-full bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white text-xs font-bold">
            ${(user.firstName?.[0] || user.userName?.[0] || user.email?.[0] || 'U').toUpperCase()}
          </div>`;
      }
    }

    const authSection = isAuthenticated && user ?
      `<div class="relative">
        <button id="profile-dropdown-btn" class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-lime-500 bg-gray-700 hover:bg-gray-600 transition-colors duration-300">
          ${avatarHtml}
          <span>${user.userName || user.email || 'User'}</span>
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
          <button onclick="handleStatistics()" class="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-300" data-i18n="Statistics">
            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z"></path>
            </svg>
            ${t('Statistics')}
          </button>
          <button onclick="handleLogout()" class="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-red-400 transition-colors duration-300" data-i18n="Logout">
            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"></path>
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
              <button class="block px-3 py-2 rounded-md text-sm font-medium text-lime-500 bg-gray-700 cursor-pointer" data-i18n="Home">${t('Home')}</button>
              <button onclick="handleAbout()" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300 cursor-pointer" data-i18n="About">${t('About')}</button>
              <button onclick="handleProject()" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300 cursor-pointer" data-i18n="Project">${t('Project')}</button>
            </div>
            <div class="flex items-center justify-end">
              ${authSection.includes('btn-lime') ? authSection.replace('btn-lime', 'btn-lime block cursor-pointer') : authSection}
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

(window as any).handleProfile = function() {
	console.log('👤 Profile clicked...');

	const dropdownMenu = document.getElementById('profile-dropdown-menu');
	if (dropdownMenu && !dropdownMenu.classList.contains('hidden')) {
		dropdownMenu.classList.add('hidden');
	}

	if ((window as any).ProfileModal) {
		console.log('✅ Using ProfileModal.show()');
		(window as any).ProfileModal.show();
	} else {
		import('./components/modals/ProfileModal').then(({ ProfileModal }) => {
			ProfileModal.show();
		}).catch(() => {
			console.log('ProfileModal not available, using fallback');
			showBasicProfileModal();
		});
	}
};

(window as any).handleStatistics = function() {
	console.log('📊 Statistics clicked...');

	if ((window as any).StatisticsModal) {
		(window as any).StatisticsModal.show();
	} else {
		import('./components/modals/StatisticsModal').then(({ StatisticsModal }) => {
			StatisticsModal.show();
		}).catch((error) => {
			console.error('ProfileModal failed to load:', error);
			showBasicProfileModal();
		});
	}
};

function setupProfileDropdown(): void {
	const dropdownBtn = document.getElementById('profile-dropdown-btn');
	const dropdownMenu = document.getElementById('profile-dropdown-menu');
	const dropdownArrow = document.getElementById('dropdown-arrow');

	if (!dropdownBtn || !dropdownMenu || !dropdownArrow) return;

	let isDropdownOpen = false;

	const toggleDropdown = () => {
		isDropdownOpen = !isDropdownOpen;

		if (isDropdownOpen) {
			dropdownMenu.classList.remove('hidden');
			setTimeout(() => {
				dropdownMenu.classList.remove('opacity-0', 'scale-95');
				dropdownMenu.classList.add('opacity-100', 'scale-100');
			}, 10);

			dropdownArrow.style.transform = 'rotate(180deg)';
		} else {
			dropdownMenu.classList.remove('opacity-100', 'scale-100');
			dropdownMenu.classList.add('opacity-0', 'scale-95');
			setTimeout(() => {
				dropdownMenu.classList.add('hidden');
			}, 200);

			dropdownArrow.style.transform = 'rotate(0deg)';
		}
	};

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

	dropdownBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleDropdown();
	});

	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		if (!dropdownBtn.contains(target) && !dropdownMenu.contains(target)) {
			closeDropdown();
		}
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeDropdown();
		}
	});

	const menuItems = dropdownMenu.querySelectorAll('button');
	menuItems.forEach(item => {
		item.addEventListener('click', () => {
			closeDropdown();
		});
	});

	console.log('✅ Profile dropdown functionality setup complete');
}

(window as any).addBasicNavbar = addBasicNavbar;

(window as any).handleLogin = function() {
	console.log('🔑 Login clicked...');
	if ((window as any).modalService) {
		(window as any).modalService.showLoginModal();
	}
	else
	{
		showBasicAuthModal('login');
	}
};

(window as any).handlePlayGame = async function() {
  console.log('🎮 Play Game clicked...');
	const user = authService.getUser();
	console.log('👤 Current User:', user);
	console.log('📁 ProfilePath:', user?.profilePath);
  const authState = authService.getState();

  if (!authState.isAuthenticated || !authState.user) {
    console.log('❌ User not authenticated, showing login modal');
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      showBasicAuthModal('login');
    }
    return;
  }

  console.log('✅ User is authenticated, starting 3D Pong game...');
  console.log('🎫 JWT Token available:', authState.token?.substring(0, 20) + '...');

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

(window as any).handleLogout = async function() {
    try {
        await authService.logout();
        resetSettingsToDefaults();

        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: { isAuthenticated: false, user: null }
        }));

        if (typeof (window as any).showBasicToast === 'function') {
            (window as any).showBasicToast('success', 'You have been logged out successfully!');
        }

        setTimeout(() => {
            window.location.reload();
        }, 500);

    } catch (error) {
        console.error('Logout error:', error);
        if (typeof (window as any).showBasicToast === 'function') {
            (window as any).showBasicToast('error', 'Logout failed');
        }

        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
};

(window as any).handleGetStarted = function() {
  console.log('🚀 Get Started clicked...');

  const authState = authService.getState();

  if (authState.isAuthenticated && authState.user) {
    console.log('✅ User authenticated, calling handlePlayGame...');
    (window as any).handlePlayGame();
  } else {
    console.log('❌ User not authenticated, showing login modal');
    if ((window as any).modalService) {
      (window as any).modalService.showLoginModal();
    } else {
      showBasicAuthModal('login');
    }
  }
};

export function addBasicJumbotron(): void {
	const jumbotron = document.getElementById('jumbotron');
	if (jumbotron) {
		jumbotron.innerHTML = `
			<div class="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
				<!-- Pong Board Background -->
				<div class="pong-board absolute inset-4 border-4 border-lime-500 rounded-lg bg-gray-800">
					<!-- Center Line -->
					<div class="center-line bg-lime-500"></div>

					<!-- Animated Ball -->
					<div class="pong-ball bg-lime-500"></div>

					<!-- Left Paddle -->
					<div class="paddle paddle-left bg-lime-500"></div>

					<!-- Right Paddle -->
					<div class="paddle paddle-right bg-lime-500"></div>
				</div>

				<!-- Content -->
				<div class="text-center max-w-600 p-8 z-10 relative">
					<h1 class="text-6xl font-bold mb-6 text-lime-500" style="
						text-shadow: 
							2px 2px 0 rgba(0,0,0,0.3),
							4px 4px 0 rgba(0,0,0,0.25),
							6px 6px 0 rgba(0,0,0,0.2),
							8px 8px 0 rgba(0,0,0,0.15),
							10px 10px 0 rgba(0,0,0,0.1),
							12px 12px 20px rgba(0,0,0,0.5),
							0 0 30px rgba(132, 204, 22, 0.8);
						transform: perspective(600px) rotateX(8deg);
						transform-style: preserve-3d;
						letter-spacing: 0.1em;
					">FT_PONG</h1>
					<p class="text-xl text-white mb-8"></p>

					<!-- Dynamic Button Container -->
					<div id="jumbotron-button-container">
						<!-- Button will be dynamically updated -->
					</div>
				</div>
			</div>
		`;

		addPongStyles();

		startBallAnimation();

		updateJumbotronButton();

		console.log('✅ Pong-themed jumbotron added with dynamic button');
	}
}

function updateJumbotronButton(): void {
  const buttonContainer = document.getElementById('jumbotron-button-container');
  if (!buttonContainer) return;

  const authState = authService.getState();
  const isAuthenticated = authState.isAuthenticated;
  const user = authState.user;

  buttonContainer.innerHTML = '';

  if (isAuthenticated && user) {
	buttonContainer.innerHTML = `
	<div class="space-y-4">
		<button onclick="handlePlayGame()"
		class="px-6 py-3 rounded-lg font-bold text-white bg-lime-500 hover:bg-lime-600 transition-all duration-300 glow-lime">
		🎮 ${t('Play Game')}
		</button>
		<p class="text-gray-300">
		${t('Welcome')},
		<span class="text-lime-500 font-bold">${user.firstName || user.userName || 'Player'}</span> !
		</p>
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

function addPongStyles(): void {
  let style = document.getElementById('pong-styles') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'pong-styles';
    document.head.appendChild(style);
  }

  style.textContent = `
    .center-line {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      transform: translateX(-50%);
      opacity: 0.6;
      background-size: 100% 20px;
      background-repeat: repeat-y;
    }

    .pong-ball {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      transition: all 0.1s linear;
      z-index: 5;
    }

    .paddle {
      position: absolute;
      width: 8px;
      height: 60px;
      border-radius: 4px;
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

    @media (max-width: 768px) {
      .pong-board { inset: 1rem; }
      .paddle { height: 40px; width: 6px; }
      .pong-ball { width: 10px; height: 10px; }
    }
  `;
}

function startBallAnimation(): void {
	const ball = document.querySelector('.pong-ball') as HTMLElement;
	const board = document.querySelector('.pong-board') as HTMLElement;

	if (!ball || !board) return;

	let ballX = 100;
	let ballY = 100;
	let velocityX = 2;
	let velocityY = 1.5;

	function animateBall() {
		const boardRect = board.getBoundingClientRect();
		const boardWidth = boardRect.width - 20;
		const boardHeight = boardRect.height - 20;

		ballX += velocityX;
		ballY += velocityY;

		if (ballY <= 0 || ballY >= boardHeight - 12) {
			velocityY = -velocityY;
			ballY = Math.max(0, Math.min(boardHeight - 12, ballY));
		}

		if (ballX <= 0 || ballX >= boardWidth - 12) {
			velocityX = -velocityX;
			ballX = Math.max(0, Math.min(boardWidth - 12, ballX));
		}

		ball.style.left = `${ballX}px`;
		ball.style.top = `${ballY}px`;

		requestAnimationFrame(animateBall);
	}

	animateBall();
}

function addBasicContentBoxes(): void {
	const notificationsBox = document.getElementById('notifications-box');
	if (notificationsBox) {
		notificationsBox.innerHTML = `
			<h3 class="text-xl font-bold mb-4 text-lime-500">📢 Notifications</h3>
			<p class="text-gray-400">TypeScript components not loaded. Using fallback content.</p>
		`;
	}

	const friendsBox = document.getElementById('friends-box');
	if (friendsBox) {
		friendsBox.innerHTML = `
			<h3 class="text-xl font-bold mb-4 text-lime-500">👥 Friends</h3>
			<p class="text-gray-400">TypeScript components not loaded. Using fallback content.</p>
		`;
	}

	const settingsBox = document.getElementById('settings-box');
	if (settingsBox) {
		settingsBox.innerHTML = `
			<h3 class="text-xl font-bold mb-4 text-lime-500">⚙️ Settings</h3>
			<p class="text-gray-400">TypeScript components not loaded. Using fallback content.</p>
		`;
	}

	console.log('✅ Basic content boxes added');
}

function addFallbackContent(): void {
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

function setupAuthListeners(components: Component[]): void {
    window.addEventListener('auth-state-changed', ((e: CustomEvent) => {

        if (e.detail.isAuthenticated && e.detail.user) {
            authService.setAuthState(authService.getToken() || 'temp-token', e.detail.user)
                .then(() => {
                    const authState = authService.getState();
                    if (authState.settings) {
                        applyBackendSettingsToManagers(authState.settings);

                        const settingsComponent = componentInstances.find(c => c.constructor.name === 'SettingsBox');
                        if (settingsComponent && 'applyBackendSettings' in settingsComponent) {
                            (settingsComponent as any).applyBackendSettings(authState.settings);
                        }
                    }
                });
        } else {
            resetSettingsToDefaults();
        }

        addBasicNavbar();
        updateJumbotronButton();
        updateAuthState(components);
    }) as EventListener);

	window.addEventListener('storage', (e) => {
		if (e.key === 'ft_pong_auth_token' || e.key === 'ft_pong_user_data') {
			updateAuthState(components);
		}
	});

	window.addEventListener('game-start-requested', ((e: CustomEvent) => {
		console.log('🎮 Game start requested:', e.detail);
		handleGameStartRequest(e.detail);
	}) as EventListener);

	// ==================== NEW TOURNAMENT SYSTEM EVENT LISTENERS ====================
	
	window.addEventListener('tournament-created', ((e: CustomEvent) => {
		console.log('🏆 Tournament created:', e.detail);
		const { tournament } = e.detail;

		// Store tournament data globally
		currentTournamentData = tournament;

		// Show lobby automatically
		import('./components/tournament/TournamentLobby').then(({ tournamentLobby }) => {
			tournamentLobby.show(tournament);
		});
	}) as EventListener);

	window.addEventListener('tournament-started', ((e: CustomEvent) => {
		console.log('🏆 Tournament started:', e.detail);
		// Show bracket or match UI
		showBasicToast('success', 'Tournament has started!');
	}) as EventListener);

	window.addEventListener('tournament-left', (() => {
		console.log('🏆 Left tournament');
		showBasicToast('info', 'Left tournament');
	}) as EventListener);

	// Auto-start tournament matches
	window.addEventListener('ft:tournament:startMatch', ((e: CustomEvent) => {
		console.log('🏆 Auto-starting tournament match:', e.detail);
		const { gameConfig, tournament, match } = e.detail;

		try {
			// Hide any existing modals/overlays
			hideBasicModal();

			// Launch the tournament match using existing function
			launchTournamentMatch(tournament, match);

			const opponentName = match.player1?.name === authService.getUser()?.userName ?
				match.player2?.name : match.player1?.name;
			showBasicToast('success', `🚀 Auto-starting match vs ${opponentName || 'Opponent'}`);
		} catch (error) {
			console.error('❌ Failed to auto-start tournament match:', error);
			showBasicToast('error', 'Failed to start match automatically');
		}
	}) as EventListener);

	window.addEventListener('ft:pong:returnToMenu', ((e: CustomEvent) => {
		console.log('🏠 Returning to menu:', e.detail?.reason);
		// Navigate back to home page (which renders the homepage)
		window.location.href = '/';
	}) as EventListener);

	// Tournament bracket overlay events
	window.addEventListener('ft:tournament:continueFromBracket', ((e: CustomEvent) => {
		console.log('🏆 Continuing from bracket overlay');
		// This will trigger the existing tournament progression system
		// The bracket overlay has already been hidden by this point
	}) as EventListener);


	window.addEventListener('ft:tournament:showFullBracket', ((e: CustomEvent) => {
		console.log('🏆 Showing full tournament bracket');
		// Navigate to full tournament view
		if (currentTournamentData) {
			import('./components/tournament/TournamentLobby').then(({ tournamentLobby }) => {
				tournamentLobby.show(currentTournamentData);
			});
		}
	}) as EventListener);

	// Setup new tournament service listeners
	setupNewTournamentListeners();
}

async function setupNewTournamentListeners() {
	const { newTournamentService } = await import('./tournament/NewTournamentService');
	
	// Listen for match ready events
	newTournamentService.on('match_ready', (data: any) => {
		console.log('🎮 Match ready event received:', data);
		
		const user = authService.getUser();
		const userId = user?.id || user?.email;
		
		if (!data.match || !userId) {
			console.log('⚠️ No match data or user ID');
			return;
		}
		
		// Check if current user is in this match
		const isPlayer1 = data.match.player1?.id === userId || data.match.player1?.externalId === userId;
		const isPlayer2 = data.match.player2?.id === userId || data.match.player2?.externalId === userId;
		
    if (isPlayer1 || isPlayer2) {
			console.log('🎮 Current user is in this match! Starting game...');
			
			// IMMEDIATELY hide ALL tournament UI and overlays
			console.log('🧹 Force removing all tournament overlays...');
      document.querySelectorAll('.tournament-lobby, .tournament-lobby-overlay, .tournament-modal, .modal-overlay, .modal').forEach(el => {
				console.log('🧹 Removing:', el.className);
				el.remove();
			});
			
			// Clear jumbotron
			const jumbotron = document.getElementById('jumbotron');
			if (jumbotron) {
				jumbotron.innerHTML = '';
				console.log('🧹 Cleared jumbotron');
			}
			
			showBasicToast('success', 'Your match is starting!');
			
			// Start the game after a very short delay (just enough for DOM to settle)
			setTimeout(() => {
				launchNewTournamentMatch(data.tournament, data.match);
			}, 500); // Reduced from 2000ms to 500ms
		} else {
			console.log('👀 Current user is spectating');
			showBasicToast('info', 'A match has started');
		}
	});
	
	// Listen for round started events
	newTournamentService.on('round_started', (data: any) => {
		console.log('🏆 Round started:', data.round);
		showBasicToast('info', `Round ${data.round} has started!`);
	});
	
	// Listen for tournament completed
	newTournamentService.on('tournament_completed', (data: any) => {
		console.log('🏆 Tournament completed:', data);
		showBasicToast('success', `🎉 Tournament complete! Winner: ${data.winner?.name || 'Unknown'}`);
	});

	// Listen for tournament updates to refresh bracket overlay
	newTournamentService.on('tournament_updated', (data: any) => {
		console.log('🏆 Tournament updated:', data);
		// Update any open bracket overlay
		updateBracketOverlay(data.tournament);
	});

	// Listen for tournament errors
	newTournamentService.on('tournament_error', (data: any) => {
		console.error('🏆 Tournament error:', data);
		const errorMessage = data.error || data.message || 'Unknown tournament error';

		if (errorMessage.toLowerCase().includes('not found') ||
		    errorMessage.toLowerCase().includes('does not exist') ||
		    errorMessage.toLowerCase().includes('invalid')) {
			showBasicToast('error', '❌ Tournament not found or invalid code');
		} else {
			showBasicToast('error', `❌ Tournament error: ${errorMessage}`);
		}

		// Return to main menu after 3 seconds
		setTimeout(() => {
			window.dispatchEvent(new CustomEvent('ft:pong:returnToMenu', {
				detail: { reason: 'tournament-error', error: errorMessage }
			}));
		}, 3000);
	});
}

async function updateBracketOverlay(tournament: any): Promise<void> {
	try {
		// Import and update the bracket overlay if it exists
		const { tournamentBracketOverlay } = await import('./components/tournament/TournamentBracketOverlay');
		await tournamentBracketOverlay.updateBracket(tournament.tournamentId || tournament.id);
	} catch (error) {
		console.error('❌ Failed to update bracket overlay:', error);
	}
}


function resetSettingsToDefaults(): void {

    localStorage.removeItem('ft_pong_game_settings');

    simpleThemeManager.resetTheme();
    backgroundThemeManager.resetTheme();
    languageManager.setLanguage('en');

    const settingsComponent = componentInstances.find(c => c.constructor.name === 'SettingsBox');
    if (settingsComponent && 'resetToDefaults' in settingsComponent) {
        (settingsComponent as any).resetToDefaults();
    }
}

function handleGameStartRequest(gameData: any): void {
	console.log('🎮 Handling game start request:', gameData);

	try {
		localStorage.setItem('ft_pong_pending_game', JSON.stringify(gameData));

		showBasicToast('success', 'Game Configuration Saved!');

		setTimeout(() => {
			showBasicToast('info', 'Game Handler Required');
		}, 1500);

	} catch (error) {
		console.error('Error handling game start request:', error);
		showBasicToast('error', 'Game Start Failed');
	}
}

function applyBackendSettingsToManagers(settings: any): void {

    if (settings.theme && settings.theme !== simpleThemeManager.getCurrentTheme()) {
        simpleThemeManager.applyTheme(settings.theme);
    }

    if (settings.backgroundTheme && settings.backgroundTheme !== backgroundThemeManager.getCurrentTheme()) {
        backgroundThemeManager.applyBackgroundTheme(settings.backgroundTheme);
    }

    if (settings.language && settings.language !== languageManager.getCurrentLanguage()) {
        languageManager.setLanguage(settings.language);
    }
}

function updateAuthState(components: Component[]): void {
	const authState = authService.getState();
	const isAuthenticated = authState.isAuthenticated;
	const user = authState.user;

	console.log('🔄 Updating auth state:', { isAuthenticated, user: user?.email, token: authState.token?.substring(0, 20) + '...' });

	addBasicNavbar();

	updateJumbotronButton();

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

function triggerAuthUpdate(isAuthenticated: boolean, user?: any): void {
	window.dispatchEvent(new CustomEvent('auth-state-changed', {
		detail: { isAuthenticated, user }
	}));

	setTimeout(() => {
		addBasicNavbar();
		updateJumbotronButton();

		if (isComponentsLoaded && componentInstances.length > 0) {
			updateAuthState(componentInstances);
		}
	}, 100);
}

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

	hideLoadingScreen();
	document.body.appendChild(errorContainer);
}

let currentGameInstance: any = null;
let currentTournamentHub: any = null;
let currentTournamentData: any = null;

// Show NEW tournament creation modal
async function showTournamentCreationModal() {
  closeBasicModal();
  
  try {
    const { tournamentCreationModal } = await import('./components/tournament/TournamentCreationModal');
    tournamentCreationModal.show();
  } catch (error) {
    console.error('Failed to show tournament creation modal:', error);
    showBasicToast('error', 'Failed to open tournament creation');
  }
}

// Show NEW tournament join modal (simplified - code entry only)
async function showTournamentJoinModal() {
  closeBasicModal();
  
  const modal = document.createElement('div');
  modal.id = 'basic-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm bg-black/75';
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-lime-500">🎯 Join Tournament</h2>
        <button onclick="closeBasicModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-300 mb-2">Tournament Code</label>
        <input 
          type="text" 
          id="tourn-code" 
          maxlength="6" 
          class="input-modern text-center text-2xl font-mono uppercase tracking-widest" 
          placeholder="ABCD12"
          style="letter-spacing: 0.5em;"
        >
        <p class="text-sm text-gray-400 mt-2">Enter the 6-character tournament code</p>
      </div>
      
      <button type="button" onclick="handleTournamentJoin()" class="w-full btn-lime mb-3">
        Join Tournament
      </button>
      <button type="button" onclick="closeBasicModal()" class="w-full btn-outline">
        Cancel
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const input = modal.querySelector('#tourn-code') as HTMLInputElement;
  input?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      (window as any).handleTournamentJoin();
    }
  });
  
  input?.focus();
}

// Handle NEW tournament join
(window as any).handleTournamentJoin = async function() {
  const input = document.querySelector('#tourn-code') as HTMLInputElement;
  if (!input) return;
  
  const code = input.value.trim().toUpperCase();
  if (!code) {
    showBasicToast('error', 'Please enter a tournament code');
    input.focus();
    return;
  }

  if (code.length !== 6) {
    showBasicToast('error', 'Tournament code must be exactly 6 characters');
    input.focus();
    return;
  }

  // Validate that code contains only alphanumeric characters
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    showBasicToast('error', 'Invalid tournament code format. Use only letters and numbers');
    input.focus();
    return;
  }
  
  try {
    closeBasicModal();
    showBasicToast('info', 'Joining tournament...');

    const { newTournamentService } = await import('./tournament/NewTournamentService');

    const tournament = await newTournamentService.joinTournament({ code });

    currentTournamentData = tournament;
    showBasicToast('success', 'Joined tournament!');

    // Show lobby
    const { tournamentLobby } = await import('./components/tournament/TournamentLobby');
    tournamentLobby.show(tournament);
  } catch (error) {
    console.error('Failed to join tournament:', error);
    const errorMessage = (error as Error).message || 'Unknown error';

    // Determine error type and show appropriate message
    let displayMessage = '';

    if (errorMessage.toLowerCase().includes('timed out') ||
        errorMessage.toLowerCase().includes('timeout')) {
      displayMessage = `❌ Connection timeout. Tournament code '${code}' may not exist or server is unavailable`;
    } else if (errorMessage.toLowerCase().includes('not found') ||
               errorMessage.toLowerCase().includes('does not exist') ||
               errorMessage.toLowerCase().includes('invalid')) {
      displayMessage = `❌ Tournament not found. Invalid code: '${code}'`;
    } else if (errorMessage.toLowerCase().includes('full')) {
      displayMessage = '❌ Tournament is full. Cannot join';
    } else if (errorMessage.toLowerCase().includes('already')) {
      displayMessage = '❌ You have already joined this tournament';
    } else if (errorMessage.toLowerCase().includes('closed') ||
               errorMessage.toLowerCase().includes('started')) {
      displayMessage = '❌ Tournament has already started or is closed';
    } else {
      displayMessage = `❌ Failed to join tournament: ${errorMessage}`;
    }

    showBasicToast('error', displayMessage);

    // Show error message for longer duration and return to main menu
    setTimeout(() => {
      console.log('🏠 Returning to main menu after tournament join error');

      // Dispatch event to notify main menu
      window.dispatchEvent(new CustomEvent('ft:pong:returnToMenu', {
        detail: { reason: 'tournament-join-error', error: displayMessage }
      }));

      // Hide any tournament UI that might be showing
      hideBasicModal();
    }, 3000);
  }
};

// Show tournament lobby (waiting room)
async function showTournamentLobby(tournament: any) {
  const jumbotron = document.getElementById('jumbotron');
  if (!jumbotron) return;
  
  const user = authService.getUser();
  const createdBy = tournament?.createdBy || {};
  const userId = user?.id || user?.email || null;
  const createdById = createdBy.id || createdBy.email || null;
  const createdByName = createdBy.name || createdBy.username || createdBy.userName || '';
  const normalizedFullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const isCreator = Boolean(
    user && (
      (createdById && userId && String(createdById) === String(userId)) ||
      (createdByName && (
        createdByName === user.userName ||
        createdByName === user.firstName ||
        (normalizedFullName && createdByName === normalizedFullName)
      ))
    )
  );
  
  // Create lobby structure (without dynamic content)
  jumbotron.innerHTML = `
    <div class="min-h-screen bg-gray-900 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6 border-2 border-lime-500">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h1 class="text-3xl font-bold text-lime-500">${tournament.name}</h1>
              <p class="text-gray-400 mt-2">Tournament Code: <span class="text-white font-mono text-xl">${tournament.tournamentId}</span></p>
            </div>
            <button onclick="exitTournamentLobby()" class="btn-secondary">
              ❌ Leave
            </button>
          </div>
          
          <div id="tournament-stats" class="grid grid-cols-3 gap-4 mt-4">
            <!-- Stats will be updated here -->
          </div>
        </div>
        
        <!-- Players Grid -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 class="text-xl font-bold text-white mb-4">Players in Lobby:</h2>
          <div id="players-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <!-- Players will be added here -->
          </div>
        </div>
        
        <!-- Controls -->
        <div id="tournament-controls" class="bg-gray-800 rounded-lg p-6">
          <!-- Controls will be updated here -->
        </div>
      </div>
    </div>
  `;
  
  // Function to update lobby UI
  const updateLobbyUI = (tournamentData: any) => {
    const spotsRemaining = tournamentData.size - tournamentData.players.length;
    
    // Update stats
    const statsContainer = document.getElementById('tournament-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="bg-gray-700 p-3 rounded">
          <div class="text-gray-400 text-sm">Players</div>
          <div class="text-2xl font-bold text-white">${tournamentData.players.length}/${tournamentData.size}</div>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <div class="text-gray-400 text-sm">Status</div>
          <div class="text-2xl font-bold text-lime-500">${tournamentData.status}</div>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <div class="text-gray-400 text-sm">Spots Left</div>
          <div class="text-2xl font-bold text-orange-500">${spotsRemaining}</div>
        </div>
      `;
    }
    
    // Update controls
    const controlsContainer = document.getElementById('tournament-controls');
    if (controlsContainer) {
      if (spotsRemaining > 0) {
        // Waiting for more players
        controlsContainer.innerHTML = `
          <div class="text-center">
            <div class="bg-orange-500/20 border-2 border-orange-500 rounded-lg p-4 mb-3">
              <p class="text-orange-400 font-bold text-lg mb-2">⏳ Waiting for Players</p>
              <p class="text-gray-300 text-sm">${spotsRemaining} more player${spotsRemaining === 1 ? '' : 's'} needed to start</p>
            </div>
            <p class="text-gray-400 text-sm">Tournament will start automatically when all slots are filled</p>
          </div>
        `;
      } else {
        // Tournament is full - show clickable start button for host
        if (isCreator && tournamentData.status === 'waiting') {
          controlsContainer.innerHTML = `
            <div class="text-center">
              <div class="bg-lime-500/20 border-2 border-lime-500 rounded-lg p-4 mb-3">
                <p class="text-lime-400 font-bold text-lg mb-2">✅ Tournament Full!</p>
                <p class="text-gray-300 text-sm mb-3">All players are ready to play</p>
              </div>
              <button onclick="startTournamentManually()" class="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all transform hover:scale-105 shadow-lg border-2 border-lime-400 animate-pulse" style="box-shadow: 0 0 20px rgba(132, 204, 22, 0.5);">
                🚀 START TOURNAMENT
              </button>
              <p class="text-center text-gray-400 text-sm mt-2">Click to begin the tournament and start games!</p>
            </div>
          `;
        } else {
          // Non-creator or already started
          controlsContainer.innerHTML = `
            <div class="text-center">
              <div class="bg-lime-500/20 border-2 border-lime-500 rounded-lg p-4 mb-3 animate-pulse">
                <p class="text-lime-400 font-bold text-lg mb-2">✅ Tournament Full!</p>
                <p class="text-gray-300 text-sm">${isCreator ? '🚀 Starting tournament...' : 'Waiting for host to start...'}</p>
              </div>
            </div>
          `;
        }
      }
    }
    
    // Update players grid
    updatePlayersGrid(tournamentData);
  };
  
  // Initial render
  updateLobbyUI(tournament);
  
  // Listen for tournament updates
  const { tournamentService } = await import('./tournament/TournamentService');
  
  const updateHandler = async (updatedTournament: any) => {
    if (updatedTournament.tournamentId === tournament.tournamentId) {
      console.log('🔄 Tournament updated:', updatedTournament.players.length, '/', updatedTournament.size);
      
      // Check if tournament just became full
      const wasFull = currentTournamentData && currentTournamentData.players.length === currentTournamentData.size;
      const isFull = updatedTournament.players.length === updatedTournament.size;
      
      currentTournamentData = updatedTournament;

      // Update entire lobby UI
      updateLobbyUI(updatedTournament);
      
      // Notify host when tournament becomes full
      if (!wasFull && isFull && updatedTournament.status === 'waiting' && isCreator) {
        console.log('🏆 Tournament is full!');
        showBasicToast('success', '🎉 Tournament is full! Click START TOURNAMENT to begin.');
      }

      // Check if tournament started
      if (updatedTournament.status === 'active') {
        showBasicToast('success', 'Tournament started!');
        showTournamentBracket(updatedTournament);
      }
    }
  };
  
  const matchStartHandler = (data: any) => {
    console.log('🏆 matchStartHandler called with data:', data);
    if (data.tournament.tournamentId === tournament.tournamentId) {
      console.log('🏆 Match starting for current tournament:', data.match);
      // Check if current user is in this match
      const currentUser = authService.getUser();
      const userId = currentUser?.id || currentUser?.email;
      console.log('🏆 Current user ID:', userId);
      console.log('🏆 Match players:', data.match.player1?.id, data.match.player2?.id);
      
      if (data.match.player1?.id === userId || data.match.player2?.id === userId) {
        console.log('🏆 Current user is in this match! Starting game...');
        showBasicToast('success', 'Your match is starting!');
        // Launch the game
        setTimeout(() => {
          console.log('🏆 Calling launchTournamentMatch...');
          launchTournamentMatch(data.tournament, data.match);
        }, 1000);
      } else {
        console.log('🏆 Current user is not in this match');
      }
    } else {
      console.log('🏆 Match start event for different tournament:', data.tournament.tournamentId);
    }
  };
  
  tournamentService.on('tournamentUpdated', updateHandler);
  tournamentService.on('matchStarted', matchStartHandler);
  
  // Cleanup on exit
  (window as any)._tournamentCleanup = () => {
    tournamentService.off('tournamentUpdated', updateHandler);
    tournamentService.off('matchStarted', matchStartHandler);
  };
}

// Update players grid
function updatePlayersGrid(tournament: any) {
  const grid = document.getElementById('players-grid');
  if (!grid) return;
  
  const spotsRemaining = tournament.size - tournament.players.length;
  
  grid.innerHTML = tournament.players.map((player: any) => `
    <div class="bg-lime-900/30 border-2 border-lime-500 rounded-lg p-4 text-center">
      <div class="text-3xl mb-2">👤</div>
      <div class="text-white font-bold truncate">${player.name}</div>
      <div class="text-xs text-gray-400 mt-1">Player</div>
    </div>
  `).join('') +
  
  Array(spotsRemaining).fill(0).map(() => `
    <div class="bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg p-4 text-center opacity-50">
      <div class="text-3xl mb-2">➕</div>
      <div class="text-gray-500 font-bold">Waiting...</div>
      <div class="text-xs text-gray-600 mt-1">Empty Slot</div>
    </div>
  `).join('');
}

// Manual start function for host
(window as any).startTournamentManually = async function() {
  console.log('🏆 startTournamentManually() called, currentTournamentData:', currentTournamentData);
  if (!currentTournamentData) {
    console.error('🏆 No current tournament data!');
    showBasicToast('error', 'No tournament data available');
    return;
  }
  
  if (currentTournamentData.status !== 'waiting') {
    console.log('🏆 Tournament already started:', currentTournamentData.status);
    showBasicToast('info', 'Tournament already in progress');
    return;
  }
  
  try {
    console.log('🏆 Manually starting tournament:', currentTournamentData.tournamentId);
    showBasicToast('info', 'Starting tournament...');
    
    const { tournamentService } = await import('./tournament/TournamentService');
    const result = await tournamentService.startTournament(currentTournamentData.tournamentId);
    console.log('🏆 Tournament started successfully:', result);
    
    showBasicToast('success', '🚀 Tournament started!');
  } catch (error) {
    console.error('Failed to start tournament:', error);
    showBasicToast('error', `Failed to start tournament: ${(error as Error).message || 'Unknown error'}`);
  }
};

(window as any).exitTournamentLobby = function() {
  if ((window as any)._tournamentCleanup) {
    (window as any)._tournamentCleanup();
  }
  currentTournamentData = null;
  addBasicJumbotron();
};

// Show tournament bracket while waiting
async function showTournamentBracket(tournament: any) {
  const jumbotron = document.getElementById('jumbotron');
  if (!jumbotron) return;

  jumbotron.innerHTML = `
    <div class="min-h-screen bg-gray-900 p-6">
      <div class="max-w-6xl mx-auto">
        <div class="bg-gray-800 rounded-lg p-6 mb-6 border-2 border-lime-500">
          <div class="flex justify-between items-center">
            <h1 class="text-3xl font-bold text-lime-500">${tournament.name}</h1>
            <div class="text-gray-400">Round ${tournament.currentRound}</div>
          </div>
        </div>

        <div id="tournament-bracket" class="bg-gray-800 rounded-lg p-6">
          <!-- Bracket will be rendered here -->
        </div>
      </div>
    </div>
  `;
  
  // Import and render bracket
  try {
    const { TournamentBracket } = await import('./tournament/TournamentBracket');
    const bracketContainer = document.getElementById('tournament-bracket');
    if (bracketContainer) {
      new TournamentBracket(bracketContainer as HTMLElement, tournament);
    }
  } catch (error) {
    console.error('Failed to render bracket:', error);
  }
}

// Launch tournament match
async function launchTournamentMatch(tournament: any, match: any) {
  console.log('🏆 launchTournamentMatch called with tournament:', tournament.tournamentId, 'match:', match.id);
  try {
    const { TournamentMatchService } = await import('./tournament/TournamentMatchService');
    const matchService = TournamentMatchService.getInstance();
    console.log('🏆 TournamentMatchService imported successfully');
    
    const currentUser = authService.getUser();
    console.log('🏆 Current user from authService:', currentUser);
    if (!currentUser) {
      console.error('🏆 No current user found!');
      return;
    }
    
    const currentPlayer = {
      id: currentUser.id || currentUser.email,
      name: currentUser.userName || currentUser.firstName || currentUser.email,
      isOnline: true,
      isAI: false
    };
    console.log('🏆 Current player object:', currentPlayer);
    
    console.log('🏆 Calling matchService.startTournamentMatch...');
    await matchService.startTournamentMatch(
      tournament,
      match,
      currentPlayer,
      async (gameConfig) => {
        console.log('🏆 Game config callback received:', gameConfig);
        
        // Clear jumbotron
        const jumbotron = document.getElementById('jumbotron');
        if (jumbotron) {
          console.log('🏆 Clearing jumbotron for game...');
          jumbotron.innerHTML = `
            <div class="min-h-screen bg-black relative">
              <canvas id="gameCanvas" class="w-full h-full block"></canvas>
            </div>
          `;
        }
        
        // Start the game
        console.log('🏆 Importing Pong3D...');
        const { Pong3D } = await import('./game/core/Pong3D');
        console.log('🏆 Creating Pong3D instance...');
        currentGameInstance = new Pong3D(gameConfig);
        console.log('🏆 Pong3D game started successfully!');
      }
    );
  } catch (error) {
    console.error('Failed to start tournament match:', error);
    showBasicToast('error', 'Failed to start match');
  }
}

// Launch match for NEW tournament system (simplified like Host 2P)
async function launchNewTournamentMatch(tournament: any, match: any) {
  console.log('🎮 launchNewTournamentMatch - Simple approach like Host 2P');
  
  try {
    const currentUser = authService.getUser();
    if (!currentUser) {
      console.error('❌ No current user found!');
      return;
    }
    
    // Determine which player is current user
    const userId = currentUser.id || currentUser.email;
    const isPlayer1 = match.player1?.id === userId || match.player1?.externalId === userId;
    const opponent = isPlayer1 ? match.player2 : match.player1;
    
    console.log('🎮 Starting game - Current user vs', opponent?.name);
    
  // Simple config like Host 2P - NO aggressive UI cleanup, NO canvas manipulation
    const { clearPongUI } = await import('./ui');
    clearPongUI();

    // Prepare jumbotron similar to Host 2P so the canvas sits at the top
    const jumbotron = document.getElementById('jumbotron');
    if (jumbotron) {
      jumbotron.innerHTML = `
        <div class="min-h-screen bg-black relative">
          <canvas id="gameCanvas" class="w-full h-full block"></canvas>
        </div>
      `;
    } else {
      document.getElementById('gameCanvas')?.remove();
    }

    const toastStatus = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      try {
        showBasicToast(type, message);
      } catch (err) {
        console.log(`Toast (${type}):`, message, err);
      }
    };

    let gameConfig: GameConfig;

    try {
      gameConfig = await NewTournamentMatchCoordinator.prepareMatchGameConfig({
        tournament: { id: tournament.id, maxGoals: tournament.maxGoals },
        match,
        onStatus: toastStatus
      });
    } catch (err) {
      console.error('❌ Failed to prepare tournament match config:', err);
      toastStatus('Falling back to local match.', 'error');
      gameConfig = {
        playerCount: 2,
        connection: 'local',
        winScore: tournament.maxGoals || 5,
        currentUser,
        displayNames: [
          currentUser.userName || currentUser.firstName || 'You',
          opponent?.name || 'Opponent'
        ],
        skipCountdown: true,
        tournament: {
          id: tournament.id,
          matchId: match.id,
          round: match.round,
          matchIndex: match.matchIndex || match.matchNumber || 0
        }
      } as GameConfig;
    }

    console.log('🎮 Tournament match game config:', gameConfig);

    CameraConfig.radius = 19;

    const { Pong3D } = await import('./game/core/Pong3D');
    console.log('🎮 Creating Pong3D instance (tournament)...');
    currentGameInstance = new Pong3D(gameConfig);
    
    console.log('✅ Tournament match started!');
    
    // Listen for game end to report results
    // TODO: Implement game end callback to report winner to backend
    
  } catch (error) {
    console.error('❌ Failed to start tournament match:', error);
    showBasicToast('error', 'Failed to start match');
  }
}

// OLD TOURNAMENT HUB - DEPRECATED (Using new modal system instead)
/*
async function launchTournamentHub() {
	console.log('🏆 Launching Tournament Hub...');

	try {
		// Clean up any existing game or tournament
		if (currentGameInstance) {
			await cleanupGame();
		}
		if (currentTournamentHub) {
			currentTournamentHub.destroy?.();
			currentTournamentHub = null;
		}

		// Import tournament UI
		const { TournamentUI } = await import('./tournament/TournamentUI');

		const jumbotron = document.getElementById('jumbotron');
		if (!
			onStartGame: async (gameConfig) => {
				console.log('🏆 Starting tournament game with config:', gameConfig);
				try {
					// Close tournament hub UI
					if (currentTournamentHub) {
						currentTournamentHub.destroy?.();
						currentTournamentHub = null;
					}

					// Start the game with the tournament config
					const { Pong3D } = await import('./game/core/Pong3D');
					currentGameInstance = new Pong3D(gameConfig);
					
					console.log('✅ Tournament game started successfully');
				} catch (error) {
					console.error('❌ Failed to start tournament game:', error);
					showBasicToast('error', 'Failed to start game');
					// Reopen tournament hub on error
					await launchTournamentHub();
				}
			},
			onClose: () => {
				console.log('🏆 Closing tournament hub');
				if (currentTournamentHub) {
					currentTournamentHub.destroy?.();
					currentTournamentHub = null;
				}
				// Return to home
				addBasicJumbotron();
			}
		});

		console.log('✅ Tournament Hub launched successfully');
	} catch (error) {
		console.error('❌ Failed to launch Tournament Hub:', error);
		showBasicToast('error', 'Failed to launch Tournament Hub');
		// Return to home on error
		addBasicJumbotron();
	}
}
*/

async function start3DPongGame() {
	console.log('🎮 Starting 3D Pong game...');

	try {
		if (currentGameInstance) {
			await cleanupGame();
		}

		const { clearPongUI } = await import('../src/ui');
		const { Menu } = await import('../src/menu/MenuController');
		const { Pong3D } = await import('../src/game/core/Pong3D');


		const jumbotron = document.getElementById('jumbotron');
		if (!jumbotron) {
			throw new Error('Jumbotron container not found');
		}

		jumbotron.innerHTML = `
			<div class="min-h-screen bg-black relative">
				<canvas id="gameCanvas" class="w-full h-full block"></canvas>
				<button id="exit-game" class="absolute top-4 left-4 btn-lime z-20">
					← Exit Game
				</button>
			</div>
		`;

		const exitBtn = document.getElementById('exit-game');
		if (exitBtn) {
			exitBtn.addEventListener('click', async () => {
				if (currentGameInstance && typeof currentGameInstance.exitGame === 'function') {
					await currentGameInstance.exitGame();
				} else {
					await cleanupGame();
					addBasicJumbotron();
				}
			});
		}

		clearPongUI();
		const gameConfig = await Menu.render();

		currentGameInstance = new Pong3D(gameConfig);

		console.log('✅ 3D Pong game started successfully');

	} catch (error) {
		console.error('❌ Failed to start 3D Pong game:', error);
		showBasicToast('error', 'Failed to start game');
	}
}

async function cleanupGame() {
	if (currentGameInstance) {
		console.log('🧹 Cleaning up game instance...');

		try {
			if (currentGameInstance && typeof currentGameInstance.dispose === 'function') {
				currentGameInstance.dispose();
			}

			const { clearPongUI } = await import('../src/ui');
			clearPongUI();

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

window.addEventListener('storage', (e) => {
  if (e.key === 'ft_pong_game_settings') {
    languageManager.syncWithSettings();
  }
});

(window as any).updateGlobalTranslations = updateGlobalTranslations;

async function checkBackendStatus() {
  try {
	const endpoint = `${API_BASE_URL}/health`;
    const response = await fetch(endpoint, {
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
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <span>🔌</span>
      <span>Demo Mode - Use demo@ftpong.com / demo123</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">&times;</button>
    </div>
  `;
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 8000);
}

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

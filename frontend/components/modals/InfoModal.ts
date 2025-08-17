// InfoModal.ts - Info modal component with i18n support
import { BaseModal } from './BaseModal';
import { findElement, createElement } from '../../utils/DOMHelpers';
import { t } from '../../langs/LanguageManager';

type InfoType = 'about' | 'project' | 'home';

export class InfoModal extends BaseModal {
  private currentInfoType: InfoType = 'home';

  protected getModalTitle(): string {
    const titles = {
      home: t('Welcome to FT_PONG'),
      about: t('About Us'),
      project: t('Project Information')
    };
    return titles[this.currentInfoType];
  }

  protected getModalClasses(): string {
    // Use larger modal for project carousel
    if (this.currentInfoType === 'project') {
      return 'bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0';
    }
    return super.getModalClasses();
  }

  protected getModalContent(): string {
    switch (this.currentInfoType) {
      case 'about':
        return this.getAboutContent();
      case 'project':
        return this.getProjectContent();
      default:
        return this.getHomeContent();
    }
  }

  protected setupEventListeners(): void {
    const infoCloseBtn = findElement('#info-modal-close');

    if (infoCloseBtn) {
      infoCloseBtn.addEventListener('click', () => this.close());
    }

    // Setup carousel for project modal
    if (this.currentInfoType === 'project') {
      this.setupModuleCarousel();
    }
  }

  /**
   * Get home content
   */
  private getHomeContent(): string {
    return `
      <div class="mb-6 text-gray-300">
        ${t('Welcome to FT_PONG! Get ready for some retro gaming fun!')}
      </div>
      <button id="info-modal-close" class="w-full btn-lime">
        ${t('Close')}
      </button>
    `;
  }

  /**
   * Get about content
   */
  private getAboutContent(): string {
    return `
      <div class="text-left mb-6">
        <p class="mb-4 text-gray-300">${t('We are a team of five passionate 42-Beirut developers collaborating on the FT_TRANSCENDENCE project.')}</p>
        <h4 class="text-lg font-bold text-lime-500 mb-3">${t('Our Team:')}</h4>
        <ul class="list-none space-y-2 text-lime-400">
          <li class="flex items-center space-x-2">
            <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
            <a href="https://github.com/Ali-Fayad" target="_blank" class="hover:underline">${t('Ali Fayad [ Frontend ]')}</a>
          </li>
          <li class="flex items-center space-x-2">
            <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
            <a href="https://github.com/Fouad-Dahouk" target="_blank" class="hover:underline">${t('Fouad Dahouk [ Socket ]')}</a>
          </li>
          <li class="flex items-center space-x-2">
            <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
            <a href="https://github.com/HUSSEINKHRAYZAT" target="_blank" class="hover:underline">${t('Hussein Khrayzat [ Game ]')}</a>
          </li>
          <li class="flex items-center space-x-2">
            <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
            <a href="https://github.com/Husseinchr" target="_blank" class="hover:underline">${t('Hussein Chrief [ DevOps ]')}</a>
          </li>
          <li class="flex items-center space-x-2">
            <img src="https://img.icons8.com/ios-filled/20/ffffff/github.png" alt="GitHub" class="w-5 h-5">
            <a href="https://github.com/younes285" target="_blank" class="hover:underline">${t('Mostafa Younes [ Backend ]')}</a>
          </li>
        </ul>
      </div>
      <button id="info-modal-close" class="w-full btn-lime">
        ${t('Close')}
      </button>
    `;
  }

  /**
   * Get project content with carousel
   */
  private getProjectContent(): string {
    return `
      <div class="text-left">
        <p class="text-gray-300 mb-6">${t('FT_TRANSCENDENCE is a Milestone 6 project at 42 Beirut, designed as a full-stack web application centered around a modern remake of the classic Pong game.')}</p>

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
      <button id="info-modal-close" class="w-full btn-lime mt-6">
        ${t('Close')}
      </button>
    `;
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
          className: `w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ${index === 0 ? 'bg-lime-500' : 'bg-gray-500 hover:bg-gray-400'}`
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
   * Get module data for detailed view
   */
  private getModuleData(module: string): { title: string; content: string } | null {
    const modules: Record<string, { title: string; content: string }> = {
      web: {
        title: t('🌐 Web Module [ 2 / 3 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Use a framework to build the backend.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">✅ ${t('Minor:')}</span> ${t('Use a framework or a toolkit to build the frontend.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">✅ ${t('Minor:')}</span> ${t('Use a database for the backend.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ ${t('Major:')}</span> ${t('Store the score of a tournament in the Blockchain.')}
            </div>
          </div>
        `
      },
      user: {
        title: t('👤 User Management [ 2 / 2 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Standard user management, authentication, users across tournaments.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Implementing a remote authentication.')}
            </div>
          </div>
        `
      },
      gameplay: {
        title: t('🎮 Gameplay [ 3.5 / 4.5 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Remote players can play Pong together.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Multiple players can play Pong at the same time.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">✅ ${t('Minor:')}</span> ${t('Add another game with the same user management.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">🔄 ${t('Minor:')}</span> ${t('Game customization options (half done).')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ ${t('Minor:')}</span> ${t('Live chat during the game.')}
            </div>
          </div>
        `
      },
      ai: {
        title: t('🧠 AI-Algorithm [ 1 / 1.5 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Introduce an AI opponent.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ ${t('Minor:')}</span> ${t('User and AI statistics dashboard.')}
            </div>
          </div>
        `
      },
      security: {
        title: t('🔒 Cybersecurity [ 1 / 2.5 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Implement WAF/ModSecurity with Hardened Configuration.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ ${t('Major:')}</span> ${t('GDPR Compliance Options with User Anonymization.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ ${t('Minor:')}</span> ${t('Implement Two-Factor Authentication (2FA).')}
            </div>
          </div>
        `
      },
      devops: {
        title: t('⚙️ DevOps [ 1 / 2.5 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Infrastructure Setup for Log Management.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ ${t('Major:')}</span> ${t('Designing the Backend as Microservices.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ ${t('Minor:')}</span> ${t('Set up ELK (Elasticsearch, Logstash, Kibana) for log management.')}
            </div>
          </div>
        `
      },
      graphics: {
        title: t('🎨 Graphics [ 1 / 1 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Use of advanced 3D techniques.')}
            </div>
          </div>
        `
      },
      accessibility: {
        title: t('♿ Accessibility [ 1 / 2.5 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">✅ ${t('Major:')}</span> ${t('Support on all devices.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ ${t('Major:')}</span> ${t('Expanding Browser Compatibility.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-blue-400 font-bold">❎ ${t('Minor:')}</span> ${t('Multiple language supports.')}
            </div>
          </div>
        `
      },
      serverside: {
        title: t('🏓 Server-Side Pong [ 0 / 2 ]'),
        content: `
          <div class="text-left space-y-3">
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ ${t('Major:')}</span> ${t('Replace basic Pong with server-side Pong and implement an API.')}
            </div>
            <div class="bg-gray-600 p-3 rounded">
              <span class="text-orange-400 font-bold">❎ ${t('Major:')}</span> ${t('Enabling Pong gameplay via CLI against web users with API integration.')}
            </div>
          </div>
        `
      }
    };

    return modules[module] || null;
  }

  /**
   * Show info modal
   */
  showModal(type: InfoType): void {
    this.currentInfoType = type;
    this.show(`info-${type}`);
  }
}

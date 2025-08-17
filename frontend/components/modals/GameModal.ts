// GameModal.ts - Game modal component with i18n support
import { BaseModal } from './BaseModal';
import { findElement, createElement } from '../../utils/DOMHelpers';
import { t } from '../../langs/LanguageManager';

interface GameConfig {
  type: string;
  status: string | null;
  numberOfPlayers: number;
  difficulty: number;
}

export class GameModal extends BaseModal {
  private currentMode = 0; // 0: Single, 1: Local, 2: Online, 3: Tournament
  private modes = ['single', 'local', 'online', 'tournament'];

  private getTitles() {
    return [
      t('🎮 Single Player'),
      t('🏠 Local Play'),
      t('🌐 Online Play'),
      t('🏆 Tournament')
    ];
  }

  protected getModalTitle(): string {
    return this.getTitles()[this.currentMode];
  }

  protected getModalClasses(): string {
    return 'bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full mx-4 p-6 transform transition-all duration-300 scale-95 opacity-0';
  }

  protected getModalContent(): string {
    return `
      <!-- Navigation -->
      <div class="flex justify-between items-center mb-6">
        <button id="prev-mode" class="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        <div class="flex space-x-2" id="dots-container">
          <div class="w-3 h-3 rounded-full bg-lime-500 dot" data-mode="0"></div>
          <div class="w-3 h-3 rounded-full bg-gray-500 dot" data-mode="1"></div>
          <div class="w-3 h-3 rounded-full bg-gray-500 dot" data-mode="2"></div>
          <div class="w-3 h-3 rounded-full bg-gray-500 dot" data-mode="3"></div>
        </div>

        <button id="next-mode" class="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>

      <!-- Content Container -->
      <div id="mode-content" class="mb-6 min-h-[300px] transition-all duration-300">
        <!-- Content will be dynamically loaded here -->
      </div>

      <!-- Form and Buttons -->
      <form id="play-game-form">
        <div id="game-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>

        <div class="flex space-x-3">
          <button type="button" id="game-cancel" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded transition-all duration-300">
            ${t('Cancel')}
          </button>
          <button type="submit" id="game-start" class="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-bold py-3 px-4 rounded transition-all duration-300">
            ${t('Start Game')}
          </button>
        </div>
      </form>
    `;
  }

  protected setupEventListeners(): void {
    const prevBtn = findElement('#prev-mode');
    const nextBtn = findElement('#next-mode');
    const cancelBtn = findElement('#game-cancel');
    const form = findElement('#play-game-form') as HTMLFormElement;

    // Navigation handlers
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentMode > 0) {
          this.currentMode--;
          this.updateMode();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentMode < this.modes.length - 1) {
          this.currentMode++;
          this.updateMode();
        }
      });
    }

    // Dot navigation
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.currentMode = index;
        this.updateMode();
      });
    });

    // Form handlers
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    if (form) {
      form.addEventListener('submit', (e) => this.handleGameSubmit(e));
    }

    // Initialize first mode
    this.updateMode();
  }

  /**
   * Update mode content and navigation
   */
  private updateMode(): void {
    const modeContent = findElement('#mode-content');
    const modalTitle = findElement('h2');
    const prevBtn = findElement('#prev-mode') as HTMLButtonElement;
    const nextBtn = findElement('#next-mode') as HTMLButtonElement;

    if (!modeContent || !modalTitle) return;

    // Update title
    modalTitle.textContent = this.getTitles()[this.currentMode];

    // Update dots
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
      if (index === this.currentMode) {
        dot.classList.remove('bg-gray-500');
        dot.classList.add('bg-lime-500');
      } else {
        dot.classList.remove('bg-lime-500');
        dot.classList.add('bg-gray-500');
      }
    });

    // Update navigation buttons
    if (prevBtn) prevBtn.disabled = this.currentMode === 0;
    if (nextBtn) nextBtn.disabled = this.currentMode === this.modes.length - 1;

    modeContent.style.opacity = '0';
    setTimeout(() => {
      modeContent.innerHTML = this.getModeContent(this.modes[this.currentMode]);
      modeContent.style.opacity = '1';
      this.setupModeSpecificHandlers(this.modes[this.currentMode]);
    }, 150);
  }

  /**
   * Get content for specific mode
   */
  private getModeContent(mode: string): string {
    switch (mode) {
      case 'single':
        return `
          <div class="space-y-4">
            <div class="text-center mb-4">
              <p class="text-gray-300">${t('Play against AI opponents')}</p>
            </div>

            <div class="bg-gray-700 rounded-lg p-4">
              <label class="block text-sm font-medium text-gray-300 mb-3">${t('AI Players:')}</label>
              <div class="grid grid-cols-3 gap-3">
                <div class="flex items-center space-x-2">
                  <input type="radio" id="ai-1" name="aiPlayers" value="1" class="w-4 h-4 text-lime-500 focus:ring-lime-500" checked>
                  <label for="ai-1" class="text-sm text-gray-300 cursor-pointer">${t('1 AI')}</label>
                </div>
                <div class="flex items-center space-x-2">
                  <input type="radio" id="ai-2" name="aiPlayers" value="2" class="w-4 h-4 text-lime-500 focus:ring-lime-500">
                  <label for="ai-2" class="text-sm text-gray-300 cursor-pointer">${t('2 AI')}</label>
                </div>
                <div class="flex items-center space-x-2">
                  <input type="radio" id="ai-3" name="aiPlayers" value="3" class="w-4 h-4 text-lime-500 focus:ring-lime-500">
                  <label for="ai-3" class="text-sm text-gray-300 cursor-pointer">${t('3 AI')}</label>
                </div>
              </div>
            </div>

            <div class="bg-gray-700 rounded-lg p-4">
              <p class="text-sm text-gray-400">
                <span class="text-lime-500">ℹ️ ${t('Note:')}</span> ${t('AI difficulty will be controlled from game settings')}
              </p>
            </div>
          </div>
        `;

      case 'local':
        return `
          <div class="space-y-4">
            <div class="text-center mb-4">
              <p class="text-gray-300">${t('Play with friends on the same device')}</p>
            </div>

            <div class="bg-gray-700 rounded-lg p-4">
              <label class="block text-sm font-medium text-gray-300 mb-3">${t('Number of Players:')}</label>
              <div class="grid grid-cols-2 gap-4">
                <div class="border-2 border-gray-600 rounded-lg p-3 cursor-pointer transition-all duration-300 hover:border-lime-500" onclick="selectLocalPlayers(2)">
                  <div class="text-center">
                    <input type="radio" id="local-2" name="localPlayers" value="2" class="w-4 h-4 text-lime-500 focus:ring-lime-500 mb-2" checked>
                    <div class="font-bold text-white">${t('👥 2 Players')}</div>
                    <div class="text-sm text-gray-400">${t('Classic 1v1')}</div>
                  </div>
                </div>

                <div class="border-2 border-gray-600 rounded-lg p-3 cursor-pointer transition-all duration-300 hover:border-lime-500" onclick="selectLocalPlayers(4)">
                  <div class="text-center">
                    <input type="radio" id="local-4" name="localPlayers" value="4" class="w-4 h-4 text-lime-500 focus:ring-lime-500 mb-2">
                    <div class="font-bold text-white">${t('👥👥 4 Players')}</div>
                    <div class="text-sm text-gray-400">${t('Tournament style')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

      case 'online':
        return `
          <div class="space-y-4">
            <div class="text-center mb-4">
              <p class="text-gray-300">${t('Invite friends to play online')}</p>
            </div>

            <div class="bg-gray-700 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-300 mb-3">${t('Online Friends:')}</h4>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                <div class="flex items-center justify-between bg-gray-600 p-2 rounded">
                  <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold text-sm">JD</div>
                    <div>
                      <p class="text-sm font-medium text-white">John Doe</p>
                      <p class="text-xs text-green-400">● ${t('Online')}</p>
                    </div>
                  </div>
                  <button type="button" class="bg-lime-500 hover:bg-lime-600 text-white text-xs px-3 py-1 rounded transition-all duration-300" onclick="inviteFriend('john-doe')">
                    ${t('Invite')}
                  </button>
                </div>

                <div class="flex items-center justify-between bg-gray-600 p-2 rounded">
                  <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">AS</div>
                    <div>
                      <p class="text-sm font-medium text-white">Alice Smith</p>
                      <p class="text-xs text-green-400">● ${t('Online')}</p>
                    </div>
                  </div>
                  <button type="button" class="bg-lime-500 hover:bg-lime-600 text-white text-xs px-3 py-1 rounded transition-all duration-300" onclick="inviteFriend('alice-smith')">
                    ${t('Invite')}
                  </button>
                </div>

                <div class="flex items-center justify-between bg-gray-600 p-2 rounded">
                  <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">MB</div>
                    <div>
                      <p class="text-sm font-medium text-white">Mike Brown</p>
                      <p class="text-xs text-green-400">● ${t('Online')}</p>
                    </div>
                  </div>
                  <button type="button" class="bg-lime-500 hover:bg-lime-600 text-white text-xs px-3 py-1 rounded transition-all duration-300" onclick="inviteFriend('mike-brown')">
                    ${t('Invite')}
                  </button>
                </div>
              </div>

              <div id="invited-players" class="mt-4 hidden">
                <p class="text-sm text-lime-400 mb-2">${t('Invited Players:')}</p>
                <div id="invited-list" class="space-y-1"></div>
              </div>
            </div>
          </div>
        `;

      case 'tournament':
        return `
          <div class="space-y-4">
            <div class="text-center mb-4">
              <p class="text-gray-300">${t('Tournament bracket play')}</p>
            </div>

            <div class="bg-gray-700 rounded-lg p-4">
              <label class="block text-sm font-medium text-gray-300 mb-3">${t('Tournament Size:')}</label>
              <div class="grid grid-cols-2 gap-4">
                <div class="border-2 border-gray-600 rounded-lg p-3 cursor-pointer transition-all duration-300 hover:border-lime-500" onclick="selectTournamentSize(4)">
                  <div class="text-center">
                    <input type="radio" id="tournament-4" name="tournamentSize" value="4" class="w-4 h-4 text-lime-500 focus:ring-lime-500 mb-2" checked>
                    <div class="font-bold text-white">${t('🏆 4 Players')}</div>
                    <div class="text-sm text-gray-400">${t('Semi + Final')}</div>
                  </div>
                </div>

                <div class="border-2 border-gray-600 rounded-lg p-3 cursor-pointer transition-all duration-300 hover:border-lime-500" onclick="selectTournamentSize(8)">
                  <div class="text-center">
                    <input type="radio" id="tournament-8" name="tournamentSize" value="8" class="w-4 h-4 text-lime-500 focus:ring-lime-500 mb-2">
                    <div class="font-bold text-white">${t('🏆 8 Players')}</div>
                    <div class="text-sm text-gray-400">${t('Quarter + Semi + Final')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-gray-700 rounded-lg p-4">
              <p class="text-sm text-gray-400">
                <span class="text-lime-500">ℹ️ ${t('Note:')}</span> ${t('Tournament settings will be configured later')}
              </p>
            </div>
          </div>
        `;

      default:
        return `<div class="text-center text-gray-400">${t('Invalid mode')}</div>`;
    }
  }

  private setupModeSpecificHandlers(mode: string): void {
    if (mode === 'online')
    {
      (window as any).inviteFriend = (friendId: string) => {
        console.log('📧 Inviting friend:', friendId);

        setTimeout(() => {
          const invitedSection = findElement('#invited-players');
          const invitedList = findElement('#invited-list');

          if (invitedSection && invitedList) {
            invitedSection.classList.remove('hidden');

            const friendName = friendId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const invitedDiv = createElement('div', {
              className: 'text-sm text-white bg-green-600 px-2 py-1 rounded',
              textContent: `✅ ${friendName} ${t('accepted')}`
            });

            invitedList.appendChild(invitedDiv);
          }

          this.showToast('success', t('Invitation Accepted!'), t('{name} joined the game', { name: friendId.replace('-', ' ') }));
        }, 1000);
      };
    }


    (window as any).selectLocalPlayers = (count: number) => {
      const radios = document.querySelectorAll('[name="localPlayers"]');
      radios.forEach(radio => {
        const container = radio.closest('.border-2');
        if (container) {
          container.classList.remove('border-lime-500');
          container.classList.add('border-gray-600');
        }
      });

      const selectedRadio = document.getElementById(`local-${count}`) as HTMLInputElement;
      if (selectedRadio) {
        selectedRadio.checked = true;
        const container = selectedRadio.closest('.border-2');
        if (container) {
          container.classList.remove('border-gray-600');
          container.classList.add('border-lime-500');
        }
      }
    };

    (window as any).selectTournamentSize = (size: number) => {
      const radios = document.querySelectorAll('[name="tournamentSize"]');
      radios.forEach(radio => {
        const container = radio.closest('.border-2');
        if (container) {
          container.classList.remove('border-lime-500');
          container.classList.add('border-gray-600');
        }
      });

      const selectedRadio = document.getElementById(`tournament-${size}`) as HTMLInputElement;
      if (selectedRadio) {
        selectedRadio.checked = true;
        const container = selectedRadio.closest('.border-2');
        if (container) {
          container.classList.remove('border-gray-600');
          container.classList.add('border-lime-500');
        }
      }
    };
  }

  private handleGameSubmit(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const mode = this.modes[this.currentMode];

    let gameConfig: GameConfig = {
      type: 'single',
      status: null,
      numberOfPlayers: 1,
      difficulty: 0
    };

    switch (mode) {
      case 'single':
        const aiPlayers = formData.get('aiPlayers') as string;
        gameConfig = {
          type: 'single',
          status: null,
          numberOfPlayers: 1,
          difficulty: 0
        };
        break;

      case 'local':
        const localPlayers = formData.get('localPlayers') as string;
        gameConfig = {
          type: 'multi',
          status: 'local',
          numberOfPlayers: parseInt(localPlayers) || 2,
          difficulty: 0
        };
        break;

      case 'online':
        const invitedCount = document.querySelectorAll('#invited-list > div').length;
        gameConfig = {
          type: 'multi',
          status: 'online',
          numberOfPlayers: invitedCount + 1,
          difficulty: 0
        };
        break;

      case 'tournament':
        const tournamentSize = formData.get('tournamentSize') as string;
        gameConfig = {
          type: 'multi',
          status: 'local',
          numberOfPlayers: parseInt(tournamentSize) || 4,
          difficulty: 0
        };
        break;
    }

    console.log('🎮 Game Configuration:', gameConfig);

    this.close();
    this.showToast('success', t('Game Configuration Ready!'), t('{mode} mode configured', { mode }));

    window.dispatchEvent(new CustomEvent('game-start-requested', {
      detail: {
        gameMode: mode,
        config: gameConfig,
        user: this.getCurrentUser()
      }
    }));
  }

  showModal(): void {
    // Check if user is authenticated first
    const authToken = localStorage.getItem('ft_pong_auth_token');
    if (!authToken) {
      console.log('❌ User not authenticated, cannot show game modal');
      this.showToast('error', t('Authentication Required'), t('Please login to play the game'));
      return;
    }

    this.show('play-game');
  }
}

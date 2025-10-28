import { languageManager, t, SUPPORTED_LANGUAGES } from '../../langs/LanguageManager';
import simpleThemeManager from '../../utils/SimpleThemeManager';
import backgroundThemeManager from '../../utils/BackgroundThemeManager';
import {authService} from '../../services/AuthService';

export class SettingsBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;
  private unsubscribeLanguageChange?: () => void;
  private audioPlayer: HTMLAudioElement | null = null;
  private currentTrackIndex: number = 0;
  private isPlaying: boolean = false;
  private playlist = [
    { name: "Peaceful Piano", url: "https://archive.org/download/relaxing-video-game-music-to-listen-to/Bravely%20Default%20OST%20-%20Silence%20of%20the%20Forest.mp3" },
    { name: "Ambient Space", url: "https://archive.org/download/relaxing-video-game-music-to-listen-to/DM%20Dokuro%20-%20Void.mp3" },
    { name: "Retro Chiptune", url: "https://archive.org/download/video-game-music-soundtracks/0-9%20Assorted%20Game%20Themes%20%2815%20min%29.mp3" },
    { name: "Classic Adventure", url: "https://archive.org/download/relaxing-video-game-music-to-listen-to/Ace%20Combat%2004%20OST%20-%20Prelude.mp3" }
  ];

  // Store pending changes
  private pendingTheme: string | null = null;
  private pendingBackgroundTheme: string | null = null;
  private pendingLanguage: string | null = null;

  // Map theme names to image files
  private themeImages: Record<string, string> = {
    'lime': '/boxes/colors/lime.png',
    'purple': '/boxes/colors/purple.png',
    'orange': '/boxes/colors/orange.png',
    'green': '/boxes/colors/green.png',
    'blue': '/boxes/colors/blue.png'
  };

  // Map background theme names to image files
  private backgroundThemeImages: Record<string, string> = {
    'dark': '/boxes/background/Dark.svg',
    'light': '/boxes/background/Light.svg',
    'midnight': '/boxes/background/MidnightBlue.svg',
    'carbon': '/boxes/background/CarbonBlack.svg',
    'ocean': '/boxes/background/Blue.svg',
    'forest': '/boxes/background/Green.svg',
    'crimson': '/boxes/background/Red.svg',
    'cosmic': '/boxes/background/Purple.svg'
  };

  // Map language codes to image files
  private languageImages: Record<string, string> = {
    'en': '/boxes/langs/united-states-of-america.png',
    'fr': '/boxes/langs/france.png',
    'de': '/boxes/langs/germany.png',
    'ar': '/boxes/langs/palestine.png'
  };

  constructor() {
    this.container = document.getElementById('settings-box');
    this.applySavedLanguage();

    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      if (this.isRendered) {
        this.updateContent();
        this.setupEventListeners();
      }
    });

    window.addEventListener('theme-changed', () => {
      if (this.isRendered) {
        this.updateThemeSelector();
      }
    });

    window.addEventListener('background-theme-changed', () => {
      if (this.isRendered) {
        this.updateBackgroundThemeSelector();
      }
    });
  }

  async render(): Promise<void> {
    if (!this.container) {

      return;
    }

    try {
      this.updateContent();
      this.setupEventListeners();
      this.isRendered = true;

    } catch (error) {

    }
  }

  private getMusicPlayerHTML(): string {
    const currentTrack = this.playlist[this.currentTrackIndex];
    return `
      <div class="bg-gray-700 p-4 rounded shadow-md">
        <label class="text-sm font-medium text-gray-300 block mb-2">
          <img src="/boxes/music.png" alt="Music Player" class="inline w-5 h-5 align-middle mr-2" />
          ${t('Music Player')}
        </label>

        <div class="flex items-center justify-between mb-3">
          <!-- Song name -->
          <span class="text-sm font-medium text-gray-300 flex-1 truncate mr-3">${currentTrack.name}</span>

          <!-- Controls -->
          <div class="flex items-center gap-3 text-xl text-gray-300">
            <button id="music-prev-btn" class="hover:text-lime-400 transition disabled:opacity-40">⏮</button>
            <button id="music-play-btn" class="hover:text-lime-400 transition disabled:opacity-40" ${this.isPlaying ? 'style="display:none"' : ''}>▶</button>
            <button id="music-pause-btn" class="hover:text-yellow-400 transition disabled:opacity-40" ${!this.isPlaying ? 'style="display:none"' : ''}>⏸</button>
            <button id="music-stop-btn" class="hover:text-red-400 transition disabled:opacity-40" ${!this.isPlaying ? 'disabled' : ''}>⏹</button>
            <button id="music-next-btn" class="hover:text-lime-400 transition disabled:opacity-40">⏭</button>
          </div>
        </div>

        <!-- Volume -->
        <div class="mt-2">
          <input type="range" id="volume-slider" min="0" max="100" value="50"
            class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-lime-500">
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span class="text-gray-300">${t('Volume')}</span>
          </div>
        </div>

        <!-- Track info -->
        <div class="mt-2 text-xs text-gray-400 text-center">
          ${this.currentTrackIndex + 1} / ${this.playlist.length}
        </div>
      </div>
    `;
  }

  private updateContent(): void {
    if (!this.container) return;

    const authToken = localStorage.getItem('ft_pong_auth_token');
    const userData = localStorage.getItem('ft_pong_user_data');

    if (authToken && userData) {
      this.container.innerHTML = this.getAuthenticatedContent();
    } else {
      this.container.innerHTML = this.getUnauthenticatedContent();
    }
  }

  private getCustomDropdownHTML(
    id: string,
    options: Array<{ value: string; label: string; image: string }>,
    selectedValue: string
  ): string {
    const selectedOption = options.find(opt => opt.value === selectedValue) || options[0];

    return `
      <div class="custom-dropdown relative" id="${id}-dropdown">
        <!-- Selected Display -->
        <button type="button" class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-lime-500 focus:border-lime-500 flex items-center justify-between cursor-pointer hover:bg-gray-500 transition">
          <div class="flex items-center gap-2">
            <img src="${selectedOption.image}" alt="${selectedOption.label}" class="w-5 h-5 object-contain" />
            <span>${selectedOption.label}</span>
          </div>
          <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <!-- Dropdown Options -->
        <div class="dropdown-options absolute z-50 w-full mt-1 bg-gray-600 border border-gray-500 rounded shadow-lg max-h-60 overflow-y-auto hidden">
          ${options.map(option => `
            <div class="dropdown-option px-3 py-2 cursor-pointer hover:bg-gray-500 transition flex items-center gap-2 ${option.value === selectedValue ? 'bg-gray-700' : ''}" data-value="${option.value}">
              <img src="${option.image}" alt="${option.label}" class="w-5 h-5 object-contain" />
              <span class="text-white">${option.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private getAuthenticatedContent(): string {
    const settings = this.loadSettings();
    const availableThemes = simpleThemeManager.getAvailableThemesTranslated();
    const currentTheme = simpleThemeManager.getCurrentTheme();
    const availableBackgroundThemes = backgroundThemeManager.getAvailableThemesTranslated();
    const currentBackgroundTheme = backgroundThemeManager.getCurrentTheme();

    // Use pending values if they exist, otherwise use current values
    const displayTheme = this.pendingTheme || currentTheme;
    const displayBackgroundTheme = this.pendingBackgroundTheme || currentBackgroundTheme;
    const displayLanguage = this.pendingLanguage || settings.language;

    // Prepare options for custom dropdowns
    const themeOptions = availableThemes.map(theme => ({
      value: theme.name,
      label: theme.displayName,
      image: this.themeImages[theme.name] || '/boxes/colors/lime.png'
    }));

    const backgroundThemeOptions = availableBackgroundThemes.map(theme => ({
      value: theme.name,
      label: theme.displayName,
      image: this.backgroundThemeImages[theme.name] || '/boxes/background/Dark.svg'
    }));

    const languageOptions = SUPPORTED_LANGUAGES.map(lang => ({
      value: lang.code,
      label: lang.nativeName,
      image: this.languageImages[lang.code] || '/boxes/langs/united-states-of-america.png'
    }));

    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">
        <img src="/boxes/settings.png" alt="Settings" class="inline w-6 h-6 align-middle mr-2" />
        ${t('Settings')}
      </h3>
      <div class="space-y-4">
        <!-- Accent Color Theme Selector -->
        <div class="bg-gray-700 p-3 rounded">
          <label class="text-sm font-medium text-gray-300 block mb-2">
            <img src="/boxes/accentColors.png" alt="Accent Colors" class="inline w-5 h-5 align-middle mr-2" />
            ${t('Accent Colors')}
          </label>
          ${this.getCustomDropdownHTML('theme-select', themeOptions, displayTheme)}
          <p class="text-xs text-gray-400 mt-1">${t('Choose your preferred accent color scheme')}</p>
        </div>

        <!-- Background Theme Selector -->
        <div class="bg-gray-700 p-3 rounded">
          <label class="text-sm font-medium text-gray-300 block mb-2">
            <img src="/boxes/background.png" alt="Background Theme" class="inline w-5 h-5 align-middle mr-2" />
            ${t('Background Theme')}
          </label>
          ${this.getCustomDropdownHTML('background-theme-select', backgroundThemeOptions, displayBackgroundTheme)}
          <p class="text-xs text-gray-400 mt-1">${t('Choose your preferred background color scheme')}</p>
        </div>

        <!-- Music Player -->
        ${this.getMusicPlayerHTML()}

        <!-- Language Settings -->
        <div class="bg-gray-700 p-3 rounded">
          <label class="text-sm font-medium text-gray-300 block mb-2">
            <img src="/boxes/languages.png" alt="Language" class="inline w-5 h-5 align-middle mr-2" />
            ${t('Language')}
          </label>
          ${this.getCustomDropdownHTML('language-select', languageOptions, displayLanguage)}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-4 flex gap-2">
        <button id="apply-settings" class="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300" ${this.hasPendingChanges() ? '' : 'disabled'}>
          ${t('Apply Changes')}
        </button>
        <button id="cancel-changes" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all duration-300" ${this.hasPendingChanges() ? '' : 'disabled'}>
          ${t('Cancel')}
        </button>
      </div>
    `;
  }

  private getUnauthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">
        <img src="/boxes/settings.png" alt="Settings" class="inline w-6 h-6 align-middle mr-2" />
        ${t('Settings')}
      </h3>
      <p class="text-gray-400 mt-4">${t('Please log in to access settings')}</p>
      <button id="settings-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        ${t('Sign In')}
      </button>
    `;
  }

  private setupCustomDropdown(dropdownId: string, onChange: (value: string) => void): void {
    const dropdown = document.getElementById(`${dropdownId}-dropdown`);
    if (!dropdown) return;

    const button = dropdown.querySelector('button');
    const optionsContainer = dropdown.querySelector('.dropdown-options');
    const options = dropdown.querySelectorAll('.dropdown-option');

    if (!button || !optionsContainer) return;

    // Toggle dropdown
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      optionsContainer.classList.toggle('hidden');

      // Rotate arrow
      const arrow = button.querySelector('svg');
      if (arrow) {
        arrow.classList.toggle('rotate-180');
      }

      // Close other dropdowns
      document.querySelectorAll('.custom-dropdown').forEach(otherDropdown => {
        if (otherDropdown !== dropdown) {
          const otherOptions = otherDropdown.querySelector('.dropdown-options');
          const otherArrow = otherDropdown.querySelector('svg');
          otherOptions?.classList.add('hidden');
          otherArrow?.classList.remove('rotate-180');
        }
      });
    });

    // Select option
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        if (!value) return;

        // Update selected display
        const img = option.querySelector('img')?.cloneNode(true) as HTMLImageElement;
        const text = option.querySelector('span')?.textContent || '';

        const buttonContent = button.querySelector('div');
        if (buttonContent && img) {
          buttonContent.innerHTML = '';
          buttonContent.appendChild(img);
          const span = document.createElement('span');
          span.textContent = text;
          buttonContent.appendChild(span);
        }

        // Update active state
        options.forEach(opt => opt.classList.remove('bg-gray-700'));
        option.classList.add('bg-gray-700');

        // Close dropdown
        optionsContainer.classList.add('hidden');
        const arrow = button.querySelector('svg');
        arrow?.classList.remove('rotate-180');

        // Trigger change
        onChange(value);
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target as Node)) {
        optionsContainer.classList.add('hidden');
        const arrow = button.querySelector('svg');
        arrow?.classList.remove('rotate-180');
      }
    });
  }

  private setupEventListeners(): void {
    const signinBtn = document.getElementById('settings-signin');
    if (signinBtn) {
      signinBtn.addEventListener('click', () => this.showLoginModal());
    }

    // Setup custom dropdowns
    this.setupCustomDropdown('theme-select', (value) => {
      this.pendingTheme = value;
      this.updateApplyButtonState();
    });

    this.setupCustomDropdown('background-theme-select', (value) => {
      this.pendingBackgroundTheme = value;
      this.updateApplyButtonState();
    });

    this.setupCustomDropdown('language-select', (value) => {
      this.pendingLanguage = value;
      this.updateApplyButtonState();
    });

    this.setupMusicEventListeners();

    const applyBtn = document.getElementById('apply-settings');
    const cancelBtn = document.getElementById('cancel-changes');

    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applySettings());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelChanges());
    }
  }

  private setupMusicEventListeners(): void {
    const musicPlayBtn = document.getElementById('music-play-btn');
    const musicPauseBtn = document.getElementById('music-pause-btn');
    const musicStopBtn = document.getElementById('music-stop-btn');
    const musicPrevBtn = document.getElementById('music-prev-btn');
    const musicNextBtn = document.getElementById('music-next-btn');
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

    if (musicPlayBtn) {
      musicPlayBtn.addEventListener('click', () => this.playMusic());
    }

    if (musicPauseBtn) {
      musicPauseBtn.addEventListener('click', () => this.pauseMusic());
    }

    if (musicStopBtn) {
      musicStopBtn.addEventListener('click', () => this.stopMusic());
    }

    if (musicPrevBtn) {
      musicPrevBtn.addEventListener('click', () => this.previousTrack());
    }

    if (musicNextBtn) {
      musicNextBtn.addEventListener('click', () => this.nextTrack());
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt((e.target as HTMLInputElement).value) / 100;
        this.setVolume(volume);
      });
    }
  }

  private hasPendingChanges(): boolean {
    const settings = this.loadSettings();
    const currentTheme = simpleThemeManager.getCurrentTheme();
    const currentBackgroundTheme = backgroundThemeManager.getCurrentTheme();

    return (
      (this.pendingTheme !== null && this.pendingTheme !== currentTheme) ||
      (this.pendingBackgroundTheme !== null && this.pendingBackgroundTheme !== currentBackgroundTheme) ||
      (this.pendingLanguage !== null && this.pendingLanguage !== settings.language)
    );
  }

  private updateApplyButtonState(): void {
    const applyBtn = document.getElementById('apply-settings') as HTMLButtonElement;
    const cancelBtn = document.getElementById('cancel-changes') as HTMLButtonElement;

    if (applyBtn && cancelBtn) {
      const hasChanges = this.hasPendingChanges();
      applyBtn.disabled = !hasChanges;
      cancelBtn.disabled = !hasChanges;
    }
  }

  private async applySettings(): Promise<void> {
    const authToken = localStorage.getItem('ft_pong_auth_token');
    const userData = localStorage.getItem('ft_pong_user_data');

    if (authToken && userData) {
      await this.applyAuthenticatedSettings();
    } else {
      this.applyLocalSettings();
    }
  }

  private async applyAuthenticatedSettings(): Promise<void> {
    const user = authService.getUser();
    if (!user) {

      return;
    }

    const settings = this.loadSettings();

    const backendSettings = {
      username: user.userName,
      languageCode: this.pendingLanguage || settings.language,
      accentColor: this.pendingTheme || settings.theme,
      backgroundTheme: this.pendingBackgroundTheme || settings.backgroundTheme
    };

    try {
      const success = await authService.updateUserSettings(backendSettings);

      if (success) {
        if (this.pendingTheme && this.pendingTheme !== simpleThemeManager.getCurrentTheme()) {
          this.changeTheme(this.pendingTheme);
        }

        if (this.pendingBackgroundTheme && this.pendingBackgroundTheme !== backgroundThemeManager.getCurrentTheme()) {
          this.changeBackgroundTheme(this.pendingBackgroundTheme);
        }

        if (this.pendingLanguage && this.pendingLanguage !== settings.language) {
          this.changeLanguage(this.pendingLanguage);
        }

        this.pendingTheme = null;
        this.pendingBackgroundTheme = null;
        this.pendingLanguage = null;

        this.updateContent();
        this.setupEventListeners();
      }
    } catch (error) {

    }
  }

  private applyLocalSettings(): void {
    const settings = this.loadSettings();

    if (this.pendingTheme && this.pendingTheme !== simpleThemeManager.getCurrentTheme()) {
      this.changeTheme(this.pendingTheme);
      this.saveSettingValue('theme', this.pendingTheme);
    }

    if (this.pendingBackgroundTheme && this.pendingBackgroundTheme !== backgroundThemeManager.getCurrentTheme()) {
      this.changeBackgroundTheme(this.pendingBackgroundTheme);
      this.saveSettingValue('backgroundTheme', this.pendingBackgroundTheme);
    }

    if (this.pendingLanguage && this.pendingLanguage !== settings.language) {
      this.changeLanguage(this.pendingLanguage);
    }

    this.pendingTheme = null;
    this.pendingBackgroundTheme = null;
    this.pendingLanguage = null;

    this.updateContent();
    this.setupEventListeners();

    const message = t('Local settings applied successfully!');
    this.showBasicToast('success', message);
  }

  private loadSettings(): any {
    const authState = authService.getState();

    if (authState.isAuthenticated && authState.settings) {
      return {
        language: authState.settings.language,
        theme: authState.settings.theme,
        backgroundTheme: authState.settings.backgroundTheme
      };
    }

    const defaultSettings = {
      language: languageManager.getCurrentLanguage(),
      theme: simpleThemeManager.getCurrentTheme(),
      backgroundTheme: backgroundThemeManager.getCurrentTheme()
    };

    try {
      const savedSettings = localStorage.getItem('ft_pong_game_settings');
      if (savedSettings) {
        return { ...defaultSettings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {

    }

    return defaultSettings;
  }

  public applyBackendSettings(settings: any): void {
    if (!settings) return;

    if (settings.theme && settings.theme !== simpleThemeManager.getCurrentTheme()) {
      simpleThemeManager.applyTheme(settings.theme);
    }

    if (settings.backgroundTheme && settings.backgroundTheme !== backgroundThemeManager.getCurrentTheme()) {
      backgroundThemeManager.applyBackgroundTheme(settings.backgroundTheme);
    }

    if (settings.language && settings.language !== languageManager.getCurrentLanguage()) {
      languageManager.setLanguage(settings.language);
    }

    if (this.isRendered) {
      this.updateContent();
      this.setupEventListeners();
    }
  }

  private cancelChanges(): void {
    this.pendingTheme = null;
    this.pendingBackgroundTheme = null;
    this.pendingLanguage = null;

    this.updateContent();
    this.setupEventListeners();

    const message = t('Changes have been cancelled');
    this.showBasicToast('info', message);
  }

  private playMusic(): void {
    if (!this.audioPlayer) {
      this.audioPlayer = new Audio();
      this.audioPlayer.loop = true;
      this.audioPlayer.volume = 0.5;
      this.audioPlayer.addEventListener('ended', () => {
        this.nextTrack();
      });

      this.audioPlayer.addEventListener('error', (e) => {

        this.addNotification(t('Failed to play music'), 'error');
        this.isPlaying = false;
        this.updateMusicControls();
      });
    }

    const currentTrack = this.playlist[this.currentTrackIndex];
    this.audioPlayer.src = currentTrack.url;

    this.audioPlayer.play()
      .then(() => {
        this.isPlaying = true;
        this.updateMusicControls();
        this.addNotification(`Now playing: ${currentTrack.name}`, 'success');
      })
      .catch(error => {

        this.addNotification(t('Failed to play music'), 'error');
        this.isPlaying = false;
        this.updateMusicControls();
      });
  }

  private pauseMusic(): void {
    this.isPlaying = false;
    this.updateMusicControls();

    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
    }

    this.addNotification(t('Music paused'), 'info');
  }

  private stopMusic(): void {
    this.isPlaying = false;
    this.updateMusicControls();

    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
    }

    this.addNotification(t('Music stopped'), 'info');
  }

  private previousTrack(): void {
    this.currentTrackIndex = this.currentTrackIndex > 0 ? this.currentTrackIndex - 1 : this.playlist.length - 1;
    this.updateMusicDisplay();

    if (this.isPlaying) {
      this.playMusic();
    }
  }

  private nextTrack(): void {
    this.currentTrackIndex = this.currentTrackIndex < this.playlist.length - 1 ? this.currentTrackIndex + 1 : 0;
    this.updateMusicDisplay();

    if (this.isPlaying) {
      this.playMusic();
    }
  }

  private updateMusicControls(): void {
    const playBtn = document.getElementById('music-play-btn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('music-pause-btn') as HTMLButtonElement;
    const stopBtn = document.getElementById('music-stop-btn') as HTMLButtonElement;

    if (playBtn && pauseBtn && stopBtn) {
      if (this.isPlaying) {
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
      } else {
        playBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        stopBtn.disabled = true;
      }
    }
  }

  private updateMusicDisplay(): void {
    const musicPlayerContainer = this.container?.querySelector('.bg-gray-700.p-4.rounded');
    if (musicPlayerContainer) {
      musicPlayerContainer.innerHTML = this.getMusicPlayerHTML().match(/<div class="bg-gray-700[^>]*">(.*)<\/div>/s)?.[1] || '';
      this.setupMusicEventListeners();
    }
  }

  private setVolume(volume: number): void {
    if (this.audioPlayer) {
      this.audioPlayer.volume = Math.max(0, Math.min(1, volume));
    }
  }

  private changeTheme(themeName: string): void {
    const success = simpleThemeManager.applyTheme(themeName);

    if (success) {
      const theme = simpleThemeManager.getCurrentThemeConfigTranslated();
      const message = `${t('Theme changed to')} ${theme?.displayName}`;

      if ((window as any).modalService?.showToast) {
        (window as any).modalService.showToast('success', t('Theme Changed'), message);
      } else {
        this.addNotification(message, 'success');
      }
    } else {
      const errorMessage = t('Failed to change theme');
      if ((window as any).modalService?.showToast) {
        (window as any).modalService.showToast('error', t('Error'), errorMessage);
      } else {
        this.addNotification(errorMessage, 'error');
      }
    }
  }

  private changeBackgroundTheme(themeName: string): void {
    const success = backgroundThemeManager.applyBackgroundTheme(themeName);

    if (success) {
      const theme = backgroundThemeManager.getCurrentThemeConfigTranslated();
      const message = `${t('Background theme changed to')} ${theme?.displayName}`;

      if ((window as any).modalService?.showToast) {
        (window as any).modalService.showToast('success', t('Background Theme Changed'), message);
      } else {
        this.addNotification(message, 'success');
      }
    } else {
      const errorMessage = t('Failed to change background theme');
      if ((window as any).modalService?.showToast) {
        (window as any).modalService.showToast('error', t('Error'), errorMessage);
      } else {
        this.addNotification(errorMessage, 'error');
      }
    }
  }

  private updateThemeSelector(): void {
    // Re-render to update custom dropdown
    if (this.isRendered) {
      this.updateContent();
      this.setupEventListeners();
    }
  }

  private updateBackgroundThemeSelector(): void {
    // Re-render to update custom dropdown
    if (this.isRendered) {
      this.updateContent();
      this.setupEventListeners();
    }
  }

  updateAuthState(isAuthenticated: boolean, user?: any): void {
    if (!this.isRendered) return;

    if (isAuthenticated && user) {
      const authState = authService.getState();
      if (authState.settings) {
        this.applyBackendSettings(authState.settings);
      }
    } else {
      this.resetToDefaults();
    }

    this.updateContent();
    this.setupEventListeners();
  }

  private resetToDefaults(): void {
    localStorage.removeItem('ft_pong_game_settings');

    simpleThemeManager.resetTheme();
    backgroundThemeManager.resetTheme();
    languageManager.setLanguage('en');

    this.pendingTheme = null;
    this.pendingBackgroundTheme = null;
    this.pendingLanguage = null;
  }

  private saveSettingValue(key: string, value: any): void {
    const settings = this.loadSettings();
    settings[key] = value;

    try {
      localStorage.setItem('ft_pong_game_settings', JSON.stringify(settings));
    } catch (error) {

    }
  }

  private applySavedLanguage(): void {
    const settings = this.loadSettings();
    if (settings.language && settings.language !== languageManager.getCurrentLanguage()) {
      languageManager.setLanguage(settings.language);
    }
  }

  private changeLanguage(languageCode: string): void {
    const langInfoCode = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);

    if (!langInfoCode) return;

    languageManager.setLanguage(langInfoCode.code);
    this.saveSettingValue('language', languageCode);

    const langInfo = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
    const message = `${t('Language changed to')} ${langInfo?.nativeName}`;

    if ((window as any).modalService?.showToast) {
      (window as any).modalService.showToast('success', t('Language Changed'), message);
    } else {
      this.showBasicToast('success', message);
    }
  }

  private addNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    if ((window as any).notifyBox && (window as any).notifyBox.addNotification) {
      (window as any).notifyBox.addNotification(message, type);
    } else {
      this.showBasicToast(type, message);
    }
  }

  private showBasicToast(type: 'success' | 'info' | 'error', message: string): void {
    const colors = {
      success: 'bg-green-600',
      info: 'bg-blue-600',
      error: 'bg-red-600'
    };

    const icons = {
      success: '✅',
      info: 'ℹ️',
      error: '❌'
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

  private showLoginModal(): void {

    if ((window as any).modalService?.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {

      alert('Login - Modal service not loaded');
    }
  }

  getSettings(): any {
    return this.loadSettings();
  }

  getCurrentLanguage(): string {
    return languageManager.getCurrentLanguage();
  }

  destroy(): void {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }

    this.isPlaying = false;
    this.currentTrackIndex = 0;

    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
    }

    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isRendered = false;

  }
}

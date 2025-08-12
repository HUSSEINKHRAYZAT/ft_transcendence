import { languageManager, t, SUPPORTED_LANGUAGES } from '../../langs/LanguageManager';

export class SettingsBox
{
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;
  private unsubscribeLanguageChange?: () => void;

  constructor() {
    this.container = document.getElementById('settings-box');
    this.applySavedLanguage();

    this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
      if (this.isRendered) {
        this.updateContent();
        this.setupEventListeners();
      }
    });
  }

  async render(): Promise<void> {
    if (!this.container) {
      console.error('❌ Settings box container not found');
      return;
    }

    console.log('⚙️ Rendering SettingsBox component...');

    try {
      this.updateContent();
      this.setupEventListeners();
      this.isRendered = true;
      console.log('✅ SettingsBox component rendered successfully');
    } catch (error) {
      console.error('❌ Error rendering SettingsBox:', error);
    }
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

  private getAuthenticatedContent(): string {
    const settings = this.loadSettings();

    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">⚙️ ${t('Settings')}</h3>
      <div class="space-y-4">
        <div class="bg-gray-700 p-3 rounded">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300">${t('Sound Effects')}</label>
            <input type="checkbox" id="sound-toggle" ${settings.soundEnabled ? 'checked' : ''}
                   class="toggle-checkbox bg-gray-600 border-gray-500 rounded focus:ring-lime-500">
          </div>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300">${t('Background Music')}</label>
            <input type="checkbox" id="music-toggle" ${settings.musicEnabled ? 'checked' : ''}
                   class="toggle-checkbox bg-gray-600 border-gray-500 rounded focus:ring-lime-500">
          </div>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <label class="text-sm font-medium text-gray-300 block mb-2">${t('Game Difficulty')}</label>
          <select id="difficulty-select" class="w-full bg-gray-600 border border-gray-500 rounded text-white p-2 focus:border-lime-500 focus:ring-1 focus:ring-lime-500">
            <option value="easy" ${settings.difficulty === 'easy' ? 'selected' : ''}>${t('Easy')}</option>
            <option value="medium" ${settings.difficulty === 'medium' ? 'selected' : ''}>${t('Medium')}</option>
            <option value="hard" ${settings.difficulty === 'hard' ? 'selected' : ''}>${t('Hard')}</option>
            <option value="expert" ${settings.difficulty === 'expert' ? 'selected' : ''}>${t('Expert')}</option>
          </select>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <label class="text-sm font-medium text-gray-300 block mb-2">${t('Language')}</label>
          <select id="language-select" class="w-full bg-gray-600 border border-gray-500 rounded text-white p-2 focus:border-lime-500 focus:ring-1 focus:ring-lime-500">
            ${SUPPORTED_LANGUAGES.map(lang => `
              <option value="${lang.code}" ${settings.language === lang.code ? 'selected' : ''}>
                ${lang.flag} ${lang.nativeName}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300">${t('Animations')}</label>
            <input type="checkbox" id="animations-toggle" ${settings.animationsEnabled !== false ? 'checked' : ''}
                   class="toggle-checkbox bg-gray-600 border-gray-500 rounded focus:ring-lime-500">
          </div>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button id="save-settings" class="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
          ${t('Save Settings')}
        </button>
        <button id="reset-settings" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all duration-300">
          ${t('Reset')}
        </button>
      </div>
    `;
  }

  private getUnauthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">⚙️ ${t('Settings')}</h3>
      <p class="text-gray-400">${t('Please log in to access settings')}</p>
      <button id="settings-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        ${t('Sign In')}
      </button>
    `;
  }

  private setupEventListeners(): void {
    const signinBtn = document.getElementById('settings-signin');
    const soundToggle = document.getElementById('sound-toggle') as HTMLInputElement;
    const musicToggle = document.getElementById('music-toggle') as HTMLInputElement;
    const animationsToggle = document.getElementById('animations-toggle') as HTMLInputElement;
    const difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;
    const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
    const saveBtn = document.getElementById('save-settings');
    const resetBtn = document.getElementById('reset-settings');

    if (signinBtn) {
      signinBtn.addEventListener('click', () => this.showLoginModal());
    }

    if (soundToggle) {
      soundToggle.addEventListener('change', () => this.updateSetting('soundEnabled', soundToggle.checked));
    }

    if (musicToggle) {
      musicToggle.addEventListener('change', () => this.updateSetting('musicEnabled', musicToggle.checked));
    }

    if (animationsToggle) {
      animationsToggle.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        this.updateSetting('animationsEnabled', enabled);
        this.toggleAnimations(enabled);
      });
    }

    if (difficultySelect) {
      difficultySelect.addEventListener('change', () => this.updateSetting('difficulty', difficultySelect.value));
    }

    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        const language = (e.target as HTMLSelectElement).value as any;
        console.log(`🌍 Language selection changed to: ${language}`);

        // Update setting first
        this.updateSetting('language', language);

        // Then update language manager (this will trigger UI updates)
        languageManager.setLanguage(language);

        // Show notification
        this.showLanguageChangeNotification(language);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }
  }

  private loadSettings(): any {
    const defaultSettings = {
      soundEnabled: true,
      musicEnabled: true,
      animationsEnabled: true,
      difficulty: 'medium',
      language: 'eng'
    };

    try {
      const saved = localStorage.getItem('ft_pong_game_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        return { ...defaultSettings, ...parsedSettings };
      }
      return defaultSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  }

  private updateSetting(key: string, value: any): void {
    const settings = this.loadSettings();
    settings[key] = value;
    localStorage.setItem('ft_pong_game_settings', JSON.stringify(settings));
    console.log(`⚙️ Setting updated: ${key} = ${value}`);
  }

  private applySavedLanguage(): void {
    const settings = this.loadSettings();
    if (settings.language && languageManager.getCurrentLanguage() !== settings.language) {
      languageManager.setLanguage(settings.language);
    }
    console.log(`🌍 Applied saved language: ${settings.language}`);
  }

  private showLanguageChangeNotification(language: string): void {
    const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === language);
    if (!langInfo) return;

    const message = `${t('Language changed to')} ${langInfo.nativeName}`;

    if ((window as any).modalService?.showToast) {
      (window as any).modalService.showToast('success', t('Language Changed'), message);
    } else {
      // Fallback notification
      this.showBasicToast('success', message);
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

  private toggleAnimations(enabled: boolean): void {
    if (enabled) {
      document.body.classList.remove('no-animations');
    } else {
      document.body.classList.add('no-animations');
    }
  }

  private saveSettings(): void {
    const message = t('All settings have been saved successfully!');

    if ((window as any).modalService?.showToast) {
      (window as any).modalService.showToast('success', t('Settings Saved'), message);
    } else {
      alert(message);
    }
  }

  private resetSettings(): void {
    const confirmMessage = t('Are you sure you want to reset all settings to default?');

    if (confirm(confirmMessage)) {
      localStorage.removeItem('ft_pong_game_settings');
      this.toggleAnimations(true);

      // Reset language to default
      languageManager.setLanguage('eng');

      this.updateContent();
      this.setupEventListeners();

      const message = t('All settings have been reset to default values.');

      if ((window as any).modalService?.showToast) {
        (window as any).modalService.showToast('info', t('Settings Reset'), message);
      } else {
        alert(message);
      }
    }
  }

  private showLoginModal(): void {
    console.log('🔍 SettingsBox: Trying to show login modal');
    if ((window as any).modalService?.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      console.error('❌ Modal service not available');
      alert('Login - Modal service not loaded');
    }
  }

  updateAuthState(isAuthenticated: boolean): void {
    if (!this.isRendered) return;
    this.updateContent();
    this.setupEventListeners();
  }

  getSettings(): any {
    return this.loadSettings();
  }

  getCurrentLanguage(): string {
    return languageManager.getCurrentLanguage();
  }

  destroy(): void {
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
    }

    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isRendered = false;
    console.log('🧹 SettingsBox component destroyed');
  }
}

/**
 * Settings box component for FT_PONG
 */
export class SettingsBox {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;

  constructor() {
    this.container = document.getElementById('settings-box');
  }

  /**
   * Render the settings box
   */
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

  /**
   * Update content based on authentication state
   */
  private updateContent(): void {
    if (!this.container) return;

    const authToken = localStorage.getItem('ft_pong_auth_token');
    const userData = localStorage.getItem('ft_pong_user_data');

    if (authToken && userData) {
      // User is logged in - show settings
      this.container.innerHTML = this.getAuthenticatedContent();
    } else {
      // User is not logged in - show login prompt
      this.container.innerHTML = this.getUnauthenticatedContent();
    }
  }

  /**
   * Get content for authenticated users
   */
  private getAuthenticatedContent(): string {
    const settings = this.loadSettings();

    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">⚙️ Settings</h3>
      <div class="space-y-4">
        <div class="bg-gray-700 p-3 rounded">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300">Sound Effects</label>
            <input type="checkbox" id="sound-toggle" ${settings.soundEnabled ? 'checked' : ''}
                   class="toggle-checkbox bg-gray-600 border-gray-500 rounded focus:ring-lime-500">
          </div>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300">Background Music</label>
            <input type="checkbox" id="music-toggle" ${settings.musicEnabled ? 'checked' : ''}
                   class="toggle-checkbox bg-gray-600 border-gray-500 rounded focus:ring-lime-500">
          </div>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <label class="text-sm font-medium text-gray-300 block mb-2">Game Difficulty</label>
          <select id="difficulty-select" class="w-full bg-gray-600 border border-gray-500 rounded text-white p-2 focus:border-lime-500 focus:ring-1 focus:ring-lime-500">
            <option value="easy" ${settings.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
            <option value="medium" ${settings.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard" ${settings.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
            <option value="expert" ${settings.difficulty === 'expert' ? 'selected' : ''}>Expert</option>
          </select>
        </div>
        <div class="bg-gray-700 p-3 rounded">
          <label class="text-sm font-medium text-gray-300 block mb-2">Theme</label>
          <select id="theme-select" class="w-full bg-gray-600 border border-gray-500 rounded text-white p-2 focus:border-lime-500 focus:ring-1 focus:ring-lime-500">
            <option value="lime" ${settings.theme === 'lime' ? 'selected' : ''}>Lime (Default)</option>
            <option value="classic" ${settings.theme === 'classic' ? 'selected' : ''}>Classic</option>
            <option value="neon" ${settings.theme === 'neon' ? 'selected' : ''}>Neon</option>
            <option value="retro" ${settings.theme === 'retro' ? 'selected' : ''}>Retro</option>
          </select>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button id="save-settings" class="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
          Save Settings
        </button>
        <button id="reset-settings" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all duration-300">
          Reset
        </button>
      </div>
    `;
  }

  /**
   * Get content for unauthenticated users
   */
  private getUnauthenticatedContent(): string {
    return `
      <h3 class="text-xl font-bold mb-4 text-lime-500">⚙️ Settings</h3>
      <p class="text-gray-400">Please log in to access settings</p>
      <button id="settings-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
        Sign In
      </button>
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const signinBtn = document.getElementById('settings-signin');
    const soundToggle = document.getElementById('sound-toggle') as HTMLInputElement;
    const musicToggle = document.getElementById('music-toggle') as HTMLInputElement;
    const difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
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

    if (difficultySelect) {
      difficultySelect.addEventListener('change', () => this.updateSetting('difficulty', difficultySelect.value));
    }

    if (themeSelect) {
      themeSelect.addEventListener('change', () => this.updateSetting('theme', themeSelect.value));
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): any {
    const defaultSettings = {
      soundEnabled: true,
      musicEnabled: true,
      difficulty: 'medium',
      theme: 'lime'
    };

    try {
      const saved = localStorage.getItem('ft_pong_game_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  }

  /**
   * Update a specific setting
   */
  private updateSetting(key: string, value: any): void {
    const settings = this.loadSettings();
    settings[key] = value;
    localStorage.setItem('ft_pong_game_settings', JSON.stringify(settings));
  }

  /**
   * Save all settings
   */
  private saveSettings(): void {
    // Settings are already saved on change, this is just for user feedback
    alert('Settings saved successfully!');
  }

  /**
   * Reset settings to default
   */
  private resetSettings(): void {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      localStorage.removeItem('ft_pong_game_settings');
      this.updateContent();
      this.setupEventListeners();
      alert('Settings reset to default!');
    }
  }

  /**
   * Show login modal
   */
  private showLoginModal(): void {
    console.log('🔍 SettingsBox: Trying to show login modal');
    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {
      console.error('❌ Modal service not available');
      alert('Login - Modal service not loaded');
    }
  }

  /**
   * Update based on authentication state
   */
  updateAuthState(isAuthenticated: boolean): void {
    if (!this.isRendered) return;
    this.updateContent();
    this.setupEventListeners();
  }

  /**
   * Get current settings
   */
  getSettings(): any {
    return this.loadSettings();
  }

  /**
   * Apply theme changes
   */
  private applyTheme(theme: string): void {
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
  }

  /**
   * Cleanup component resources
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isRendered = false;
    console.log('🧹 SettingsBox component destroyed');
  }
}

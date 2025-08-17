// src/langs/LanguageManager.ts
export type SupportedLanguage = 'eng' | 'fr' | 'de';

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

// Available languages matching your SettingsBox
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'eng', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'eng';

/**
 * Simple LanguageManager class
 */
export class LanguageManager {
  private currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
  private listeners: ((language: SupportedLanguage) => void)[] = [];
  private translations: Record<SupportedLanguage, Record<string, string>> = {
    eng: {},
    fr: {},
    de: {}
  };

  constructor() {
    this.loadStoredLanguage();
    this.loadTranslations();
    console.log(`🌍 LanguageManager initialized with language: ${this.currentLanguage}`);
  }

  /**
   * Load translations from JSON files
   */
  private async loadTranslations(): Promise<void> {
    try {
      // Import your existing translation files
      const [enTranslations, frTranslations, deTranslations] = await Promise.all([
        import('./en.json'),
        import('./fr.json'),
        import('./de.json')
      ]);

      this.translations.eng = enTranslations.default || enTranslations;
      this.translations.fr = frTranslations.default || frTranslations;
      this.translations.de = deTranslations.default || deTranslations;

      console.log('✅ Translation files loaded successfully');
    } catch (error) {
      console.error('❌ Error loading translation files:', error);
    }
  }

  /**
   * Load language preference from settings
   */
  private loadStoredLanguage(): void {
    try {
      // Check game settings first (to sync with your SettingsBox)
      const gameSettings = localStorage.getItem('ft_pong_game_settings');
      if (gameSettings) {
        const settings = JSON.parse(gameSettings);
        if (settings.language && this.isValidLanguage(settings.language)) {
          this.currentLanguage = settings.language;
          return;
        }
      }

      // Fallback to browser language detection
      const browserLang = this.detectBrowserLanguage();
      if (browserLang) {
        this.currentLanguage = browserLang;
      }
    } catch (error) {
      console.warn('Failed to load stored language:', error);
    }
  }

  /**
   * Detect browser language
   */
  private detectBrowserLanguage(): SupportedLanguage | null {
    try {
      const browserLang = navigator.language.toLowerCase();

      if (browserLang.startsWith('fr')) return 'fr';
      if (browserLang.startsWith('de')) return 'de';
      if (browserLang.startsWith('en')) return 'eng';

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if language is valid
   */
  private isValidLanguage(lang: string): lang is SupportedLanguage {
    return SUPPORTED_LANGUAGES.some(l => l.code === lang);
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  setLanguage(language: SupportedLanguage): void {
    if (!this.isValidLanguage(language)) {
      console.error(`Invalid language: ${language}`);
      return;
    }

    const previousLanguage = this.currentLanguage;
    this.currentLanguage = language;

    // Update game settings to sync with SettingsBox
    try {
      const gameSettings = localStorage.getItem('ft_pong_game_settings');
      let settings = {};

      if (gameSettings) {
        settings = JSON.parse(gameSettings);
      }

      settings = { ...settings, language };
      localStorage.setItem('ft_pong_game_settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }

    console.log(`🌍 Language changed from ${previousLanguage} to ${language}`);

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(language);
      } catch (error) {
        console.error('Error in language change listener:', error);
      }
    });

    // Dispatch global event
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: {
        language,
        previousLanguage,
        languageInfo: this.getLanguageInfo(language)
      }
    }));
  }

  /**
   * Add language change listener
   */
  onLanguageChange(listener: (language: SupportedLanguage) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get translation for a key
   */
  t(key: string, replacements?: Record<string, string | number>): string {
    const translation = this.translations[this.currentLanguage][key];

    if (translation === undefined) {
      // Fallback to English if translation not found
      const fallback = this.translations.eng[key];
      if (fallback === undefined) {
        console.warn(`Translation not found for key: ${key}`);
        return key; // Return the key itself as last resort
      }
      return this.replaceVariables(fallback, replacements);
    }

    return this.replaceVariables(translation, replacements);
  }

  /**
   * Replace variables in translation string
   */
  private replaceVariables(text: string, replacements?: Record<string, string | number>): string {
    if (!replacements) return text;

    return Object.entries(replacements).reduce((result, [key, value]) => {
      const placeholder = `{${key}}`;
      return result.replace(new RegExp(placeholder, 'g'), String(value));
    }, text);
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Get language info by code
   */
  getLanguageInfo(code: SupportedLanguage): LanguageOption | undefined {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  }

  /**
   * Check if translation exists
   */
  hasTranslation(key: string, language?: SupportedLanguage): boolean {
    const lang = language || this.currentLanguage;
    return this.translations[lang][key] !== undefined;
  }

  /**
   * Sync with settings changes (called from SettingsBox)
   */
  syncWithSettings(): void {
    try {
      const gameSettings = localStorage.getItem('ft_pong_game_settings');
      if (gameSettings) {
        const settings = JSON.parse(gameSettings);
        if (settings.language && this.isValidLanguage(settings.language) && settings.language !== this.currentLanguage) {
          this.setLanguage(settings.language);
        }
      }
    } catch (error) {
      console.error('Error syncing with settings:', error);
    }
  }
}

export const languageManager = new LanguageManager();

export const t = (key: string, replacements?: Record<string, string | number>): string => {
  return languageManager.t(key, replacements);
};

declare global {
  interface Window {
    languageManager: LanguageManager;
    t: typeof t;
  }
}

window.languageManager = languageManager;
window.t = t;

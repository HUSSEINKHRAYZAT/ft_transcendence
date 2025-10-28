// src/langs/LanguageManager.ts
import enTranslations from './en.json';

export type SupportedLanguage = 'en' | 'fr' | 'de' | 'ar';

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

// Available languages matching your SettingsBox
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export class LanguageManager {
  private currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
  private listeners: ((language: SupportedLanguage) => void)[] = [];
  private translations: Record<SupportedLanguage, Record<string, string>> = {
    en: enTranslations as Record<string, string>,
    fr: {},
    de: {},
    ar: {}
  };
  private translationsLoaded = false;
  private translationsReadyPromise: Promise<void>;
  private resolveTranslationsReady!: () => void;

  constructor() {
    this.translationsReadyPromise = new Promise((resolve) => {
      this.resolveTranslationsReady = resolve;
    });

    this.loadStoredLanguage();
    void this.loadTranslations();

  }

  private async loadTranslations(): Promise<void> {
    try {
      const [frTranslations, deTranslations, arTranslations] = await Promise.all([
        import('./fr.json'),
        import('./de.json'),
        import('./ar.json')
      ]);

      this.translations.fr = frTranslations.default || frTranslations;
      this.translations.de = deTranslations.default || deTranslations;
      this.translations.ar = arTranslations.default || arTranslations;

      this.translationsLoaded = true;
      this.resolveTranslationsReady();

      // Trigger subscribers so they can refresh content with fully loaded translations
      this.listeners.forEach(listener => {
        try {
          listener(this.currentLanguage);
        } catch (error) {

        }
      });

      window.dispatchEvent(new CustomEvent('languageResourcesReady', {
        detail: { language: this.currentLanguage }
      }));

    } catch (error) {

      this.translationsLoaded = true;
      this.resolveTranslationsReady();
    }
  }

  private loadStoredLanguage(): void {
    try {
      const gameSettings = localStorage.getItem('ft_pong_game_settings');
      if (gameSettings) {
        const settings = JSON.parse(gameSettings);
        if (settings.language && this.isValidLanguage(settings.language)) {
          this.currentLanguage = settings.language;
          return;
        }
      }

      const browserLang = this.detectBrowserLanguage();
      if (browserLang) {
        this.currentLanguage = browserLang;
      }
    } catch (error) {

    }
  }

  private detectBrowserLanguage(): SupportedLanguage | null {
    try {
      const browserLang = navigator.language.toLowerCase();

      if (browserLang.startsWith('fr')) return 'fr';
      if (browserLang.startsWith('de')) return 'de';
      if (browserLang.startsWith('en')) return 'en';

      return null;
    } catch {
      return null;
    }
  }

  private isValidLanguage(lang: string): lang is SupportedLanguage {
    return SUPPORTED_LANGUAGES.some(l => l.code === lang);
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  setLanguage(language: SupportedLanguage): void {
    if (!this.isValidLanguage(language)) {

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

    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(language);
      } catch (error) {

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

  onLanguageChange(listener: (language: SupportedLanguage) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  t(key: string, replacements?: Record<string, string | number>): string {
    const translation = this.translations[this.currentLanguage][key];

    if (translation === undefined) {
      const fallback = this.translations.en[key];
      if (fallback === undefined) {
        if (this.translationsLoaded) {

        }
        return key;
      }
      return this.replaceVariables(fallback, replacements);
    }

    return this.replaceVariables(translation, replacements);
  }

  private replaceVariables(text: string, replacements?: Record<string, string | number>): string {
    if (!replacements) return text;

    return Object.entries(replacements).reduce((result, [key, value]) => {
      const placeholder = `{${key}}`;
      return result.replace(new RegExp(placeholder, 'g'), String(value));
    }, text);
  }

  getAvailableLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }

  getLanguageInfo(code: SupportedLanguage): LanguageOption | undefined {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  }

  hasTranslation(key: string, language?: SupportedLanguage): boolean {
    const lang = language || this.currentLanguage;
    return this.translations[lang][key] !== undefined;
  }

  translateIfAvailable(key: string, replacements?: Record<string, string | number>, language?: SupportedLanguage): string | null {
    const lang = language || this.currentLanguage;
    const current = this.translations[lang]?.[key];
    if (current !== undefined) {
      return this.replaceVariables(current, replacements);
    }

    const fallback = this.translations.en?.[key];
    if (fallback !== undefined) {
      return this.replaceVariables(fallback, replacements);
    }

    return null;
  }

  async whenReady(): Promise<void> {
    if (this.translationsLoaded) return;
    await this.translationsReadyPromise;
  }

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

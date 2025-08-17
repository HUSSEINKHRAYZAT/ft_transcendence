interface ThemeColors {
  [key: string]: {
    [shade: string]: string;
  };
}

interface ThemeMappings {
  [originalClass: string]: string;
}

interface ThemeConfig {
  name: string;
  displayName: string;
  language: string;
  colors: ThemeColors;
  mappings: ThemeMappings;
  cssVariables: { [key: string]: string };
}

class ThemeManager {
  private currentTheme: ThemeConfig | null = null;
  private themeStyleElement: HTMLStyleElement | null = null;
  private availableThemes: Map<string, ThemeConfig> = new Map();

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    // Create style element for dynamic theme CSS
    this.themeStyleElement = document.createElement('style');
    this.themeStyleElement.id = 'dynamic-theme-styles';
    document.head.appendChild(this.themeStyleElement);

    // Load available themes
    await this.loadThemes();

    console.log('🎨 Theme Manager initialized');
  }

  async loadThemes(): Promise<void> {
    const themeFiles = ['default', 'red']; // Add more themes here

    for (const themeName of themeFiles) {
      try {
        const response = await fetch(`/themes/${themeName}.json`);
        if (response.ok) {
          const themeConfig: ThemeConfig = await response.json();
          this.availableThemes.set(themeName, themeConfig);
          console.log(`✅ Loaded theme: ${themeConfig.displayName}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load theme ${themeName}:`, error);
      }
    }
  }

  getThemeByLanguage(language: string): ThemeConfig | null {
    for (const theme of this.availableThemes.values()) {
      if (theme.language === language) {
        return theme;
      }
    }
    return null;
  }

  getThemeByName(name: string): ThemeConfig | null {
    return this.availableThemes.get(name) || null;
  }

  applyTheme(themeConfig: ThemeConfig): void {
    if (!this.themeStyleElement) {
      console.error('Theme style element not initialized');
      return;
    }

    this.currentTheme = themeConfig;

    // Generate CSS for the theme
    const css = this.generateThemeCSS(themeConfig);

    // Apply the CSS
    this.themeStyleElement.textContent = css;

    // Store current theme in localStorage
    localStorage.setItem('ft_pong_current_theme', themeConfig.name);

    console.log(`🎨 Applied theme: ${themeConfig.displayName}`);

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme: themeConfig }
    }));
  }

  applyThemeByLanguage(language: string): boolean {
    const theme = this.getThemeByLanguage(language);
    if (theme) {
      this.applyTheme(theme);
      return true;
    }
    console.warn(`No theme found for language: ${language}`);
    return false;
  }

  applyThemeByName(name: string): boolean {
    const theme = this.getThemeByName(name);
    if (theme) {
      this.applyTheme(theme);
      return true;
    }
    console.warn(`No theme found with name: ${name}`);
    return false;
  }

  getCurrentTheme(): ThemeConfig | null {
    return this.currentTheme;
  }

  getAvailableThemes(): ThemeConfig[] {
    return Array.from(this.availableThemes.values());
  }

  private generateThemeCSS(themeConfig: ThemeConfig): string {
    let css = `
/* Dynamic Theme: ${themeConfig.displayName} */
:root {
`;

    // Add CSS variables
    for (const [variable, value] of Object.entries(themeConfig.cssVariables)) {
      css += `  ${variable}: ${value};\n`;
    }

    css += '}\n\n';

    // Generate Tailwind utility class overrides
    for (const [originalClass, mappedClass] of Object.entries(themeConfig.mappings)) {
      const [colorName, shade] = mappedClass.split('-');
      const colorValue = themeConfig.colors[colorName]?.[shade];

      if (colorValue) {
        // Background colors
        css += `.bg-${originalClass} { background-color: ${colorValue} !important; }\n`;

        // Text colors
        css += `.text-${originalClass} { color: ${colorValue} !important; }\n`;

        // Border colors
        css += `.border-${originalClass} { border-color: ${colorValue} !important; }\n`;

        // Ring colors (for focus states)
        css += `.ring-${originalClass} { --tw-ring-color: ${colorValue} !important; }\n`;

        // Placeholder colors
        css += `.placeholder-${originalClass}::placeholder { color: ${colorValue} !important; }\n`;

        // Hover states
        css += `.hover\\:bg-${originalClass}:hover { background-color: ${colorValue} !important; }\n`;
        css += `.hover\\:text-${originalClass}:hover { color: ${colorValue} !important; }\n`;
        css += `.hover\\:border-${originalClass}:hover { border-color: ${colorValue} !important; }\n`;

        // Focus states
        css += `.focus\\:bg-${originalClass}:focus { background-color: ${colorValue} !important; }\n`;
        css += `.focus\\:text-${originalClass}:focus { color: ${colorValue} !important; }\n`;
        css += `.focus\\:border-${originalClass}:focus { border-color: ${colorValue} !important; }\n`;
        css += `.focus\\:ring-${originalClass}:focus { --tw-ring-color: ${colorValue} !important; }\n`;
      }
    }

    // Add custom shadow and glow effects for the theme
    const primaryColor = themeConfig.colors.primary['500'];
    if (primaryColor) {
      css += `
/* Custom effects for ${themeConfig.displayName} */
.glow-lime {
  box-shadow: 0 0 20px ${primaryColor}80 !important;
}

.glow-subtle {
  box-shadow: 0 0 10px ${primaryColor}4D !important;
}

.pulse-lime {
  box-shadow: 0 0 0 0 ${primaryColor}B3;
}

@keyframes glow {
  0% { box-shadow: 0 0 5px ${primaryColor}80; }
  100% { box-shadow: 0 0 20px ${primaryColor}CC; }
}

.animate-glow {
  animation: glow 2s ease-in-out infinite alternate;
}

/* Gradient text effects */
.gradient-text-theme {
  background: linear-gradient(45deg, ${primaryColor}, ${themeConfig.colors.secondary['600']});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
`;
    }

    return css;
  }

  // Load saved theme from localStorage
  async loadSavedTheme(): Promise<void> {
    const savedThemeName = localStorage.getItem('ft_pong_current_theme');
    if (savedThemeName) {
      const success = this.applyThemeByName(savedThemeName);
      if (!success) {
        // Fallback to default theme
        this.applyThemeByName('default');
      }
    } else {
      // Apply default theme
      this.applyThemeByName('default');
    }
  }

  // Get color value by original class name
  getColorValue(originalClass: string): string | null {
    if (!this.currentTheme) return null;

    const mappedClass = this.currentTheme.mappings[originalClass];
    if (!mappedClass) return null;

    const [colorName, shade] = mappedClass.split('-');
    return this.currentTheme.colors[colorName]?.[shade] || null;
  }
}

// Create global instance
const themeManager = new ThemeManager();

// Make it globally available
(window as any).themeManager = themeManager;

export default themeManager;

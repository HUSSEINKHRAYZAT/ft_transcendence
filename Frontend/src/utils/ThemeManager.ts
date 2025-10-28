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
    this.themeStyleElement = document.createElement('style');
    this.themeStyleElement.id = 'dynamic-theme-styles';
    document.head.appendChild(this.themeStyleElement);

    // Load available themes
    await this.loadThemes();

  }

  async loadThemes(): Promise<void> {
    const themeFiles = ['default', 'red'];

    for (const themeName of themeFiles) {
        const response = await fetch(`/themes/${themeName}.json`);
        if (response.ok) {
          const themeConfig: ThemeConfig = await response.json();
          this.availableThemes.set(themeName, themeConfig);

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

      return;
    }

    this.currentTheme = themeConfig;

    const css = this.generateThemeCSS(themeConfig);

    this.themeStyleElement.textContent = css;

    localStorage.setItem('ft_pong_current_theme', themeConfig.name);

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

    return false;
  }

  applyThemeByName(name: string): boolean {
    const theme = this.getThemeByName(name);
    if (theme) {
      this.applyTheme(theme);
      return true;
    }

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

    for (const [variable, value] of Object.entries(themeConfig.cssVariables)) {
      css += `  ${variable}: ${value};\n`;
    }

    css += '}\n\n';

    for (const [originalClass, mappedClass] of Object.entries(themeConfig.mappings)) {
      const [colorName, shade] = mappedClass.split('-');
      const colorValue = themeConfig.colors[colorName]?.[shade];

      if (colorValue) {
        css += `.bg-${originalClass} { background-color: ${colorValue} !important; }\n`;

        css += `.text-${originalClass} { color: ${colorValue} !important; }\n`;

        css += `.border-${originalClass} { border-color: ${colorValue} !important; }\n`;

        css += `.ring-${originalClass} { --tw-ring-color: ${colorValue} !important; }\n`;

        css += `.placeholder-${originalClass}::placeholder { color: ${colorValue} !important; }\n`;

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

  async loadSavedTheme(): Promise<void> {
    const savedThemeName = localStorage.getItem('ft_pong_current_theme');
    if (savedThemeName) {
      const success = this.applyThemeByName(savedThemeName);
      if (!success) {
        this.applyThemeByName('default');
      }
    } else {
      this.applyThemeByName('default');
    }
  }

  getColorValue(originalClass: string): string | null {
    if (!this.currentTheme) return null;

    const mappedClass = this.currentTheme.mappings[originalClass];
    if (!mappedClass) return null;

    const [colorName, shade] = mappedClass.split('-');
    return this.currentTheme.colors[colorName]?.[shade] || null;
  }
}

const themeManager = new ThemeManager();

(window as any).themeManager = themeManager;

export default themeManager;

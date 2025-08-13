interface ThemeConfig {
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  cssVariables: { [key: string]: string };
}

class SimpleThemeManager {
  private currentTheme: string = 'lime';
  private themeStyleElement: HTMLStyleElement | null = null;

  private themes: { [key: string]: ThemeConfig } = {
    lime: {
      name: 'lime',
      displayName: 'Lime (Default)',
      colors: {
        primary: '#84cc16',
        secondary: '#16a34a',
        accent: '#65a30d'
      },
      cssVariables: {
        '--lime-500': '#84cc16',
        '--lime-600': '#65a30d',
        '--dark-green-600': '#16a34a',
        '--dark-green-700': '#15803d'
      }
    },
    orange: {
      name: 'orange',
      displayName: 'Orange Theme',
      colors: {
        primary: '#ea580c',
        secondary: '#dc2626',
        accent: '#c2410c'
      },
      cssVariables: {
        '--lime-500': '#ea580c',
        '--lime-600': '#dc2626',
        '--dark-green-600': '#dc2626',
        '--dark-green-700': '#c2410c'
      }
    },
    dark: {
      name: 'dark',
      displayName: 'Dark Theme',
      colors: {
        primary: '#1f2937',
        secondary: '#111827',
        accent: '#374151'
      },
      cssVariables: {
        '--lime-500': '#1f2937',
        '--lime-600': '#111827',
        '--dark-green-600': '#111827',
        '--dark-green-700': '#374151'
      }
    },
    blue: {
      name: 'blue',
      displayName: 'Blue Theme',
      colors: {
        primary: '#3b82f6',
        secondary: '#2563eb',
        accent: '#1d4ed8'
      },
      cssVariables: {
        '--lime-500': '#3b82f6',
        '--lime-600': '#2563eb',
        '--dark-green-600': '#2563eb',
        '--dark-green-700': '#1d4ed8'
      }
    },
    purple: {
      name: 'purple',
      displayName: 'Purple Theme',
      colors: {
        primary: '#8b5cf6',
        secondary: '#7c3aed',
        accent: '#6d28d9'
      },
      cssVariables: {
        '--lime-500': '#8b5cf6',
        '--lime-600': '#7c3aed',
        '--dark-green-600': '#7c3aed',
        '--dark-green-700': '#6d28d9'
      }
    },
    green: {
      name: 'green',
      displayName: 'Green Theme',
      colors: {
        primary: '#10b981',
        secondary: '#059669',
        accent: '#047857'
      },
      cssVariables: {
        '--lime-500': '#10b981',
        '--lime-600': '#059669',
        '--dark-green-600': '#059669',
        '--dark-green-700': '#047857'
      }
    }
  };

  constructor() {
    this.init();
  }

  init(): void {
    // Create style element for theme CSS
    this.themeStyleElement = document.createElement('style');
    this.themeStyleElement.id = 'simple-theme-styles';
    document.head.appendChild(this.themeStyleElement);

    // Load saved theme or use default
    const savedTheme = localStorage.getItem('ft_pong_theme') || 'lime';
    this.applyTheme(savedTheme);

    console.log('🎨 Simple Theme Manager initialized');
  }

  getAvailableThemes(): ThemeConfig[] {
    return Object.values(this.themes);
  }

  getCurrentTheme(): string {
    return this.currentTheme;
  }

  getCurrentThemeConfig(): ThemeConfig | null {
    return this.themes[this.currentTheme] || null;
  }

  applyTheme(themeName: string): boolean {
    const theme = this.themes[themeName];
    if (!theme) {
      console.warn(`Theme '${themeName}' not found`);
      return false;
    }

    this.currentTheme = themeName;

    // Generate and apply CSS
    const css = this.generateThemeCSS(theme);
    if (this.themeStyleElement) {
      this.themeStyleElement.textContent = css;
    }

    // Save to localStorage
    localStorage.setItem('ft_pong_theme', themeName);

    // Dispatch event for other components to listen
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme, themeName }
    }));

    console.log(`🎨 Applied theme: ${theme.displayName}`);
    return true;
  }

  private generateThemeCSS(theme: ThemeConfig): string {
    let css = `
/* Simple Theme: ${theme.displayName} */
:root {
`;

    // Add CSS variables
    for (const [variable, value] of Object.entries(theme.cssVariables)) {
      css += `  ${variable}: ${value};\n`;
    }

    css += '}\n\n';

    // Override specific Tailwind classes
    const primaryColor = theme.colors.primary;
    const secondaryColor = theme.colors.secondary;
    const accentColor = theme.colors.accent;

    css += `
/* Lime color overrides */
.bg-lime-500 { background-color: ${primaryColor} !important; }
.bg-lime-600 { background-color: ${accentColor} !important; }
.text-lime-500 { color: ${primaryColor} !important; }
.text-lime-600 { color: ${accentColor} !important; }
.border-lime-500 { border-color: ${primaryColor} !important; }
.border-lime-600 { border-color: ${accentColor} !important; }

/* Dark green color overrides */
.bg-dark-green-600 { background-color: ${secondaryColor} !important; }
.bg-dark-green-700 { background-color: ${accentColor} !important; }
.text-dark-green-600 { color: ${secondaryColor} !important; }
.text-dark-green-700 { color: ${accentColor} !important; }

/* Hover states */
.hover\\:bg-lime-500:hover { background-color: ${primaryColor} !important; }
.hover\\:bg-lime-600:hover { background-color: ${accentColor} !important; }
.hover\\:text-lime-500:hover { color: ${primaryColor} !important; }
.hover\\:bg-dark-green-600:hover { background-color: ${secondaryColor} !important; }
.hover\\:bg-dark-green-700:hover { background-color: ${accentColor} !important; }

/* Focus states */
.focus\\:border-lime-500:focus { border-color: ${primaryColor} !important; }
.focus\\:ring-lime-500:focus { --tw-ring-color: ${primaryColor} !important; }

/* Ring colors */
.ring-lime-500 { --tw-ring-color: ${primaryColor} !important; }
.ring-lime-300 { --tw-ring-color: ${primaryColor}80 !important; }

/* Custom glow effects */
.glow-lime {
  box-shadow: 0 0 20px ${primaryColor}80 !important;
}

.glow-subtle {
  box-shadow: 0 0 10px ${primaryColor}4D !important;
}

/* Gradient text effects */
.gradient-text-theme {
  background: linear-gradient(45deg, ${primaryColor}, ${secondaryColor});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Animation keyframes */
@keyframes glow {
  0% { box-shadow: 0 0 5px ${primaryColor}80; }
  100% { box-shadow: 0 0 20px ${primaryColor}CC; }
}

.animate-glow {
  animation: glow 2s ease-in-out infinite alternate;
}
`;

    return css;
  }
}

// Create and export global instance
const simpleThemeManager = new SimpleThemeManager();

// Make it globally available
(window as any).simpleThemeManager = simpleThemeManager;

export default simpleThemeManager;

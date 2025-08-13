interface BackgroundThemeConfig {
  name: string;
  displayName: string;
  colors: {
    primary: string;      // Main background (body)
    secondary: string;    // Card/box backgrounds
    tertiary: string;     // Input/select backgrounds
    border: string;       // Border colors
    text: {
      primary: string;    // Main text
      secondary: string;  // Muted text
      accent: string;     // Link/accent text
    };
  };
}

class BackgroundThemeManager {
  private currentTheme: string = 'dark';
  private backgroundStyleElement: HTMLStyleElement | null = null;

  private themes: { [key: string]: BackgroundThemeConfig } = {
    dark: {
      name: 'dark',
      displayName: 'Dark Mode',
      colors: {
        primary: '#111827',    // gray-900
        secondary: '#1f2937',  // gray-800
        tertiary: '#374151',   // gray-700
        border: '#4b5563',     // gray-600
        text: {
          primary: '#ffffff',   // white
          secondary: '#d1d5db', // gray-300
          accent: '#9ca3af'     // gray-400
        }
      }
    },
    light: {
      name: 'light',
      displayName: 'Light Mode',
      colors: {
        primary: '#f9fafb',    // gray-50
        secondary: '#ffffff',  // white
        tertiary: '#f3f4f6',   // gray-100
        border: '#d1d5db',     // gray-300
        text: {
          primary: '#111827',   // gray-900
          secondary: '#4b5563', // gray-600
          accent: '#6b7280'     // gray-500
        }
      }
    },
    midnight: {
      name: 'midnight',
      displayName: 'Midnight Blue',
      colors: {
        primary: '#0f172a',    // slate-900
        secondary: '#1e293b',  // slate-800
        tertiary: '#334155',   // slate-700
        border: '#475569',     // slate-600
        text: {
          primary: '#f1f5f9',   // slate-100
          secondary: '#cbd5e1', // slate-300
          accent: '#94a3b8'     // slate-400
        }
      }
    },
    carbon: {
      name: 'carbon',
      displayName: 'Carbon Black',
      colors: {
        primary: '#0c0c0c',    // Almost black
        secondary: '#1a1a1a',  // Dark gray
        tertiary: '#2d2d2d',   // Medium gray
        border: '#404040',     // Light gray
        text: {
          primary: '#ffffff',   // White
          secondary: '#cccccc', // Light gray
          accent: '#999999'     // Medium gray
        }
      }
    },
    ocean: {
      name: 'ocean',
      displayName: 'Ocean Blue',
      colors: {
        primary: '#0c4a6e',    // sky-900
        secondary: '#0369a1',  // sky-800
        tertiary: '#0284c7',   // sky-700
        border: '#0ea5e9',     // sky-500
        text: {
          primary: '#f0f9ff',   // sky-50
          secondary: '#bae6fd', // sky-200
          accent: '#7dd3fc'     // sky-300
        }
      }
    },
    forest: {
      name: 'forest',
      displayName: 'Forest Green',
      colors: {
        primary: '#14532d',    // green-900
        secondary: '#166534',  // green-800
        tertiary: '#15803d',   // green-700
        border: '#16a34a',     // green-600
        text: {
          primary: '#f0fdf4',   // green-50
          secondary: '#bbf7d0', // green-200
          accent: '#86efac'     // green-300
        }
      }
    },
    crimson: {
      name: 'crimson',
      displayName: 'Crimson Red',
      colors: {
        primary: '#7f1d1d',    // red-900
        secondary: '#991b1b',  // red-800
        tertiary: '#b91c1c',   // red-700
        border: '#dc2626',     // red-600
        text: {
          primary: '#000000',   // Black
          secondary: '#1f2937', // Dark gray
          accent: '#374151'     // Medium gray
        }
      }
    },
    cosmic: {
      name: 'cosmic',
      displayName: 'Cosmic Purple',
      colors: {
        primary: '#581c87',    // purple-900
        secondary: '#6b21a8',  // purple-800
        tertiary: '#7c3aed',   // violet-700
        border: '#8b5cf6',     // violet-500
        text: {
          primary: '#faf5ff',   // purple-50
          secondary: '#d8b4fe', // purple-200
          accent: '#c4b5fd'     // purple-300
        }
      }
    }
  };

  constructor() {
    this.init();
  }

  init(): void {
    // Create style element for background theme CSS
    this.backgroundStyleElement = document.createElement('style');
    this.backgroundStyleElement.id = 'background-theme-styles';
    document.head.appendChild(this.backgroundStyleElement);

    // Load saved background theme or use default
    const savedTheme = localStorage.getItem('ft_pong_background_theme') || 'dark';
    this.applyBackgroundTheme(savedTheme);

    console.log('🌙 Background Theme Manager initialized');
  }

  getAvailableThemes(): BackgroundThemeConfig[] {
    return Object.values(this.themes);
  }

  getCurrentTheme(): string {
    return this.currentTheme;
  }

  getCurrentThemeConfig(): BackgroundThemeConfig | null {
    return this.themes[this.currentTheme] || null;
  }

  applyBackgroundTheme(themeName: string): boolean {
    const theme = this.themes[themeName];
    if (!theme) {
      console.warn(`Background theme '${themeName}' not found`);
      return false;
    }

    this.currentTheme = themeName;

    // Generate and apply CSS
    const css = this.generateBackgroundCSS(theme);
    if (this.backgroundStyleElement) {
      this.backgroundStyleElement.textContent = css;
    }

    // Save to localStorage
    localStorage.setItem('ft_pong_background_theme', themeName);

    // Update body class for theme identification
    document.body.className = document.body.className.replace(/bg-theme-\w+/g, '');
    document.body.classList.add(`bg-theme-${themeName}`);

    // Dispatch event for other components to listen
    window.dispatchEvent(new CustomEvent('background-theme-changed', {
      detail: { theme, themeName }
    }));

    console.log(`🌙 Applied background theme: ${theme.displayName}`);
    return true;
  }

  private generateBackgroundCSS(theme: BackgroundThemeConfig): string {
    const colors = theme.colors;

    let css = `
/* Background Theme: ${theme.displayName} */
:root {
  /* Background theme variables */
  --bg-primary: ${colors.primary};
  --bg-secondary: ${colors.secondary};
  --bg-tertiary: ${colors.tertiary};
  --bg-border: ${colors.border};
  --text-primary: ${colors.text.primary};
  --text-secondary: ${colors.text.secondary};
  --text-accent: ${colors.text.accent};
}

/* Body and main backgrounds */
body {
  background-color: ${colors.primary} !important;
  color: ${colors.text.primary} !important;
}

/* Gray background overrides */
.bg-gray-900 { background-color: ${colors.primary} !important; }
.bg-gray-800 { background-color: ${colors.secondary} !important; }
.bg-gray-700 { background-color: ${colors.tertiary} !important; }
.bg-gray-600 { background-color: ${colors.border} !important; }

/* Card and container backgrounds */
.content-box,
.card,
.modal-content,
.bg-gray-800 {
  background-color: ${colors.secondary} !important;
}

/* Input and form backgrounds */
.input-lime,
.bg-gray-700,
input[type="text"],
input[type="email"],
input[type="password"],
select,
textarea {
  background-color: ${colors.tertiary} !important;
  border-color: ${colors.border} !important;
  color: ${colors.text.primary} !important;
}

/* Border colors */
.border-gray-700,
.border-gray-600,
.border-gray-500 {
  border-color: ${colors.border} !important;
}

/* Text colors */
.text-white { color: ${colors.text.primary} !important; }
.text-gray-300 { color: ${colors.text.secondary} !important; }
.text-gray-400 { color: ${colors.text.accent} !important; }

/* Placeholder colors */
.placeholder-gray-400::placeholder,
input::placeholder,
textarea::placeholder {
  color: ${colors.text.accent} !important;
}

/* Navbar */
#navbar {
  background-color: ${colors.secondary} !important;
}

/* Jumbotron gradients */
.jumbotron {
  background: linear-gradient(
    135deg,
    ${colors.primary}CC,
    ${colors.secondary}E6
  ), url('/images/wallpaper.jpg') !important;
}

/* Toast notifications - keep original colors but adjust background */
.toast-success { background-color: #059669 !important; }
.toast-error { background-color: #dc2626 !important; }
.toast-info { background-color: #2563eb !important; }

/* Modal backdrop */
.modal-backdrop {
  background-color: ${colors.primary}BF !important;
}

/* Hover states for cards */
.content-box:hover {
  background-color: ${this.lightenColor(colors.secondary, 0.1)} !important;
}

/* Footer */
#footer {
  background-color: ${colors.secondary} !important;
}

/* Custom scrollbar */
::-webkit-scrollbar-track {
  background: ${colors.tertiary} !important;
}

/* Focus states - keep lime colors but adjust background interaction */
.focus\\:bg-gray-700:focus {
  background-color: ${colors.tertiary} !important;
}

.hover\\:bg-gray-700:hover {
  background-color: ${colors.tertiary} !important;
}

.hover\\:bg-gray-600:hover {
  background-color: ${colors.border} !important;
}
`;

    return css;
  }

  private lightenColor(color: string, amount: number): string {
    // Simple color lightening - convert hex to rgb, increase values, convert back
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const newR = Math.min(255, Math.round(r + (255 - r) * amount));
      const newG = Math.min(255, Math.round(g + (255 - g) * amount));
      const newB = Math.min(255, Math.round(b + (255 - b) * amount));

      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    return color;
  }
}

// Create and export global instance
const backgroundThemeManager = new BackgroundThemeManager();

// Make it globally available
(window as any).backgroundThemeManager = backgroundThemeManager;

export default backgroundThemeManager;

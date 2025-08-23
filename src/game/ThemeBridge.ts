import { Color3, Color4 } from "@babylonjs/core";

export interface GameThemeColors {
  primary: Color3;      // Main accent color (lime equivalent)
  secondary: Color3;    // Secondary accent color
  background: Color4;   // Scene background
  paddle1: Color3;      // Player 1 paddle
  paddle2: Color3;      // Player 2 paddle
  paddle3: Color3;      // Player 3 paddle (4P mode)
  paddle4: Color3;      // Player 4 paddle (4P mode)
  ball: Color3;         // Ball color
  obstacles: Color3[];  // Obstacle color variations
}

export class ThemeBridge {
  private static instance: ThemeBridge;
  private currentGameTheme: GameThemeColors;
  private themeChangeCallbacks: ((theme: GameThemeColors) => void)[] = [];

  private constructor() {
    this.currentGameTheme = this.getDefaultTheme();
    this.initializeThemeListener();
  }

  public static getInstance(): ThemeBridge {
    if (!ThemeBridge.instance) {
      ThemeBridge.instance = new ThemeBridge();
    }
    return ThemeBridge.instance;
  }

  private initializeThemeListener(): void {
    // Listen to both accent and background theme changes
    window.addEventListener('theme-changed', (() => {
      this.updateGameTheme();
    }) as EventListener);

    window.addEventListener('background-theme-changed', (() => {
      this.updateGameTheme();
    }) as EventListener);

    // Initial theme load
    this.updateGameTheme();
  }

  private updateGameTheme(): void {
    const accentTheme = this.getCurrentAccentTheme();
    const backgroundTheme = this.getCurrentBackgroundTheme();
    
    this.currentGameTheme = this.generateGameTheme(accentTheme, backgroundTheme);
    
    // Notify all registered callbacks
    this.themeChangeCallbacks.forEach(callback => {
      try {
        callback(this.currentGameTheme);
      } catch (error) {
        console.error('Error in theme change callback:', error);
      }
    });

    console.log('🎮 Game theme updated:', {
      accent: accentTheme?.name || 'default',
      background: backgroundTheme?.name || 'default'
    });
  }

  private getCurrentAccentTheme(): any {
    // Get current theme from SimpleThemeManager
    const themeManager = (window as any).simpleThemeManager;
    if (themeManager) {
      return themeManager.getCurrentThemeConfig();
    }
    return null;
  }

  private getCurrentBackgroundTheme(): any {
    // Get current background theme from BackgroundThemeManager
    const bgThemeManager = (window as any).backgroundThemeManager;
    if (bgThemeManager) {
      return bgThemeManager.getCurrentThemeConfig();
    }
    return null;
  }

  private generateGameTheme(accentTheme: any, backgroundTheme: any): GameThemeColors {
    const primary = accentTheme ? this.hexToColor3(accentTheme.colors.primary) : new Color3(0.518, 0.8, 0.086); // Default lime
    const secondary = accentTheme ? this.hexToColor3(accentTheme.colors.secondary) : new Color3(0.086, 0.639, 0.290);
    
    // Background from background theme or fallback
    let bgColor = new Color4(0.06, 0.07, 0.1, 1); // Default dark blue
    if (backgroundTheme) {
      const bg = this.hexToColor3(backgroundTheme.colors.primary);
      bgColor = new Color4(bg.r, bg.g, bg.b, 1);
    }

    // Generate paddle colors based on theme
    const paddle1 = primary.clone();
    const paddle2 = secondary.clone();
    const paddle3 = this.blendColors(primary, secondary, 0.7);
    const paddle4 = this.blendColors(secondary, primary, 0.7);

    // Generate obstacle variations
    const obstacles = [
      primary.clone(),
      secondary.clone(),
      this.blendColors(primary, new Color3(1, 1, 1), 0.3),
      this.blendColors(secondary, new Color3(1, 1, 1), 0.3),
      this.blendColors(primary, secondary, 0.5)
    ];

    return {
      primary,
      secondary,
      background: bgColor,
      paddle1,
      paddle2,
      paddle3,
      paddle4,
      ball: primary.clone(),
      obstacles
    };
  }

  private getDefaultTheme(): GameThemeColors {
    return {
      primary: new Color3(0.518, 0.8, 0.086),      // Lime
      secondary: new Color3(0.086, 0.639, 0.290),  // Dark green
      background: new Color4(0.06, 0.07, 0.1, 1),  // Dark blue
      paddle1: new Color3(0.35, 0.9, 0.6),         // Green
      paddle2: new Color3(0.36, 0.63, 0.92),       // Blue
      paddle3: new Color3(0.97, 0.85, 0.35),       // Yellow
      paddle4: new Color3(0.92, 0.44, 0.39),       // Red
      ball: new Color3(0.518, 0.8, 0.086),         // Lime
      obstacles: [
        new Color3(0.9, 0.4, 0.4),    // Red
        new Color3(0.4, 0.9, 0.6),    // Green
        new Color3(0.4, 0.7, 0.95),   // Blue
        new Color3(0.95, 0.85, 0.4),  // Yellow
        new Color3(0.8, 0.5, 0.9),    // Purple
      ]
    };
  }

  private hexToColor3(hex: string): Color3 {
    // Remove # if present
    hex = hex.replace('#', '');
    
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    return new Color3(r, g, b);
  }

  private blendColors(color1: Color3, color2: Color3, ratio: number): Color3 {
    const r = color1.r * (1 - ratio) + color2.r * ratio;
    const g = color1.g * (1 - ratio) + color2.g * ratio;
    const b = color1.b * (1 - ratio) + color2.b * ratio;
    return new Color3(r, g, b);
  }

  // Public API
  public getCurrentTheme(): GameThemeColors {
    return this.currentGameTheme;
  }

  public onThemeChange(callback: (theme: GameThemeColors) => void): () => void {
    this.themeChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.themeChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.themeChangeCallbacks.splice(index, 1);
      }
    };
  }

  public color3ToHex(color: Color3): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Utility methods for game use
  public getObstacleColor(index: number): Color3 {
    const colors = this.currentGameTheme.obstacles;
    return colors[index % colors.length].clone();
  }

  public getPaddleColor(paddleIndex: number): Color3 {
    switch (paddleIndex) {
      case 0: return this.currentGameTheme.paddle1.clone();
      case 1: return this.currentGameTheme.paddle2.clone();
      case 2: return this.currentGameTheme.paddle3.clone();
      case 3: return this.currentGameTheme.paddle4.clone();
      default: return this.currentGameTheme.primary.clone();
    }
  }
}

// Export singleton instance
export const themeBridge = ThemeBridge.getInstance();
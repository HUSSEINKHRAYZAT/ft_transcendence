import type { BracketTheme, Match, Tournament } from '@/types/tournament-bracket';
import { TournamentBracket } from '@/tournament/TournamentBracket';
import { createMockTournament, updateMatchWinner } from '@/utils/tournament-bracket-utils';
import '@/styles/tournament-bracket.css';

type ThemeMode = 'dark' | 'light';

interface DemoOptions {
  mountPoint?: string | HTMLElement;
  initialSize?: number;
}

const INLINE_STYLE_ID = 'tournament-bracket-demo-inline-style';
const FONT_LINK_ID = 'tournament-bracket-demo-font';

/**
 * Tournament bracket demo page rendered entirely via TypeScript.
 * This replaces the former demo-bracket.html so the project stays SPA-only.
 */
export class TournamentBracketDemo {
  private readonly root: HTMLElement;
  private readonly containerId = `bracket-container-${Math.random().toString(36).slice(2)}`;
  private currentBracket: TournamentBracket | null = null;
  private currentTournament: Tournament | null = null;
  private currentTheme: ThemeMode = 'dark';
  private currentSize = 8;

  constructor({ mountPoint, initialSize = 8 }: DemoOptions = {}) {
    this.root = this.resolveMountPoint(mountPoint);
    this.injectFont();
    this.injectStyles();
    this.renderTemplate();
    this.registerControls();
    this.applyTheme();
    this.loadTournament(initialSize);
  }

  /**
   * Tear down the demo UI and detach the bracket component.
   */
  public destroy(): void {
    this.currentBracket?.destroy();
    this.currentBracket = null;
    this.currentTournament = null;
    this.root.innerHTML = '';
    this.root.classList.remove('tournament-bracket-demo');
    this.root.style.removeProperty('background');
    this.root.style.removeProperty('color');
    delete this.root.dataset.theme;
  }

  private resolveMountPoint(mountPoint?: string | HTMLElement): HTMLElement {
    if (mountPoint instanceof HTMLElement) {
      return mountPoint;
    }

    if (typeof mountPoint === 'string') {
      const element = document.querySelector<HTMLElement>(mountPoint);
      if (element) {
        return element;
      }
    }

    const fallback = document.createElement('div');
    document.body.appendChild(fallback);
    return fallback;
  }

  private injectFont(): void {
    if (document.getElementById(FONT_LINK_ID)) {
      return;
    }

    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }

  private injectStyles(): void {
    if (document.getElementById(INLINE_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = INLINE_STYLE_ID;
    style.textContent = this.getInlineStyles();
    document.head.appendChild(style);
  }

  private renderTemplate(): void {
    this.root.classList.add('tournament-bracket-demo');
    this.root.innerHTML = `
      <div class="demo-controls" data-demo-controls>
        <button class="demo-btn" data-action="load" data-size="8">8-Player</button>
        <button class="demo-btn" data-action="load" data-size="4">4-Player</button>
        <button class="demo-btn secondary" data-action="toggle-theme">Toggle Theme</button>
        <button class="demo-btn secondary" data-action="simulate-match">Simulate Match</button>
      </div>
      <div class="bracket-container" id="${this.containerId}">
        <div class="loading">Loading tournament...</div>
      </div>
    `;
  }

  private registerControls(): void {
    const controls = this.root.querySelector('[data-demo-controls]');
    if (!controls) {
      return;
    }

    controls.querySelectorAll<HTMLButtonElement>('[data-action="load"]').forEach((button) => {
      const sizeValue = Number.parseInt(button.dataset.size ?? '', 10);
      button.addEventListener('click', () => this.loadTournament(sizeValue));
    });

    const toggleThemeButton = controls.querySelector<HTMLButtonElement>('[data-action="toggle-theme"]');
    toggleThemeButton?.addEventListener('click', () => this.toggleTheme());

    const simulateButton = controls.querySelector<HTMLButtonElement>('[data-action="simulate-match"]');
    simulateButton?.addEventListener('click', () => this.simulateMatchComplete());
  }

  private loadTournament(size: number): void {
    const container = this.root.querySelector<HTMLElement>(`#${this.containerId}`);
    if (!container) {
      return;
    }

    const normalizedSize = this.normalizeSize(size);

    this.currentBracket?.destroy();
    container.innerHTML = '';

    this.currentSize = normalizedSize;
    this.currentTournament = createMockTournament(normalizedSize as any, '1');

    this.currentBracket = new TournamentBracket({
      tournament: this.currentTournament,
      config: {
        theme: this.getThemeConfig()
      },
      onStartMatch: (matchId) => {
        window.alert(`Starting match ${matchId}!\n\nIn a real app, this would navigate to the game screen.`);
      },
      onViewMatch: (matchId) => {
        window.alert(`Viewing match ${matchId}!\n\nIn a real app, this would open the spectator view.`);
      },
      onRefresh: () => {
        // placeholder for live refresh logic
      }
    });

    container.appendChild(this.currentBracket.getElement());
  }

  private toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.loadTournament(this.currentSize);
  }

  private applyTheme(): void {
    const background = this.currentTheme === 'dark' ? '#0b1220' : '#f8fafc';
    const text = this.currentTheme === 'dark' ? '#e5e7eb' : '#0f172a';

    this.root.style.background = background;
    this.root.style.color = text;
    this.root.dataset.theme = this.currentTheme;
  }

  private simulateMatchComplete(): void {
    if (!this.currentTournament || !this.currentBracket) {
      window.alert('No tournament loaded!');
      return;
    }

    const targetMatch = this.findFirstReadyMatch(this.currentTournament);
    if (!targetMatch || !targetMatch.player1 || !targetMatch.player2) {
      window.alert('No matches available to complete!');
      return;
    }

    const winnerId = Math.random() > 0.5 ? targetMatch.player1.id : targetMatch.player2.id;
    const player1Score = winnerId === targetMatch.player1.id ? 5 : 3;
    const player2Score = winnerId === targetMatch.player2.id ? 5 : 3;

    this.currentTournament = updateMatchWinner(
      this.currentTournament,
      targetMatch.id,
      winnerId,
      player1Score,
      player2Score
    );

    this.currentBracket.update(this.currentTournament);
  }

  private findFirstReadyMatch(tournament: Tournament): Match | null {
    for (const round of tournament.rounds) {
      const match = round.matches.find(
        (m) => m.status === 'ready' && m.player1 && m.player2 && !m.winnerId
      );

      if (match) {
        return match;
      }
    }

    return null;
  }

  private getThemeConfig(): BracketTheme {
    if (this.currentTheme === 'dark') {
      return {
        mode: 'dark',
        colors: {
          background: '#0b1220',
          surface: 'rgba(30, 41, 59, 0.88)',
          border: 'rgba(148, 163, 184, 0.2)',
          textPrimary: '#e5e7eb',
          textSecondary: '#94a3b8',
          lime: '#84cc16',
          sky: '#38bdf8',
          orange: '#f97316',
          green: '#22c55e',
          red: '#ef4444'
        }
      };
    }

    return {
      mode: 'light',
      colors: {
        background: '#f8fafc',
        surface: 'rgba(255, 255, 255, 0.9)',
        border: 'rgba(148, 163, 184, 0.25)',
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        lime: '#84cc16',
        sky: '#38bdf8',
        orange: '#f97316',
        green: '#22c55e',
        red: '#ef4444'
      }
    };
  }

  private normalizeSize(size: number): number {
    return size === 4 ? 4 : 8;
  }

  private getInlineStyles(): string {
    return `
      .tournament-bracket-demo {
        position: relative;
        min-height: 100vh;
        width: 100%;
        font-family: 'Inter', sans-serif;
        overflow-x: hidden;
        margin: 0;
        padding: 0;
      }

      .tournament-bracket-demo .demo-controls {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        gap: 12px;
        background: rgba(30, 41, 59, 0.95);
        padding: 16px;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        backdrop-filter: blur(12px);
      }

      .tournament-bracket-demo .demo-btn {
        padding: 8px 16px;
        background: linear-gradient(135deg, #84cc16, #22c55e);
        color: #000;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: transform 150ms ease;
      }

      .tournament-bracket-demo .demo-btn:hover {
        transform: translateY(-2px);
      }

      .tournament-bracket-demo .demo-btn.secondary {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
      }

      .tournament-bracket-demo .bracket-container {
        width: 100%;
        min-height: 100vh;
      }

      .tournament-bracket-demo .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-size: 18px;
        color: #94a3b8;
      }

      @media (max-width: 767px) {
        .tournament-bracket-demo .demo-controls {
          top: 10px;
          right: 10px;
          padding: 12px;
          flex-direction: column;
        }

        .tournament-bracket-demo .demo-btn {
          font-size: 11px;
          padding: 6px 12px;
        }
      }
    `;
  }
}

/**
 * Helper for quick initialization without manually instantiating the class.
 */
export function initializeTournamentBracketDemo(options?: DemoOptions): TournamentBracketDemo {
  return new TournamentBracketDemo(options);
}

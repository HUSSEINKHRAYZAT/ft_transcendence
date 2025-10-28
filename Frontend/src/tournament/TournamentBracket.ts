/**
 * TournamentBracket Component
 * Premium Esports Dashboard - Glass + Neon Aesthetic
 * Main bracket component with header, grid, footer, and keyboard navigation
 */

import { Tournament, Round, Match, BracketConfig } from '../types/tournament-bracket';
import { MatchCard } from './MatchCard';
import { BracketConnectors } from './BracketConnectors';

interface TournamentBracketProps {
  tournament: Tournament;
  config?: Partial<BracketConfig>;
  onStartMatch?: (matchId: string) => void;
  onViewMatch?: (matchId: string) => void;
  onRefresh?: () => void;
}

export class TournamentBracket {
  private element: HTMLElement;
  private tournament: Tournament;
  private config: BracketConfig;
  private matchCards: Map<string, MatchCard> = new Map();
  private connectors?: BracketConnectors;
  private currentFocusIndex: number = 0;
  private allMatches: Match[] = [];
  
  private onStartMatch?: (matchId: string) => void;
  private onViewMatch?: (matchId: string) => void;
  private onRefresh?: () => void;

  constructor(props: TournamentBracketProps) {
    this.tournament = props.tournament;
    this.onStartMatch = props.onStartMatch;
    this.onViewMatch = props.onViewMatch;
    this.onRefresh = props.onRefresh;
    
    // Default config
    this.config = {
      enableKeyboardNav: true,
      enableAnimations: true,
      enableConnectors: true,
      autoScroll: true,
      theme: {
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
      },
      ...props.config
    };

    this.element = this.render();
    this.setupKeyboardNavigation();
    this.setupResizeObserver();
  }

  private getStatusChipContent(): string {
    const { status, currentRound, totalRounds, winnerId, winnerName } = this.tournament;

    switch (status) {
      case 'waiting':
        return '<span class="status-chip status-waiting">⏳ Waiting for players</span>';
      case 'active':
        return `<span class="status-chip status-active">🎮 Round ${currentRound}</span>`;
      case 'completed':
        return '<span class="status-chip status-completed">🏆 Tournament completed</span>';
      default:
        return '';
    }
  }

  private renderHeader(): string {
    const { name, subtitle, status, playerCount, maxPlayers, spectatorCount, winnerId, winnerName, isSpectator } = this.tournament;
    
    const statusChip = this.getStatusChipContent();
    const playerChip = `<span class="info-chip">${playerCount}/${maxPlayers} players</span>`;
    const spectatorChip = spectatorCount && spectatorCount > 0 
      ? `<span class="info-chip">👁️ ${spectatorCount} watching</span>` 
      : '';
    const winnerChip = winnerId && winnerName 
      ? `<span class="winner-chip">🏆 ${winnerName}</span>` 
      : '';
    const spectatorBadge = isSpectator 
      ? '<span class="spectator-badge">👁️ Spectator</span>' 
      : '';

    return `
      <header class="bracket-header">
        <div class="header-left">
          <h1 class="tournament-title">${name}</h1>
          <p class="tournament-subtitle">${subtitle}</p>
        </div>
        <div class="header-right">
          ${statusChip}
          ${playerChip}
          ${spectatorChip}
          ${winnerChip}
          ${spectatorBadge}
        </div>
      </header>
    `;
  }

  private renderRoundColumn(round: Round): HTMLElement {
    const column = document.createElement('div');
    column.className = 'bracket-round-column';
    column.setAttribute('data-round', round.round.toString());

    // Round header
    const header = document.createElement('div');
    header.className = 'round-header';
    header.innerHTML = `
      <span class="round-chip">${round.emoji} ${round.name}</span>
    `;
    column.appendChild(header);

    // Matches container
    const matchesContainer = document.createElement('div');
    matchesContainer.className = 'round-matches';

    round.matches.forEach(match => {
      const matchCard = new MatchCard({
        match,
        onStartMatch: this.onStartMatch,
        onViewMatch: this.onViewMatch,
        onCardClick: (matchId) => this.handleCardClick(matchId)
      });

      this.matchCards.set(match.id, matchCard);
      this.allMatches.push(match);
      matchesContainer.appendChild(matchCard.getElement());
    });

    column.appendChild(matchesContainer);
    return column;
  }

  private renderBracketGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'bracket-grid';
    grid.setAttribute('role', 'main');

    this.allMatches = [];
    this.matchCards.clear();

    // Render each round as a column
    this.tournament.rounds.forEach(round => {
      const column = this.renderRoundColumn(round);
      grid.appendChild(column);
    });

    // Add connectors
    if (this.config.enableConnectors) {
      this.connectors = new BracketConnectors(this.tournament.rounds, grid);
      grid.insertBefore(this.connectors.getElement(), grid.firstChild);
    }

    return grid;
  }

  private renderFooter(): string {
    const { createdAt, createdBy } = this.tournament;
    const date = new Date(createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `
      <footer class="bracket-footer">
        <div class="footer-left">
          <span class="footer-info">Created ${date} by <strong>${createdBy}</strong></span>
        </div>
        <div class="footer-right">
          <span class="footer-tip">J/K or arrows to navigate • Enter to open</span>
        </div>
      </footer>
    `;
  }

  private renderEmptyState(): string {
    return `
      <div class="bracket-empty">
        <div class="empty-icon">🏆</div>
        <h3>Tournament will populate once players join</h3>
        <p>Waiting for players to start the tournament...</p>
      </div>
    `;
  }

  private renderLoadingState(): string {
    return `
      <div class="bracket-loading">
        <div class="loading-spinner"></div>
        <p>Loading tournament bracket...</p>
      </div>
    `;
  }

  private render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tournament-bracket';
    container.setAttribute('data-theme', this.config.theme.mode);
    container.setAttribute('data-tournament-id', this.tournament.id);

    // Apply custom CSS variables
    const colors = this.config.theme.colors;
    container.style.setProperty('--color-background', colors.background);
    container.style.setProperty('--color-surface', colors.surface);
    container.style.setProperty('--color-border', colors.border);
    container.style.setProperty('--color-text-primary', colors.textPrimary);
    container.style.setProperty('--color-text-secondary', colors.textSecondary);
    container.style.setProperty('--color-lime', colors.lime);
    container.style.setProperty('--color-sky', colors.sky);
    container.style.setProperty('--color-orange', colors.orange);
    container.style.setProperty('--color-green', colors.green);
    container.style.setProperty('--color-red', colors.red);

    // Header
    const headerHTML = this.renderHeader();
    container.innerHTML = headerHTML;

    // Main content
    if (this.tournament.rounds.length === 0) {
      container.innerHTML += this.renderEmptyState();
    } else {
      const grid = this.renderBracketGrid();
      container.appendChild(grid);
    }

    // Footer
    const footerHTML = this.renderFooter();
    const footerDiv = document.createElement('div');
    footerDiv.innerHTML = footerHTML;
    container.appendChild(footerDiv.firstElementChild as HTMLElement);

    return container;
  }

  private handleCardClick(matchId: string): void {
    const match = this.allMatches.find(m => m.id === matchId);
    if (!match) return;

    // Update focus index
    this.currentFocusIndex = this.allMatches.indexOf(match);
    
    // Could emit event or handle selection

  }

  private setupKeyboardNavigation(): void {
    if (!this.config.enableKeyboardNav) return;

    document.addEventListener('keydown', (e) => {
      if (!this.element.contains(document.activeElement) && 
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'j':
        case 'J':
        case 'ArrowDown':
          e.preventDefault();
          this.navigateNext();
          break;
        case 'k':
        case 'K':
        case 'ArrowUp':
          e.preventDefault();
          this.navigatePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.navigateNextRound();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.navigatePreviousRound();
          break;
      }
    });
  }

  private navigateNext(): void {
    if (this.allMatches.length === 0) return;
    
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.allMatches.length;
    this.focusCurrentMatch();
  }

  private navigatePrevious(): void {
    if (this.allMatches.length === 0) return;
    
    this.currentFocusIndex = (this.currentFocusIndex - 1 + this.allMatches.length) % this.allMatches.length;
    this.focusCurrentMatch();
  }

  private navigateNextRound(): void {
    const currentMatch = this.allMatches[this.currentFocusIndex];
    if (!currentMatch) return;

    const nextRoundMatch = this.allMatches.find(m => m.round > currentMatch.round);
    if (nextRoundMatch) {
      this.currentFocusIndex = this.allMatches.indexOf(nextRoundMatch);
      this.focusCurrentMatch();
    }
  }

  private navigatePreviousRound(): void {
    const currentMatch = this.allMatches[this.currentFocusIndex];
    if (!currentMatch) return;

    // Find last match in previous round
    const prevRoundMatches = this.allMatches.filter(m => m.round < currentMatch.round);
    if (prevRoundMatches.length > 0) {
      const prevMatch = prevRoundMatches[prevRoundMatches.length - 1];
      this.currentFocusIndex = this.allMatches.indexOf(prevMatch);
      this.focusCurrentMatch();
    }
  }

  private focusCurrentMatch(): void {
    const match = this.allMatches[this.currentFocusIndex];
    if (!match) return;

    const card = this.matchCards.get(match.id);
    if (!card) return;

    card.focus();
    
    if (this.config.autoScroll) {
      card.scrollIntoView();
    }
  }

  private setupResizeObserver(): void {
    if (!this.config.enableConnectors || !this.connectors) return;

    const resizeObserver = new ResizeObserver(() => {
      this.connectors?.refresh();
    });

    resizeObserver.observe(this.element);
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public update(tournament: Tournament): void {
    this.tournament = tournament;
    const newElement = this.render();
    this.element.replaceWith(newElement);
    this.element = newElement;
    this.setupKeyboardNavigation();
    this.setupResizeObserver();
  }

  public refresh(): void {
    this.connectors?.refresh();
  }

  public destroy(): void {
    this.matchCards.clear();
    this.allMatches = [];
    this.element.remove();
  }
}

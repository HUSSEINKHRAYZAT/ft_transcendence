/**
 * MatchCard Component
 * Displays match information with players, status, and actions
 */

import { Match } from '../types/tournament-bracket';
import { PlayerRow } from './PlayerRow';

interface MatchCardProps {
  match: Match;
  onStartMatch?: (matchId: string) => void;
  onViewMatch?: (matchId: string) => void;
  onCardClick?: (matchId: string) => void;
}

export class MatchCard {
  private element: HTMLElement;
  private match: Match;
  private onStartMatch?: (matchId: string) => void;
  private onViewMatch?: (matchId: string) => void;
  private onCardClick?: (matchId: string) => void;
  private player1Row?: PlayerRow;
  private player2Row?: PlayerRow;

  constructor(props: MatchCardProps) {
    this.match = props.match;
    this.onStartMatch = props.onStartMatch;
    this.onViewMatch = props.onViewMatch;
    this.onCardClick = props.onCardClick;
    this.element = this.render();
  }

  private getStatusBadge(): { text: string; emoji: string; className: string } {
    switch (this.match.status) {
      case 'pending':
        return { text: 'Pending', emoji: '⌛', className: 'status-pending' };
      case 'ready':
        return { text: 'Ready', emoji: '✅', className: 'status-ready' };
      case 'active':
        return { text: 'Live', emoji: '🎮', className: 'status-active' };
      case 'completed':
        return { text: 'Complete', emoji: '🏆', className: 'status-completed' };
      default:
        return { text: 'Unknown', emoji: '❓', className: 'status-unknown' };
    }
  }

  private renderMetaRow(): string {
    const status = this.getStatusBadge();
    const isYourTurn = this.match.isYourTurn;
    
    let extraBadge = '';
    if (isYourTurn) {
      extraBadge = '<span class="status-badge status-your-turn">🚀 Your turn</span>';
    }

    return `
      <div class="match-meta">
        <span class="match-number">Match ${this.match.matchNumber}</span>
        <div class="match-status-badges">
          <span class="status-badge ${status.className}">${status.emoji} ${status.text}</span>
          ${extraBadge}
        </div>
      </div>
    `;
  }

  private renderPlayers(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'match-players';

    const isCompleted = this.match.status === 'completed';
    const winnerId = this.match.winnerId;

    // Player 1
    const player1Winner = isCompleted && winnerId === this.match.player1?.id;
    const player1Loser = !!(isCompleted && winnerId && winnerId !== this.match.player1?.id);
    
    this.player1Row = new PlayerRow({
      player: this.match.player1,
      isWinner: player1Winner,
      isLoser: player1Loser,
      isPlaceholder: !this.match.player1
    });
    container.appendChild(this.player1Row.getElement());

    // Player 2
    const player2Winner = isCompleted && winnerId === this.match.player2?.id;
    const player2Loser = !!(isCompleted && winnerId && winnerId !== this.match.player2?.id);
    
    this.player2Row = new PlayerRow({
      player: this.match.player2,
      isWinner: player2Winner,
      isLoser: player2Loser,
      isPlaceholder: !this.match.player2
    });
    container.appendChild(this.player2Row.getElement());

    return container;
  }

  private renderActions(): string {
    const { status, isUserMatch, isYourTurn } = this.match;

    // User's match and ready to start
    if (isUserMatch && status === 'ready' && isYourTurn) {
      return `
        <div class="match-actions">
          <button class="btn-primary btn-start-match" data-action="start">
            🚀 Start match
          </button>
        </div>
      `;
    }

    // Match is active - can view
    if (status === 'active') {
      return `
        <div class="match-actions">
          <button class="btn-secondary btn-view-match" data-action="view">
            View match
          </button>
        </div>
      `;
    }

    // Completed - user won
    if (status === 'completed' && isUserMatch && this.match.winnerId) {
      const youWon = this.match.player1?.isYou && this.match.winnerId === this.match.player1.id ||
                     this.match.player2?.isYou && this.match.winnerId === this.match.player2.id;
      
      if (youWon) {
        return `
          <div class="match-note match-note-success">
            🏆 You won this match • Waiting for the next round…
          </div>
        `;
      } else {
        return `
          <div class="match-note match-note-neutral">
            Match completed
          </div>
        `;
      }
    }

    // Pending - waiting
    if (status === 'pending') {
      return `
        <div class="match-note match-note-neutral">
          Players will populate shortly
        </div>
      `;
    }

    // Ready but not user's turn
    if (status === 'ready' && !isYourTurn) {
      return `
        <div class="match-note match-note-neutral">
          Players are preparing to start
        </div>
      `;
    }

    return '';
  }

  private render(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.setAttribute('data-match-id', this.match.id);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'article');
    
    // Apply state classes
    if (this.match.isUserMatch) card.classList.add('is-user-match');
    if (this.match.status === 'active') card.classList.add('is-active');
    if (this.match.status === 'ready') card.classList.add('is-ready');
    if (this.match.status === 'completed') card.classList.add('is-complete');
    if (!this.match.player1 && !this.match.player2) card.classList.add('is-placeholder');

    // ARIA labels
    const ariaLabel = `Match ${this.match.matchNumber}, ${this.match.status}, ${this.match.player1?.name || 'TBD'} versus ${this.match.player2?.name || 'TBD'}`;
    card.setAttribute('aria-label', ariaLabel);

    // Build card structure
    const metaRow = this.renderMetaRow();
    card.innerHTML = metaRow;
    
    const playersElement = this.renderPlayers();
    card.appendChild(playersElement);
    
    const actionsHTML = this.renderActions();
    if (actionsHTML) {
      const actionsDiv = document.createElement('div');
      actionsDiv.innerHTML = actionsHTML;
      card.appendChild(actionsDiv.firstElementChild as HTMLElement);
    }

    // Event listeners
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.closest('[data-action="start"]')) {
        e.stopPropagation();
        this.onStartMatch?.(this.match.id);
      } else if (target.closest('[data-action="view"]')) {
        e.stopPropagation();
        this.onViewMatch?.(this.match.id);
      } else {
        this.onCardClick?.(this.match.id);
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const startBtn = card.querySelector('[data-action="start"]');
        const viewBtn = card.querySelector('[data-action="view"]');
        
        if (startBtn) {
          this.onStartMatch?.(this.match.id);
        } else if (viewBtn) {
          this.onViewMatch?.(this.match.id);
        } else {
          this.onCardClick?.(this.match.id);
        }
      }
    });

    return card;
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public update(match: Match): void {
    this.match = match;
    const newElement = this.render();
    this.element.replaceWith(newElement);
    this.element = newElement;
  }

  public focus(): void {
    this.element.focus();
  }

  public scrollIntoView(): void {
    this.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });
  }
}

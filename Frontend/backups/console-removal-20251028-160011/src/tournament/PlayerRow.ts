/**
 * PlayerRow Component
 * Displays player info with avatar, badges, substatus, and score
 */

import { MatchPlayer } from '../types/tournament-bracket';

interface PlayerRowProps {
  player?: MatchPlayer;
  isWinner?: boolean;
  isLoser?: boolean;
  isPlaceholder?: boolean;
}

export class PlayerRow {
  private element: HTMLElement;
  private player?: MatchPlayer;
  private isWinner: boolean;
  private isLoser: boolean;
  private isPlaceholder: boolean;

  constructor(props: PlayerRowProps) {
    this.player = props.player;
    this.isWinner = props.isWinner || false;
    this.isLoser = props.isLoser || false;
    this.isPlaceholder = props.isPlaceholder || false;
    this.element = this.render();
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private renderAvatar(): string {
    if (!this.player) {
      return `<div class="player-avatar placeholder">?</div>`;
    }

    const initials = this.getInitials(this.player.name);
    
    if (this.player.avatar) {
      return `
        <div class="player-avatar" style="background-image: url('${this.player.avatar}')">
          <img src="${this.player.avatar}" alt="${this.player.name}" />
        </div>
      `;
    }

    return `
      <div class="player-avatar letter-avatar" data-initials="${initials}">
        ${initials}
      </div>
    `;
  }

  private renderBadges(): string {
    if (!this.player) return '';

    const badges: string[] = [];

    if (this.player.isYou) {
      badges.push('<span class="player-badge badge-you">YOU</span>');
    }

    if (this.player.isAI) {
      badges.push('<span class="player-badge badge-ai">AI</span>');
    }

    return badges.length > 0 ? `<div class="player-badges">${badges.join('')}</div>` : '';
  }

  private renderSubstatus(): string {
    if (!this.player || !this.player.substatus) return '';
    
    return `<span class="player-substatus">${this.player.substatus}</span>`;
  }

  private renderScore(): string {
    if (!this.player) {
      return '<span class="player-score placeholder">-</span>';
    }

    const score = this.player.score !== undefined ? this.player.score : '-';
    return `<span class="player-score ${this.isWinner ? 'winner' : ''}">${score}</span>`;
  }

  private render(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'player-row';
    
    if (this.isWinner) div.classList.add('is-winner');
    if (this.isLoser) div.classList.add('is-loser');
    if (this.isPlaceholder) div.classList.add('is-placeholder');
    if (!this.player) div.classList.add('empty');

    const name = this.player?.name || 'TBD';

    div.innerHTML = `
      <div class="player-main">
        ${this.renderAvatar()}
        <div class="player-info">
          <div class="player-name-row">
            <span class="player-name">${name}</span>
            ${this.renderBadges()}
          </div>
          ${this.renderSubstatus()}
        </div>
      </div>
      ${this.renderScore()}
    `;

    // Add hover interactions
    if (this.player) {
      div.addEventListener('mouseenter', () => {
        div.classList.add('hover');
      });
      div.addEventListener('mouseleave', () => {
        div.classList.remove('hover');
      });
    }

    return div;
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public update(props: PlayerRowProps): void {
    this.player = props.player;
    this.isWinner = props.isWinner || false;
    this.isLoser = props.isLoser || false;
    this.isPlaceholder = props.isPlaceholder || false;
    
    const newElement = this.render();
    this.element.replaceWith(newElement);
    this.element = newElement;
  }
}

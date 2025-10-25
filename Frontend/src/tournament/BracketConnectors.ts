/**
 * BracketConnectors Component
 * Renders neon-tinted connector lines between match cards
 */

import { Round, Match } from '../types/tournament-bracket';

interface ConnectorLine {
  fromMatchId: string;
  toMatchId: string;
  fromPosition: 'top' | 'bottom';
  color: string;
}

export class BracketConnectors {
  private svg: SVGSVGElement;
  private container: HTMLElement;
  private rounds: Round[];

  constructor(rounds: Round[], container: HTMLElement) {
    this.rounds = rounds;
    this.container = container;
    this.svg = this.createSVG();
    this.render();
  }

  private createSVG(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('bracket-connectors');
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  }

  private getMatchElement(matchId: string): HTMLElement | null {
    return this.container.querySelector(`[data-match-id="${matchId}"]`);
  }

  private calculateConnections(): ConnectorLine[] {
    const connections: ConnectorLine[] = [];

    for (let roundIndex = 0; roundIndex < this.rounds.length - 1; roundIndex++) {
      const currentRound = this.rounds[roundIndex];
      const nextRound = this.rounds[roundIndex + 1];

      // Each pair of matches in current round connects to one match in next round
      for (let i = 0; i < currentRound.matches.length; i += 2) {
        const match1 = currentRound.matches[i];
        const match2 = currentRound.matches[i + 1];
        const targetMatchIndex = Math.floor(i / 2);
        const targetMatch = nextRound.matches[targetMatchIndex];

        if (match1 && targetMatch) {
          connections.push({
            fromMatchId: match1.id,
            toMatchId: targetMatch.id,
            fromPosition: 'top',
            color: this.getConnectionColor(match1)
          });
        }

        if (match2 && targetMatch) {
          connections.push({
            fromMatchId: match2.id,
            toMatchId: targetMatch.id,
            fromPosition: 'bottom',
            color: this.getConnectionColor(match2)
          });
        }
      }
    }

    return connections;
  }

  private getConnectionColor(match: Match): string {
    switch (match.status) {
      case 'completed':
        return '#22c55e'; // green
      case 'active':
        return '#f97316'; // orange
      case 'ready':
        return '#38bdf8'; // sky
      default:
        return '#475569'; // slate
    }
  }

  private drawConnection(connection: ConnectorLine): void {
    const fromEl = this.getMatchElement(connection.fromMatchId);
    const toEl = this.getMatchElement(connection.toMatchId);

    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    // Calculate positions relative to container
    const fromX = fromRect.right - containerRect.left;
    const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;

    const toX = toRect.left - containerRect.left;
    const toY = connection.fromPosition === 'top' 
      ? toRect.top + toRect.height * 0.33 - containerRect.top
      : toRect.top + toRect.height * 0.67 - containerRect.top;

    // Create path with smooth curves
    const midX = fromX + (toX - fromX) / 2;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
    
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', connection.color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('opacity', '0.6');
    path.classList.add('connector-path');
    
    // Add glow filter
    path.style.filter = 'drop-shadow(0 0 4px ' + connection.color + ')';

    this.svg.appendChild(path);
  }

  private render(): void {
    // Clear existing paths
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    // Set SVG dimensions to match container
    const containerRect = this.container.getBoundingClientRect();
    this.svg.setAttribute('width', containerRect.width.toString());
    this.svg.setAttribute('height', containerRect.height.toString());
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.pointerEvents = 'none';
    this.svg.style.zIndex = '0';

    // Calculate and draw all connections
    const connections = this.calculateConnections();
    connections.forEach(conn => this.drawConnection(conn));
  }

  public getElement(): SVGSVGElement {
    return this.svg;
  }

  public update(rounds: Round[]): void {
    this.rounds = rounds;
    this.render();
  }

  public refresh(): void {
    // Recalculate positions (useful after window resize)
    requestAnimationFrame(() => this.render());
  }
}

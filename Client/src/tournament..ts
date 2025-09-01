import type { Match } from "./types";

export class TournamentManager {
  private size: 8 | 16;
  private aliases: string[] = [];
  private matches: Match[] = [];
  private round = 1;
  private currentIndex = 0;

  constructor(size: 8 | 16, aliases: string[]) {
    this.size = size;
    this.aliases = aliases.slice(0, size);
    const arr = this.aliases.slice();
    while (arr.length) {
      const a = arr.shift()!, b = arr.pop()!;
      this.matches.push({ a, b });
    }
  }
  current(): Match | null { return this.matches[this.currentIndex] ?? null; }
  nextRound() {
    const winners = this.matches.map((m) => m.winner!).filter(Boolean);
    if (winners.length === 1) return winners[0];
    const next: Match[] = [];
    for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1] });
    this.matches = next; this.currentIndex = 0; this.round++; return null;
  }
  reportWinner(who: string): string | null {
    const m = this.current(); if (!m) return null;
    m.winner = who; this.currentIndex++;
    if (this.currentIndex >= this.matches.length) return this.nextRound();
    return null;
  }
  getRound() { return this.round; }
  getIndex() { return this.currentIndex; }
}

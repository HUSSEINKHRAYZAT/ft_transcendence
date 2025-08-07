// src/TournamentManager.ts

type Alias = string;

interface Match {
  player1: Alias;
  player2: Alias;
  played: boolean;
}

export class TournamentManager {
  private aliases: Alias[] = [];
  private matches: Match[] = [];
  private currentMatchIndex: number = 0;

  async collectAliases(playerCount: number): Promise<Alias[]> {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'aliasOverlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); color: white; display: flex;
        flex-direction: column; align-items: center; justify-content: center;
        font-family: sans-serif; z-index: 2000;
      `;

      overlay.innerHTML = `<h2>Enter Aliases for ${playerCount} Players</h2>`;

      const form = document.createElement('form');
      form.style.display = 'flex';
      form.style.flexDirection = 'column';
      form.style.gap = '10px';

      const inputs: HTMLInputElement[] = [];
      for (let i = 0; i < playerCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Player ${i + 1} Alias`;
        input.required = true;
        inputs.push(input);
        form.appendChild(input);
      }

      const submit = document.createElement('button');
      submit.textContent = 'Start Tournament';
      submit.type = 'submit';
      form.appendChild(submit);
      overlay.appendChild(form);
      document.body.appendChild(overlay);

      form.onsubmit = e => {
        e.preventDefault();
        const names = inputs.map(input => input.value.trim()).filter(Boolean);
        if (names.length === playerCount) {
          this.aliases = names;
          document.body.removeChild(overlay);
          this.scheduleMatches();
          resolve(names);
        }
      };
    });
  }

  private scheduleMatches(): void {
    this.matches = [];
    for (let i = 0; i < this.aliases.length; i++) {
      for (let j = i + 1; j < this.aliases.length; j++) {
        this.matches.push({
          player1: this.aliases[i],
          player2: this.aliases[j],
          played: false,
        });
      }
    }
  }

  getCurrentMatch(): Match | null {
    return this.matches[this.currentMatchIndex] || null;
  }

  markCurrentMatchPlayed(): void {
    if (this.matches[this.currentMatchIndex]) {
      this.matches[this.currentMatchIndex].played = true;
      this.currentMatchIndex++;
    }
  }

  isTournamentOver(): boolean {
    return this.currentMatchIndex >= this.matches.length;
  }

  displayCurrentMatch(): void {
    const match = this.getCurrentMatch();
    const hud = document.getElementById('matchHud') || document.createElement('div');
    hud.id = 'matchHud';
    hud.style.cssText = `
      position: absolute; top: 10px; left: 10px;
      background: rgba(0,0,0,0.7); color: white;
      padding: 10px 15px; border-radius: 8px;
      font-family: sans-serif; z-index: 1000;
    `;

    if (match) {
      hud.innerHTML = `<strong>Current Match:</strong><br>${match.player1} vs ${match.player2}`;
    } else {
      hud.innerHTML = `<strong>Tournament Complete</strong>`;
    }

    if (!hud.parentElement) document.body.appendChild(hud);
  }

  reset(): void {
    this.aliases = [];
    this.matches = [];
    this.currentMatchIndex = 0;
    const hud = document.getElementById('matchHud');
    if (hud) hud.remove();
  }
}

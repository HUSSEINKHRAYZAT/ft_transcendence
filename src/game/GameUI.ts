import { markUI } from "../ui";
import type { GameConfig } from "../types";

export class GameUI {
  private scoreElems: HTMLSpanElement[] = [];
  private nameElems: HTMLSpanElement[] = [];
  private waitUI?: HTMLDivElement;
  private pauseUI?: HTMLDivElement;

  constructor(private config: GameConfig) {
    this.createScoreUI();
  }

  private createScoreUI() {
    const hud = markUI(document.createElement("div"));
    hud.className =
      "absolute top-20 left-1/2 -translate-x-1/2 text-white font-bold z-10 flex gap-4 items-center px-6 py-4 rounded-3xl bg-gradient-to-br from-gray-800/95 to-gray-900/95 border border-lime-500/30 shadow-2xl backdrop-blur-xl";
    hud.style.fontFamily = "'Orbitron', system-ui, sans-serif";
    hud.style.boxShadow =
      "0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(132, 204, 22, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)";

    const slots = this.config.playerCount === 4 ? 4 : 2;
    const colors = ["lime-500", "blue-500", "purple-500", "red-500"];
    const hexColors = ["#84cc16", "#3b82f6", "#a855f7", "#ef4444"];

    for (let i = 0; i < slots; i++) {
      const badge = document.createElement("div");
      badge.className = `flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 min-w-20 justify-center bg-gradient-to-br from-${colors[i]}/10 to-${colors[i]}/5 border-${colors[i]}/25`;
      badge.style.boxShadow = `0 4px 12px ${hexColors[i]}20, inset 0 1px 0 rgba(255,255,255,0.1)`;

      const dot = document.createElement("span");
      dot.className = `w-3 h-3 rounded-full inline-block flex-shrink-0 bg-gradient-to-br from-${colors[i]} to-${colors[i]}/80`;
      dot.style.boxShadow = `0 0 12px ${hexColors[i]}60, inset 0 1px 0 rgba(255,255,255,0.3)`;

      const playerInfo = document.createElement("div");
      playerInfo.className = "flex flex-col items-center gap-0.5";

      const label = document.createElement("span");
      label.className = `text-xs font-semibold text-${colors[i]} tracking-wider uppercase`;
      label.textContent = ["Player 1", "Player 2", "Player 3", "Player 4"][i];

      const name = document.createElement("span");
      name.className = "text-xs opacity-70 text-zinc-400";
      name.textContent =
        (this.config.displayNames && this.config.displayNames[i]) || "";

      const score = document.createElement("span");
      score.className = `font-black text-2xl min-w-8 text-center text-${colors[i]} leading-none`;
      score.style.textShadow = `0 2px 8px ${hexColors[i]}40`;
      score.textContent = "0";

      if (name.textContent) {
        playerInfo.append(label, name);
      } else {
        playerInfo.append(label);
      }

      badge.append(dot, playerInfo, score);
      hud.appendChild(badge);
      this.nameElems.push(name);
      this.scoreElems.push(score);
    }
    document.body.appendChild(hud);
  }

  public updateNamesUI(): void {
    const slots = this.config.playerCount === 4 ? 4 : 2;
    for (let i = 0; i < slots; i++) {
      if (!this.nameElems[i]) continue;
      this.nameElems[i].textContent =
        (this.config.displayNames && this.config.displayNames[i]) || "";
    }
  }

  public updateScoreUI(scores: readonly number[], lastScorer: number): void {
    const slots = this.config.playerCount === 4 ? 4 : 2;
    for (let i = 0; i < slots; i++)
      this.scoreElems[i].textContent = scores[i].toString();
    if (lastScorer >= 0) this.pulseScorer(lastScorer);
  }

  private pulseScorer(idx: number): void {
    if (idx < 0) return;
    const badge = this.scoreElems[idx].parentElement as HTMLDivElement;
    if (!badge) return;
    badge.style.boxShadow =
      "inset 0 0 0 1px rgba(255,255,255,.12), 0 0 16px rgba(255,255,255,.25)";
    badge.style.transform = "scale(1.05)";
    setTimeout(() => {
      badge.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,.08)";
      badge.style.transform = "scale(1.0)";
    }, 180);
  }

  public showWaitingOverlay(text: string): void {
    const d = markUI(document.createElement("div"));
    d.className =
      "fixed inset-0 grid place-items-center bg-black/65 text-white z-[9999] font-sans";
    d.innerHTML = `<div class="px-5 py-4 bg-gray-900 rounded-xl shadow-2xl border border-lime-500/20">
      <div id="waitText" class="text-lg text-center">${text}</div>
    </div>`;
    document.body.appendChild(d);
    this.waitUI = d as HTMLDivElement;
  }

  public updateWaitingOverlay(text: string): void {
    if (!this.waitUI) return;
    const el = this.waitUI.querySelector<HTMLDivElement>("#waitText");
    if (el) el.textContent = text;
  }

  public hideWaitingOverlay(): void {
    this.waitUI?.remove();
    this.waitUI = undefined;
  }

  public showPauseOverlay(): void {
    if (this.pauseUI) return;
    const d = markUI(document.createElement("div"));
    d.className =
      "fixed inset-0 grid place-items-center bg-black/40 text-white z-[10000] font-sans select-none";
    d.innerHTML = `<div class="px-5 py-3 bg-gray-900/90 rounded-xl shadow-2xl border border-white/15">
      <div class="text-lg text-center font-semibold tracking-wide">⏸️ Paused — press <span class="font-black">P</span> to resume</div>
    </div>`;
    document.body.appendChild(d);
    this.pauseUI = d as HTMLDivElement;
  }

  public hidePauseOverlay(): void {
    this.pauseUI?.remove();
    this.pauseUI = undefined;
  }

  public showGameEndToast(text: string): void {
    const t = markUI(document.createElement("div"));
    t.className =
      "fixed top-5 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-3 rounded-xl z-[10001] font-sans shadow-2xl border border-lime-500/20";
    t.innerHTML = `${text} &nbsp; <button id="re" class="ml-2 bg-lime-500 hover:bg-lime-600 text-black px-3 py-1 rounded-lg font-semibold transition-colors">Play again</button>`;
    document.body.appendChild(t);
    (t.querySelector("#re") as HTMLButtonElement).onclick = () =>
      location.reload();
  }
}
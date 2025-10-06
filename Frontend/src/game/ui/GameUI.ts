import { markUI } from "../../ui";
import type { GameConfig } from "../../types";

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
      badge.className = `score-badge flex items-center gap-2 px-4 py-2.5 rounded-xl border min-w-20 justify-center bg-gradient-to-br from-${colors[i]}/10 to-${colors[i]}/5 border-${colors[i]}/25`;
      badge.style.boxShadow = `0 4px 12px ${hexColors[i]}20, inset 0 1px 0 rgba(255,255,255,0.1)`;

      const dot = document.createElement("span");
      dot.className = `w-3 h-3 rounded-full inline-block flex-shrink-0 bg-gradient-to-br from-${colors[i]} to-${colors[i]}/80`;
      dot.style.boxShadow = `0 0 12px ${hexColors[i]}60, inset 0 1px 0 rgba(255,255,255,0.3)`;

      const playerInfo = document.createElement("div");
      playerInfo.className = "flex flex-col items-center gap-0.5";

      const label = document.createElement("span");
      label.className = `text-xs font-semibold text-${colors[i]} tracking-wider uppercase`;
      label.textContent = ["Player 1", "Player 2", "Player 3", "Player 4"][i];
      label.style.textShadow = `0 0 8px ${hexColors[i]}60`;

      const name = document.createElement("span");
      name.className = "text-xs opacity-70 text-zinc-400";
      name.textContent =
        (this.config.displayNames && this.config.displayNames[i]) || "";

      const score = document.createElement("span");
      score.className = `score-value font-black text-2xl min-w-8 text-center text-${colors[i]} leading-none transform-gpu`;
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
    const score = this.scoreElems[idx];
    if (!badge || !score) return;
    
    // Enhanced 3D pulse effect
    badge.style.boxShadow =
      "inset 0 0 0 1px rgba(255,255,255,.12), 0 0 30px rgba(255,255,255,.4), 0 0 50px rgba(132, 204, 22, 0.6)";
    badge.style.transform = "translateY(-10px) rotateX(15deg) rotateY(5deg) scale(1.15)";
    badge.style.filter = "brightness(1.3)";
    
    // Score number explosion effect
    score.style.transform = "scale(1.5) rotateZ(10deg)";
    score.style.filter = "drop-shadow(0 0 15px currentColor)";
    
    setTimeout(() => {
      badge.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,.08)";
      badge.style.transform = "translateY(0px) rotateX(0deg) rotateY(0deg) scale(1.0)";
      badge.style.filter = "brightness(1)";
      score.style.transform = "scale(1) rotateZ(0deg)";
      score.style.filter = "none";
    }, 300);
  }

  public showWaitingOverlay(text: string): void {
    const d = markUI(document.createElement("div"));
    d.className =
      "fixed inset-0 grid place-items-center bg-black/65 text-white z-[9999] font-sans backdrop-blur-sm";
    d.innerHTML = `<div class="px-6 py-5 bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-2xl shadow-2xl border border-lime-500/30 backdrop-blur-xl" style="box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(132, 204, 22, 0.2);">
      <div class="text-xl font-semibold mb-2 text-lime-500 text-center" style="text-shadow: 0 0 15px rgba(132, 204, 22, 0.6);">⏳ Waiting for Players...</div>
      <div class="text-sm text-center opacity-80 text-zinc-300">${text}</div>
      <div class="mt-3 flex justify-center"><div class="w-12 h-1.5 bg-gradient-to-r from-transparent via-lime-500 to-transparent rounded-full" style="box-shadow: 0 0 10px rgba(132, 204, 22, 0.5);"></div></div>
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
      "fixed inset-0 grid place-items-center bg-black/40 text-white z-[10000] font-sans select-none backdrop-blur-sm";
    d.innerHTML = `<div class="px-6 py-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl" style="box-shadow: 0 15px 40px rgba(0,0,0,0.5);">
      <div class="text-xl text-center font-bold tracking-wide" style="text-shadow: 0 0 15px rgba(255,255,255,0.4);">⏸️ Paused — press <span class="font-black text-lime-400" style="text-shadow: 0 0 10px rgba(132, 204, 22, 0.8);">P</span> to resume</div>
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
      "fixed top-8 left-1/2 -translate-x-1/2 bg-gradient-to-br from-black/80 to-gray-900/80 text-white px-6 py-4 rounded-2xl z-[10001] font-sans shadow-2xl border border-lime-500/30 backdrop-blur-xl";
    t.style.boxShadow = "0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(132, 204, 22, 0.2)";
    t.innerHTML = `<span style="text-shadow: 0 0 10px rgba(132, 204, 22, 0.6); font-weight: 600;">${text}</span> &nbsp; <button id="re" class="ml-3 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-black px-4 py-2 rounded-xl font-bold" style="box-shadow: 0 4px 15px rgba(132, 204, 22, 0.4);">Play again</button>`;
    document.body.appendChild(t);
    (t.querySelector("#re") as HTMLButtonElement).onclick = () =>
      location.reload();
  }
}

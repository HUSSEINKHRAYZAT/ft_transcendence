import type { GameConfig } from "../types";
import { clearPongUI } from "../ui";
import { ThemeBridge as themeBridge } from "../game";
import { createMenuRoot } from "../menu";
import { injectMenuStyles } from "../styles/menuStyles";
import { getFrontendUser } from "../auth";
import {
  createSocketIORoom,
  joinSocketIORoom,
  startLocal2P,
  startVsAI,
  startVs3AI
} from "../menu";


export class Menu {
  static async render(): Promise<GameConfig> {
    clearPongUI();

    // afayad // the themeRridge ma kenit shaghale aslan.
    const you = getFrontendUser();
    const tb = themeBridge.getInstance(); // ✅ Create singleton instance
    const theme = tb.getCurrentTheme();   
    const primaryHex = tb.color3ToHex(theme.primary);

    const { root } = createMenuRoot({ youName: you?.name ?? null });
    injectMenuStyles(primaryHex);
    document.body.appendChild(root);

    // live AI level readout
    const aiSlider = root.querySelector("#aiSlider") as HTMLInputElement | null;
    const aiVal = root.querySelector("#aiVal") as HTMLSpanElement | null;
    if (aiSlider && aiVal) {
      aiSlider.addEventListener(
        "input",
        () => (aiVal.textContent = aiSlider.value)
      );
    }

    return new Promise((resolve) => {
      root.addEventListener("click", (e) => {
        const t = e.target as HTMLElement | null;
        const a = t?.dataset.action;
        if (!a) return;

        if (a === "back") {
          root.remove();
          window.location.href = "/";
          return;
        }

        if (a === "local2") {
          root.remove();
          startLocal2P(you, resolve);
          return;
        }

        if (a === "ai2") {
          const lvl = parseInt(aiSlider?.value ?? "6", 10);
          root.remove();
          startVsAI(lvl, you, resolve);
          return;
        }
        if (a === "ai3") {
          const lvl = parseInt(aiSlider?.value ?? "6", 10);
          root.remove();
          startVs3AI(lvl, you, resolve);
          return;
        }

        if (a === "sockethost2") {
          createSocketIORoom("2p", you, (cfg) => {
            root.remove();
            resolve(cfg);
          });
          return;
        }
        if (a === "socketjoin2") {
          joinSocketIORoom("2p", you, (cfg) => {
            root.remove();
            resolve(cfg);
          });
          return;
        }
        if (a === "sockethost4") {
          createSocketIORoom("4p", you, (cfg) => {
            root.remove();
            resolve(cfg);
          });
          return;
        }
        if (a === "socketjoin4") {
          joinSocketIORoom("4p", you, (cfg) => {
            root.remove();
            resolve(cfg);
          });
          return;
        }

        // Tournament actions - trigger modal functions from main.ts
        if (a === "tournament-create") {
          root.remove();
          // Call the global function from main.ts
          if ((window as any).selectGameMode) {
            (window as any).selectGameMode('create-tournament');
          }
          return;
        }
        
        if (a === "tournament-join") {
          root.remove();
          // Call the global function from main.ts
          if ((window as any).selectGameMode) {
            (window as any).selectGameMode('join-tournament');
          }
          return;
        }
      });
    });
  }
}

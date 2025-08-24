import type { GameConfig } from "../types";
import { clearPongUI, markUI } from "../ui";
import { themeBridge } from "../game/ThemeBridge";
import { createMenuRoot } from "./MenuView";
import { injectMenuStyles } from "../ui/menuStyles";
import { getFrontendUser } from "../auth/session";
import {
  createSocketIORoom,
  joinSocketIORoom,
  startLocal2P,
  startVsAI,
  createTournament,
  startVs3AI
} from "./MenuActions";

export class Menu {
  static async render(): Promise<GameConfig> {
    clearPongUI();

    const you = getFrontendUser();
    const theme = themeBridge.getCurrentTheme();
    const primaryHex = themeBridge.color3ToHex(theme.primary);

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

    // Wire actions — call only, implementations live in MenuActions
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
        if (a === "tourn") {
          createTournament();
          return;
        }
      });
    });
  }
}

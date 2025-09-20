import { markUI } from "../../ui";
import { GameChat, type ChatUser } from "../ui/GameChat";
import { themeBridge, type GameThemeColors } from "../utils/ThemeBridge";
import { StandardMaterial } from "@babylonjs/core";

// Frontend helpers extracted from Pong3D — accept `self: any` to avoid a large refactor.
export function createScoreUI(self: any) {
  const hud = markUI(document.createElement("div"));
  hud.className =
    "absolute top-20 left-1/2 -translate-x-1/2 text-white font-bold z-10 flex gap-4 items-center px-6 py-4 rounded-3xl bg-gradient-to-br from-gray-800/95 to-gray-900/95 border border-lime-500/30 shadow-2xl backdrop-blur-xl";
  hud.style.fontFamily = "'Orbitron', system-ui, sans-serif";
  hud.style.boxShadow =
    "0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(132, 204, 22, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)";

  const slots = self.config.playerCount === 4 ? 4 : 2;
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
      (self.config.displayNames && self.config.displayNames[i]) || "";

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
    self.nameElems.push(name);
    self.scoreElems.push(score);
  }
  document.body.appendChild(hud);
}

export function updateNamesUI(self: any) {
  const slots = self.config.playerCount === 4 ? 4 : 2;
  for (let i = 0; i < slots; i++) {
    if (!self.nameElems[i]) continue;
    self.nameElems[i].textContent =
      (self.config.displayNames && self.config.displayNames[i]) || "";
  }
}

export function pulseScorer(self: any, idx: number) {
  if (idx < 0) return;
  const badge = self.scoreElems[idx].parentElement as HTMLDivElement;
  if (!badge) return;
  badge.style.boxShadow =
    "inset 0 0 0 1px rgba(255,255,255,.12), 0 0 16px rgba(255,255,255,.25)";
  badge.style.transform = "scale(1.05)";
  setTimeout(() => {
    badge.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,.08)";
    badge.style.transform = "scale(1.0)";
  }, 180);
}

export function updateScoreUI(self: any) {
  const slots = self.config.playerCount === 4 ? 4 : 2;
  for (let i = 0; i < slots; i++)
    self.scoreElems[i].textContent = self.gameState.scores[i].toString();
  if (self.gameState.lastScorer >= 0) pulseScorer(self, self.gameState.lastScorer);
}

export function showWaitingOverlay(self: any, text: string) {
  const d = markUI(document.createElement("div"));
  d.className =
    "fixed inset-0 grid place-items-center bg-black/65 text-white z-[9999] font-sans";
  d.innerHTML = `<div class="px-5 py-4 bg-gray-900 rounded-xl shadow-2xl border border-lime-500/20">
      <div id="waitText" class="text-lg text-center">${text}</div>
    </div>`;
  document.body.appendChild(d);
  self.waitUI = d as HTMLDivElement;
}

export function updateWaitingOverlay(self: any, text: string) {
  if (!self.waitUI) return;
  const el = self.waitUI.querySelector("#waitText") as HTMLDivElement | null;
  if (el) el.textContent = text;
}

export function hideWaitingOverlay(self: any) {
  self.waitUI?.remove();
  self.waitUI = undefined;
}

export function updateGameTheme(self: any, newTheme: GameThemeColors) {
  console.log("🎮 Updating game colors for new theme");

  self.currentGameTheme = newTheme;

  // Update scene background
  self.scene.clearColor = newTheme.background;

  // Update ball color
  if (self.ball && self.ball.material) {
    const ballMat = self.ball.material as StandardMaterial;
    if (ballMat.emissiveColor) {
      ballMat.emissiveColor = newTheme.ball.scale(0.3);
    }
  }

  // Update paddle colors
  self.paddles.forEach((paddle: any, index: number) => {
    if (paddle.material) {
      const paddleMat = paddle.material as StandardMaterial;
      const newColor = themeBridge.getPaddleColor(index);

      if (paddleMat.diffuseColor) {
        paddleMat.diffuseColor = newColor;
      }
      if (paddleMat.emissiveColor) {
        paddleMat.emissiveColor = newColor.scale(0.6);
      }
    }
  });

  // Update obstacle colors
  self.obstacles.forEach((obstacle: any, index: number) => {
    if (obstacle.material) {
      const obstacleMat = obstacle.material as StandardMaterial;
      const newColor = themeBridge.getObstacleColor(index);

      if (obstacleMat.diffuseColor) {
        obstacleMat.diffuseColor = newColor;
      }
      if (obstacleMat.emissiveColor) {
        obstacleMat.emissiveColor = newColor.scale(0.3);
      }
    }
  });

  console.log("✅ Game colors updated successfully");
}

export function initializeChat(self: any) {
  if (self.config.connection === "ai" || self.config.connection === "ai3" || self.config.connection === "local") {
    console.log("💬 Chat disabled for AI mode");
    return;
  }

  let currentUser: ChatUser = {
    id: "player-" + Date.now(),
    name: "Player",
    isConnected: true,
  };

  try {
    const userData = localStorage.getItem("ft_pong_user_data");
    if (userData) {
      const user = JSON.parse(userData);
      currentUser = {
        id: user.id || currentUser.id,
        name: user.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : user.userName || user.email || "Player",
        isConnected: true,
      };
    }
  } catch (error) {
    console.warn("Could not load user data for chat:", error);
  }

  const gameContainer = document.querySelector("#gameContainer") || document.body;

  self.gameChat = new GameChat(gameContainer as HTMLElement, currentUser, self.ws || undefined);

  self.gameChat.addSystemMessage(`Welcome to the game, ${currentUser.name}! 🎮`);

  if (self.config.playerCount > 1) {
    self.gameChat.addSystemMessage("Chat with other players during the game!");
  }

  console.log("💬 Game chat initialized for user:", currentUser.name);
}

export function getPlayerName(self: any, playerIndex: number): string {
  if (self.config.displayNames && self.config.displayNames[playerIndex]) {
    return self.config.displayNames[playerIndex];
  }
  return `Player ${playerIndex + 1}`;
}

export function showPauseOverlay(self: any) {
  self.hidePauseOverlay?.();
  const overlay = document.createElement("div");
  overlay.id = "pause-overlay";
  overlay.className =
    "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
  overlay.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-8 text-center border-2 border-lime-500">
        <div class="text-6xl mb-4">⏸️</div>
        <div class="text-2xl font-bold text-lime-500 mb-2">PAUSED</div>
        <div class="text-gray-300">Press P to resume</div>
      </div>
    `;
  document.body.appendChild(overlay);
}

export function hidePauseOverlay(self: any) {
  void self;
  const overlay = document.getElementById("pause-overlay");
  if (overlay) overlay.remove();
}

export function endAndToast(self: any, text: string) {
  void self;
  const t = markUI(document.createElement("div"));
  t.className =
    "fixed top-5 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-3 rounded-xl z-[10001] font-sans shadow-2xl border border-lime-500/20";
  t.innerHTML = `${text} &nbsp; <button id="re" class="ml-2 bg-lime-500 hover:bg-lime-600 text-black px-3 py-1 rounded-lg font-semibold transition-colors">Play again</button>`;
  document.body.appendChild(t);
  (t.querySelector("#re") as HTMLButtonElement).onclick = () => location.reload();
}

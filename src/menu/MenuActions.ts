import type { GameConfig, PlayerCount } from "../types";
import { CameraConfig } from "../game/camconfig";
import { socketManager } from "../network/SocketManager";
import { ApiClient } from "../api";
import { overlay } from "../ui/overlay";
import { requireLogin } from "../auth/session";

export function startLocal2P(currentUser: any, onResolve: (cfg: GameConfig)=>void) {
  const cfg: GameConfig = {
    playerCount: 2,
    connection: "local",
    winScore: 10,
    currentUser: currentUser || null,
    displayNames: ["Player One", "Player Two"],
  };
  CameraConfig.radius = 19;
  onResolve(cfg);
}

export function startVsAI(aiLevel: number, currentUser: any, onResolve: (cfg: GameConfig)=>void) {
  const cfg: GameConfig = {
    playerCount: 2,
    connection: "ai",
    aiDifficulty: aiLevel,
    winScore: 10,
    currentUser: currentUser || null,
    displayNames: [`AI (Level ${aiLevel})`, currentUser?.name || "You"],
  };
  CameraConfig.radius = 19;
  onResolve(cfg);
}
// ADD this near the other exports
export function startVs3AI(aiLevel: number, currentUser: any, onResolve: (cfg: GameConfig)=>void) {
  const cfg: GameConfig = {
    playerCount: 4,
    connection: "ai3",          // 3AI mode connection type
    aiDifficulty: aiLevel,
    winScore: 10,
    currentUser: currentUser || null,
    displayNames: [
      currentUser?.name || "You",
      `LEFT`,
      `BOTTOM`,
      `TOP`,
    ],
  };
  CameraConfig.radius = 30;
  onResolve(cfg);
}


// === Socket.IO Only (old host/join removed) ===
export async function createSocketIORoom(gameMode: '2p' | '4p', currentUser: any, onResolve: (cfg: GameConfig)=>void) {
  const playerCount: PlayerCount = gameMode === '2p' ? 2 : 4;
  const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
  const playerNameDefault = currentUser?.name ? `${currentUser.name}_Host` : `Host_${sessionId}`;

  const nameOv = overlay(`<div class="card">
    <div style="font-weight:700; margin-bottom:16px; color:#84cc16; font-size:18px;">🎯 Host ${gameMode.toUpperCase()} Game</div>
    <div style="margin-bottom:12px; color:#d1d5db;">Enter your player name:</div>
    <div style="margin:16px 0;">
      <input id="hostPlayerName" placeholder="Enter your name" value="${currentUser?.name || ''}" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:2px solid #374151; border-radius:8px; text-align:center; font-size:16px; color:#84cc16;" maxlength="20">
    </div>
    <div style="display:flex; gap:12px; margin-top:20px;">
      <button class="btn btn-outline" data-close style="flex:1;">Cancel</button>
      <button class="btn btn-primary" id="createRoomBtn" style="flex:1;">Create Room</button>
    </div>
  </div>`);

  const createBtn = nameOv.querySelector("#createRoomBtn") as HTMLButtonElement;
  const nameInput = nameOv.querySelector("#hostPlayerName") as HTMLInputElement;

  createBtn.onclick = async () => {
    const finalPlayerName = (nameInput.value.trim() || playerNameDefault).slice(0, 20);
    nameOv.remove();

    const ov = overlay(`<div class="card">
      <div style="font-weight:700; margin-bottom:8px;">🔌 Connecting to Socket.IO server…</div>
      <div class="muted">Please wait…</div>
    </div>`);

    try {
      const serverAvailable = await (socketManager.constructor as any).checkServerAvailability();
      if (!serverAvailable) {
        ov.innerHTML = `<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">❌ Server Unavailable</div>
          <div class="muted">Socket.IO server is not running. Please start the server.</div>
          <div style="margin:8px 0; padding:8px; background:black/20; border-radius:8px; font-family:monospace; font-size:12px;">
            cd server<br>npm install<br>node server.js
          </div>
          <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
        </div>`;
        return;
      }

      await socketManager.connect(finalPlayerName);
      ov.innerHTML = `<div class="card"><div style="font-weight:700; margin-bottom:8px;">🏠 Creating ${gameMode.toUpperCase()} room…</div><div class="muted">Setting up multiplayer session…</div></div>`;
      const roomId = await socketManager.createRoom(gameMode);
      if (!roomId) throw new Error('Failed to create room');

      ov.innerHTML = `<div class="card">
        <div style="font-weight:700; margin-bottom:16px; color:#84cc16; font-size:18px;">✅ Room Created Successfully!</div>
        <div style="margin-bottom:12px; color:#d1d5db;">Share this room ID with other players:</div>
        <div style="font-size:28px; font-weight:800; margin:16px 0; padding:16px; background:rgba(0,0,0,0.4); border-radius:12px; text-align:center; border:2px solid #84cc16; color:#84cc16; letter-spacing:2px; font-family:monospace;">${roomId}</div>
        <div style="margin-bottom:16px; color:#9ca3af; text-align:center;">Other players can join using this code</div>
        <div style="display:flex; gap:12px; margin-top:20px;">
          <button class="btn btn-outline" data-close style="flex:1;">Cancel</button>
          <button class="btn btn-primary" data-start style="flex:1;">Start Game</button>
        </div>
      </div>`;

      (ov.querySelector("[data-start]") as HTMLButtonElement).onclick = () => {
        ov.remove();
        onResolve({
          playerCount,
          connection: gameMode === '2p' ? "remoteHost" : "remote4Host",
          roomId,
          winScore: 10,
          currentUser,
          displayNames: gameMode === '2p' ? [finalPlayerName || "Host", "Waiting…"] : [finalPlayerName || "Host", "…", "…", "…"],
        });
      };
    } catch (error: any) {
      ov.innerHTML = `<div class="card">
        <div style="font-weight:700; margin-bottom:8px;">❌ Connection Failed</div>
        <div class="muted">${error?.message || "Could not connect to Socket.IO server"}</div>
        <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
      </div>`;
    }
  };
}

export async function joinSocketIORoom(gameMode: '2p' | '4p', currentUser: any, onResolve: (cfg: GameConfig)=>void) {
  const playerCount: PlayerCount = gameMode === '2p' ? 2 : 4;
  const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
  const defaultGuest = currentUser?.name ? `${currentUser.name}_Guest` : `Guest_${sessionId}`;

  const ov = overlay(`<div class="card">
    <div style="font-weight:700; margin-bottom:16px; color:#3b82f6; font-size:18px;">🔗 Join ${gameMode.toUpperCase()} Room</div>
    <div style="margin-bottom:12px; color:#d1d5db;">Enter your name and room ID:</div>
    <div style="margin:16px 0;">
      <input id="guestPlayerName" placeholder="Enter your name" value="${currentUser?.name || ''}" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:2px solid #374151; border-radius:8px; text-align:center; font-size:16px; color:#84cc16; margin-bottom:12px;" maxlength="20">
      <input id="roomId" placeholder="ABC123" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:2px solid #374151; border-radius:8px; text-align:center; font-size:20px; font-weight:600; text-transform:uppercase; letter-spacing:2px; color:#84cc16; font-family:monospace;" maxlength="6">
    </div>
    <div style="display:flex; gap:12px; margin-top:20px;">
      <button class="btn btn-outline" data-close style="flex:1;">Cancel</button>
      <button class="btn btn-primary" id="joinRoomBtn" style="flex:1;">Join Room</button>
    </div>
  </div>`);

  const btn = ov.querySelector("#joinRoomBtn") as HTMLButtonElement;
  const inp = ov.querySelector("#roomId") as HTMLInputElement;
  const nameInp = ov.querySelector("#guestPlayerName") as HTMLInputElement;

  btn.onclick = async () => {
    btn.disabled = true;
    const roomId = inp.value.trim().toUpperCase();
    const finalPlayerName = (nameInp.value.trim() || defaultGuest).slice(0, 20);

    if (!roomId) {
      btn.disabled = false;
      (ov.querySelector(".muted") as HTMLElement).textContent = "Please enter a room ID.";
      return;
    }

    try {
      ov.innerHTML = `<div class="card"><div style="font-weight:700; margin-bottom:8px;">🔌 Connecting to Socket.IO server…</div><div class="muted">Please wait…</div></div>`;

      const serverAvailable = await (socketManager.constructor as any).checkServerAvailability();
      if (!serverAvailable) {
        ov.innerHTML = `<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">❌ Server Unavailable</div>
          <div class="muted">Socket.IO server is not running. Please start the server.</div>
          <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
        </div>`;
        return;
      }

      await socketManager.connect(finalPlayerName);

      ov.innerHTML = `<div class="card"><div style="font-weight:700; margin-bottom:8px;">🚪 Joining room ${roomId}…</div><div class="muted">Connecting to other players…</div></div>`;
      const success = await socketManager.joinRoom(roomId);
      if (!success) throw new Error('Failed to join room');

      ov.remove();
      onResolve({
        playerCount,
        connection: gameMode === '2p' ? "remoteGuest" : "remote4Guest",
        roomId,
        winScore: 10,
        currentUser,
        displayNames: gameMode === '2p' ? [finalPlayerName || "Guest", "Host"] : [finalPlayerName || "Guest", "…", "…", "…"],
      });
    } catch (error: any) {
      ov.innerHTML = `<div class="card">
        <div style="font-weight:700; margin-bottom:8px;">❌ Join Failed</div>
        <div class="muted">${error?.message || "Could not join room. Room may be full or not exist."}</div>
        <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
      </div>`;
    }
  };
}

export async function createTournament(onResolveDone?: ()=>void) {
  // throws if not signed in
  const { user } = requireLogin(overlay);
  const sizeSel = document.querySelector<HTMLSelectElement>("#tSize");
  const size = parseInt(sizeSel?.value ?? "8", 10) as 8 | 16;

  const ov = overlay(`<div class="card">
    <div style="font-weight:700; margin-bottom:8px;">Create Tournament (${size})</div>
    <div class="muted">Fetching online players…</div>
  </div>`);

  const players = await ApiClient.listOnlinePlayers();
  if (!players.length) {
    ov.innerHTML = `<div class="card">
      <div style="font-weight:700; margin-bottom:8px;">No online players</div>
      <div class="muted">Ask players to sign in and come online.</div>
      <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
    </div>`;
    return;
  }

  ov.innerHTML = `<div class="card">
    <div style="font-weight:700; margin-bottom:8px;">Select ${size} players</div>
    <div style="max-height:280px; overflow:auto; margin:8px 0;">
      ${players.map((p: any) => `
        <label style="display:flex; align-items:center; gap:8px; margin:6px 0;">
          <input type="checkbox" value="${p.id}"> ${p.name}
        </label>`).join("")}
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div class="muted">You’re included automatically if selected.</div>
      <button class="btn" id="go">Create</button>
    </div>
  </div>`;

  (ov.querySelector("#go") as HTMLButtonElement).onclick = async () => {
    const ids = Array.from(ov.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map((i) => i.value);
    if (ids.length !== size) { alert(`Please select exactly ${size} players.`); return; }
    try {
      const { code } = await ApiClient.createTournament({ size, participants: ids });
      ov.innerHTML = `<div class="card">
        <div style="font-weight:700; margin-bottom:6px;">Tournament Created</div>
        <div class="muted">Share this code with participants:</div>
        <div style="font-size:20px; font-weight:800; margin:6px 0;"><code>${code}</code></div>
        <div class="muted">When each match starts, results will post to your DB automatically.</div>
        <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Done</button></div>
      </div>`;
      onResolveDone?.();
    } catch (e: any) {
      ov.innerHTML = `<div class="card">
        <div style="font-weight:700; margin-bottom:8px;">Couldn’t create tournament</div>
        <div class="muted">${e?.message || "Please try again."}</div>
        <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
      </div>`;
    }
  };
}

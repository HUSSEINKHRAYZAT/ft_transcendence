import type { GameConfig, PlayerCount } from "../types";
import { CameraConfig } from "../game/config/camconfig";
import { socketManager } from "../services/SocketManager";
import { ApiClient } from "../api";
import { overlay } from "../game/ui/overlay";
import { FriendInviteModal } from "../components/modals/FriendInviteModal";
import { themeBridge } from "../game/utils/ThemeBridge";
import { t, languageManager } from "../langs";
import { API_BASE_URL } from "../utils/Constants";

function startLocal2P(currentUser: any, onResolve: (cfg: GameConfig) => void) {
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

function startVsAI(aiLevel: number, currentUser: any, onResolve: (cfg: GameConfig) => void) {
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
function startVs3AI(aiLevel: number, currentUser: any, onResolve: (cfg: GameConfig) => void) {
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

// === Web socket Only (new UI) ===
async function createSocketIORoom(gameMode: '2p' | '4p', currentUser: any, onResolve: (cfg: GameConfig) => void) {
    await languageManager.whenReady();
    const tr = (key: string) => languageManager.translateIfAvailable(key) ?? key;

    // Check if user can join a new game
    const sessionCheck = await ApiClient.checkUserCanJoin('game');
    if (!sessionCheck.canJoin) {
        overlay(getStyledCard(`<div style="font-weight:700; margin-bottom:16px; color:#ef4444; font-size:18px;">⚠️ ${tr('Cannot Create Game')}</div>
      <div style="margin-bottom:16px; color:#d1d5db;">${sessionCheck.reason}</div>
      <div style="margin-top:20px; text-align:right;">
        <button class="glass-button" data-close>${tr('Got it!')}</button>
      </div>`));
        return;
    }

    const theme = themeBridge.getCurrentTheme();
    const primaryHex = themeBridge.color3ToHex(theme.primary);

    const playerCount: PlayerCount = gameMode === '2p' ? 2 : 4;
    const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const playerNameDefault = currentUser?.name ? `${currentUser.name}_Host` : `Host_${sessionId}`;

    const nameOv = overlay(getStyledCard(`
    <h2 style="font-weight:700; margin-bottom:20px; color:${primaryHex}; font-size:20px; text-align:center;">
      🎯 ${tr('Host')} <span style="color:#facc15;">${gameMode.toUpperCase()}</span> ${tr('Game')}
    </h2>
    <label for="hostPlayerName" style="display:block; margin-bottom:8px; color:#e5e7eb; font-size:18px; font-weight:700;">
      🎮 ${tr('Your player name')}:
    </label>
    <input
      id="hostPlayerName"
      type="text"
      value="${currentUser?.name || ''}"
      maxlength="20"
      disabled
      style="width:100%; padding:12px; background:rgba(31,41,55,0.6); border:2px solid #374151; border-radius:10px; text-align:center; font-size:16px; color:#9ca3af; cursor:not-allowed;"
    />
    <div style="display:flex; gap:12px; margin-top:28px;">
      <button class="glass-button" data-close style="flex:1; padding:12px; border-radius:10px; font-size:15px;">
        ${tr('Cancel')}
      </button>
      <button class="glass-button" id="createRoomBtn" style="flex:1; padding:12px; border-radius:10px; font-size:15px;">
        ${tr('Create Room')}
      </button>
    </div>
  `));

    const createBtn = nameOv.querySelector("#createRoomBtn") as HTMLButtonElement;
    const nameInput = nameOv.querySelector("#hostPlayerName") as HTMLInputElement;

    createBtn.onclick = async () => {
        const finalPlayerName = (nameInput.value.trim() || playerNameDefault).slice(0, 20);
        nameOv.remove();

        const loadingOv = overlay(getStyledCard(`<div style="font-weight:700; margin-bottom:8px;">🔌 ${tr('Connecting to Web socket server…')}</div>
      <div style="margin-bottom:16px; color:#d1d5db;">${tr('Please wait…')}</div>`));

        try {
            const serverAvailable = await (socketManager.constructor as any).checkServerAvailability();
            if (!serverAvailable) {
                loadingOv.innerHTML = getStyledCard(`<div style="font-weight:700; margin-bottom:8px;">❌ ${tr('Server Unavailable')}</div>
          <div style="margin-bottom:16px; color:#d1d5db;">${tr('Web socket server is not running. Please start the server.')}</div>
          <div style="margin:8px 0; padding:8px; background:black/20; border-radius:8px; font-family:monospace; font-size:12px;">
            cd server<br>npm install<br>node server.js
          </div>
          <div style="margin-top:10px; text-align:right;"><button class="glass-button" data-close>${tr('Close')}</button></div>`);
                return;
            }

            await socketManager.connect(finalPlayerName);
            loadingOv.innerHTML = getStyledCard(`<div style="font-weight:700; margin-bottom:8px;">🏠 ${tr('Creating')} ${gameMode.toUpperCase()} ${tr('room…')}</div><div style="margin-bottom:16px; color:#d1d5db;">${tr('Setting up multiplayer session…')}</div>`);
            const roomId = await socketManager.createRoom(gameMode);
            if (!roomId)
                throw new Error(tr('Failed to create room'));

            loadingOv.innerHTML = getStyledCard(`
        <div style="font-weight:700; margin-bottom:16px; color:#84cc16; font-size:18px;">✅ ${tr('Room Created Successfully!')}</div>
        <div style="margin-bottom:12px; color:#d1d5db;">${tr('Share this room ID with other players')}:</div>
        <div style="font-size:28px; font-weight:800; margin:16px 0; padding:16px; background:rgba(0,0,0,0.4); border-radius:12px; text-align:center; border:2px solid #84cc16; color:#84cc16; letter-spacing:2px; font-family:monospace;">${roomId}</div>
        <div style="margin-bottom:16px; color:#9ca3af; text-align:center;">${tr('Other players can join using this code')}</div>
        <div id="room-status" style="margin-bottom:16px; color:#f59e0b; text-align:center; font-weight:600;">⏳ ${tr('Waiting for players to join...')}</div>
        <div style="display:flex; gap:8px; margin-top:20px;">
          <button class="glass-button" data-close style="flex:1;">${tr('Cancel')}</button>
          <button class="glass-button" id="invite-friends-btn" style="flex:1;">🎯 ${tr('Invite Friends')}</button>
          <button class="glass-button" id="start-game-btn" data-start style="flex:1; opacity:0.5;" disabled>${tr('Start Game')}</button>
        </div>
      `);

            const startBtn = loadingOv.querySelector("#start-game-btn") as HTMLButtonElement;
            const inviteBtn = loadingOv.querySelector("#invite-friends-btn") as HTMLButtonElement;

            // Invite button is always enabled now - the modal will handle the logic internally

            // Track player count to enable/disable start button
            let connectedPlayers = 1; // Host is already connected
            const updateStartButton = () => {
                const statusDiv = loadingOv.querySelector("#room-status");
                if (connectedPlayers >= (gameMode === '2p' ? 2 : 4)) {
                    startBtn.disabled = false;
                    startBtn.style.opacity = '1';
                    if (statusDiv) statusDiv.textContent = `✅ ${t('Ready to start!')} (${connectedPlayers}/${gameMode === '2p' ? 2 : 4} ${t('players')})`;
                } else {
                    startBtn.disabled = true;
                    startBtn.style.opacity = '0.5';
                    if (statusDiv) statusDiv.textContent = `⏳ ${t('Waiting for players...')} (${connectedPlayers}/${gameMode === '2p' ? 2 : 4} ${t('players')})`;
                }
            };

            // Listen for players joining
            socketManager.on('player_joined', (player) => {
                connectedPlayers++;
                updateStartButton();
            });

            socketManager.on('player_left', (playerId) => {
                connectedPlayers = Math.max(1, connectedPlayers - 1); // Host stays
                updateStartButton();
            });

            startBtn.onclick = () => {
                if (connectedPlayers >= (gameMode === '2p' ? 2 : 4)) {
                    loadingOv.remove();
                    onResolve({
                        playerCount,
                        connection: gameMode === '2p' ? "remoteHost" : "remote4Host",
                        roomId,
                        winScore: 10,
                        currentUser,
                        displayNames: gameMode === '2p' ? [currentUser?.name || finalPlayerName || "Host", "Waiting…"] : [currentUser?.name || finalPlayerName || "Host", "…", "…", "…"],
                    });
                }
            };

            // Invite friends button handler
            inviteBtn.onclick = async () => {
                try {
                    // Disable button while loading
                    const originalText = inviteBtn.textContent;
                    inviteBtn.disabled = true;
                    inviteBtn.textContent = t('Loading friends...');

                    const token = localStorage.getItem('ft_pong_token') || '';
                    const friendInviteModal = new FriendInviteModal(token);
                    await friendInviteModal.show(roomId, gameMode, currentUser?.name || finalPlayerName);

                } catch (error: any) {
                    // Show user-friendly error message
                    if ((window as any).notifyBox) {
                        (window as any).notifyBox.addNotification(
                            error?.message || t('Unable to load friends list'),
                            'error'
                        );
                    }
                } finally {
                    // Re-enable button
                    inviteBtn.disabled = false;
                    inviteBtn.textContent = `🎯 ${tr('Invite Friends')}`;
                }
            };

            // Initial button state check
            updateStartButton();
        } catch (error: any) {
            loadingOv.innerHTML = getStyledCard(`<div style="font-weight:700; margin-bottom:8px;">❌ ${t('Connection Failed')}</div>
        <div style="margin-bottom:16px; color:#d1d5db;">${error?.message || t("Could not connect to Web socket server")}</div>
        <div style="margin-top:10px; text-align:right;"><button class="glass-button" data-close>${t('Close')}</button></div>`);
        }
    };
}

async function joinSocketIORoom(gameMode: '2p' | '4p', currentUser: any, onResolve: (cfg: GameConfig) => void) {
    // Check if user can join a new game
    const sessionCheck = await ApiClient.checkUserCanJoin('game');
    if (!sessionCheck.canJoin) {
        overlay(getStyledCard(`<div style="font-weight:700; margin-bottom:16px; color:#ef4444; font-size:18px;">⚠️ ${t('Cannot Join Game')}</div>
      <div style="margin-bottom:16px; color:#d1d5db;">${sessionCheck.reason}</div>
      <div style="margin-top:20px; text-align:right;">
        <button class="glass-button" data-close>${t('Got it!')}</button>
      </div>`));
        return;
    }

    const theme = themeBridge.getCurrentTheme();
    const primaryHex = themeBridge.color3ToHex(theme.primary);

    const playerCount: PlayerCount = gameMode === '2p' ? 2 : 4;
    const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const defaultGuest = currentUser?.name ? `${currentUser.name}_Guest` : `Guest_${sessionId}`;

    const ov = overlay(getStyledCard(`
    <h2 style="font-weight:700; margin-bottom:20px; color:${primaryHex}; font-size:20px; text-align:center;">
      🔗 ${t('Join')} <span style="color:#facc15;">${gameMode.toUpperCase()}</span> ${t('Room')}
    </h2>
    <p style="margin-bottom:16px; color:#d1d5db; text-align:center; font-size:14px;">
      ${t('Enter your room ID below')}:
    </p>
    <label for="guestPlayerName" style="display:block; margin-bottom:6px; color:#e5e7eb; font-size:14px; font-weight:500;">
      ${t('Your name')}
    </label>
    <input
      id="guestPlayerName"
      type="text"
      value="${currentUser?.name || ''}"
      maxlength="20"
      disabled
      style="width:100%; padding:12px; background:rgba(31,41,55,0.6); border:2px solid #374151; border-radius:10px; text-align:center; font-size:16px; color:#9ca3af; margin-bottom:14px; cursor:not-allowed;"
    />
    <label for="roomId" style="display:block; margin-bottom:6px; color:#e5e7eb; font-size:14px; font-weight:500;">
      ${t('Room ID')}
    </label>
    <input
      id="roomId"
      type="text"
      placeholder="ABC123"
      maxlength="6"
      style="width:100%; padding:12px; background:rgba(31,41,55,0.8); border:2px solid #4b5563; border-radius:10px; text-align:center; font-size:20px; font-weight:600; text-transform:uppercase; letter-spacing:2px; color:#a3e635; font-family:monospace;"
    />
    <div style="display:flex; gap:12px; margin-top:28px;">
      <button class="glass-button" data-close style="flex:1; padding:12px; border-radius:10px; font-size:15px;">
        ${t('Cancel')}
      </button>
      <button class="glass-button" id="joinRoomBtn" style="flex:1; padding:12px; border-radius:10px; font-size:15px;">
        ${t('Join Room')}
      </button>
    </div>
  `));

    const btn = ov.querySelector("#joinRoomBtn") as HTMLButtonElement;
    const inp = ov.querySelector("#roomId") as HTMLInputElement;
    const nameInp = ov.querySelector("#guestPlayerName") as HTMLInputElement;

    btn.onclick = async () => {
        btn.disabled = true;
        const roomId = inp.value.trim().toUpperCase();
        const finalPlayerName = (nameInp.value.trim() || defaultGuest).slice(0, 20);

        if (!roomId) {
            btn.disabled = false;
            (ov.querySelector(".muted") as HTMLElement).textContent = t("Please enter a room ID.");
            return;
        }

        try {
            ov.innerHTML = `<div class="card"><div style="font-weight:700; margin-bottom:8px;">🔌 ${t('Connecting to Web socket server…')}</div><div class="muted">${t('Please wait…')}</div></div>`;

            const serverAvailable = await (socketManager.constructor as any).checkServerAvailability();
            if (!serverAvailable) {
                ov.innerHTML = `<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">❌ ${t('Server Unavailable')}</div>
          <div class="muted">${t('Web socket server is not running. Please start the server.')}</div>
          <div style="margin-top:10px; text-align:right;"><button class="glass-button" data-close>${t('Close')}</button></div>
        </div>`;
                return;
            }

            await socketManager.connect(finalPlayerName);

            ov.innerHTML = `<div class="card"><div style="font-weight:700; margin-bottom:8px;">🚪 ${t('Joining room')} ${roomId}…</div><div class="muted">${t('Connecting to other players…')}</div></div>`;
            const success = await socketManager.joinRoom(roomId);
            if (!success) throw new Error(t('Failed to join room'));

            ov.remove();
            onResolve({
                playerCount,
                connection: gameMode === '2p' ? "remoteGuest" : "remote4Guest",
                roomId,
                winScore: 10,
                currentUser,
                displayNames: gameMode === '2p' ? ["Host", currentUser?.name || finalPlayerName || "Guest"] : ["Host", currentUser?.name || finalPlayerName || "Guest", "…", "…"],
            });
        } catch (error: any) {
            ov.innerHTML = `<div class="card">
        <div style="font-weight:700; margin-bottom:8px;">❌ ${t('Join Failed')}</div>
        <div class="muted">${error?.message || t("Could not join room. Room may be full or not exist.")}</div>
        <div style="margin-top:10px; text-align:right;"><button class="glass-button" data-close>${t('Close')}</button></div>
      </div>`;
        }
    };
}

// Helper function to generate the styled card HTML
function getStyledCard(content: string): string {
    const theme = themeBridge.getCurrentTheme();
    const primaryHex = themeBridge.color3ToHex(theme.primary);
    return `
    <div class="card" style="max-width: 420px; margin: auto; padding: 24px; border-radius: 16px; background: rgba(17, 24, 39, 0.95); box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
      ${content}
    </div>
    `;
}

export { startLocal2P, startVsAI, startVs3AI, createSocketIORoom, joinSocketIORoom };

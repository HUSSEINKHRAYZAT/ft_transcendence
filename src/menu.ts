import type { GameConfig, PlayerCount } from "./types";
import { ApiClient } from "./api";
import { clearPongUI, markUI } from "./ui";
import { socketManager } from "./network/SocketManager";
import { themeBridge } from "./game/ThemeBridge";

export class Menu {
  static async render(): Promise<GameConfig> {
    clearPongUI();

    // Use frontend authentication state instead of separate API call
    const frontendAuthToken = localStorage.getItem('ft_pong_auth_token');
    const frontendUserData = localStorage.getItem('ft_pong_user_data');
    
    let you: any = null;
    if (frontendAuthToken && frontendUserData) {
      try {
        const userData = JSON.parse(frontendUserData);
        console.log('Raw user data from localStorage:', userData);
        you = {
          name: userData.firstName ? `${userData.firstName} ${userData.lastName}` : userData.userName || userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          userName: userData.userName,
          email: userData.email,
          id: userData.id
        };
        console.log('Processed user object:', you);
      } catch (error) {
        console.error('Failed to parse frontend user data:', error);
      }
    } else {
      console.log('No frontend authentication data found');
    }

    return new Promise((resolve) => {
      const root = markUI(document.createElement("div"));
      const theme = themeBridge.getCurrentTheme();
      const primaryHex = themeBridge.color3ToHex(theme.primary);
      const backgroundRgb = `${Math.round(theme.background.r * 255)}, ${Math.round(theme.background.g * 255)}, ${Math.round(theme.background.b * 255)}`;
      
      root.className = "fixed inset-0 grid place-items-center text-white font-sans z-[10000]";
      root.style.background = `rgba(${backgroundRgb}, 0.95)`;

      root.innerHTML = `
        <div class="p-8 rounded-3xl w-full max-w-4xl mx-4 shadow-2xl backdrop-blur-sm" style="background: rgba(${backgroundRgb}, 0.8); border: 1px solid ${primaryHex}40;">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <button data-action="back" class="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center text-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-200 border border-gray-500/30 hover:border-gray-400/50" title="← Back to Frontend">←</button>
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style="background: linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}dd 100%);">🎮</div>
              <h1 class="text-3xl font-bold tracking-wide" style="background: linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}dd 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">3D Pong Game Setup</h1>
            </div>
            <div class="text-sm px-4 py-2 rounded-xl" style="background: ${primaryHex}1a; border: 1px solid ${primaryHex}50; color: ${primaryHex};">
              ${you ? `👤 <span class="font-semibold">${you.name}</span>` : `<span class="opacity-80">🔒 Not signed in</span>`}
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <!-- Local Play Card -->
            <div class="bg-gradient-to-br from-lime-500/5 to-lime-500/2 border border-lime-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-lime-500/40 hover:shadow-lg hover:shadow-lime-500/10">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-6 h-6 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center text-xs">🏠</div>
                <div class="text-lg font-semibold text-lime-500">Local Play</div>
              </div>
              <button data-action="local2" class="btn btn-primary w-full mb-4">🎮 2P Local Match</button>
              <div class="bg-black/20 rounded-xl p-4">
                <label class="block text-sm font-medium text-lime-400 mb-2">🤖 AI Difficulty</label>
                <div class="flex items-center gap-3">
                  <input id="aiSlider" type="range" min="1" max="10" step="1" value="6" class="flex-1 accent-lime-500">
                  <span id="aiVal" class="w-8 text-center font-semibold text-lime-500">6</span>
                </div>
                <button data-action="ai2" class="btn btn-secondary w-full mt-3">⚔️ VS AI</button>
              </div>
            </div>

            <!-- Online Play Card -->
            <div class="bg-gradient-to-br from-blue-500/5 to-blue-500/2 border border-blue-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-content text-xs">🌐</div>
                <div class="text-lg font-semibold text-blue-500">Online Play</div>
              </div>
              <div class="grid grid-cols-2 gap-3 mb-3">
                <button data-action="sockethost2" class="btn btn-primary">🎯 Host 2P (Socket.IO)</button>
                <button data-action="socketjoin2" class="btn btn-outline">🔗 Join 2P (Socket.IO)</button>
                <button data-action="sockethost4" class="btn btn-primary">🎯 Host 4P (Socket.IO)</button>
                <button data-action="socketjoin4" class="btn btn-outline">🔗 Join 4P (Socket.IO)</button>
              </div>
              <div class="grid grid-cols-2 gap-3 mb-3">
                <button data-action="host2" class="btn btn-secondary text-xs">🎯 Old Host 2P</button>
                <button data-action="join2" class="btn btn-secondary text-xs">🔗 Old Join 2P</button>
                <button data-action="host4" class="btn btn-secondary text-xs">🎯 Old Host 4P</button>
                <button data-action="join4" class="btn btn-secondary text-xs">🔗 Old Join 4P</button>
              </div>
              <div class="text-xs text-blue-400 text-center">🌐 Real-time Socket.IO multiplayer</div>
            </div>

            <!-- Tournament Card -->
            <div class="bg-gradient-to-br from-purple-500/5 to-purple-500/2 border border-purple-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-xs">🏆</div>
                <div class="text-lg font-semibold text-purple-500">Tournament</div>
              </div>
              <div class="flex gap-3 items-center mb-3">
                <label class="text-sm text-purple-400 font-medium">👥 Size:</label>
                <select id="tSize" class="bg-black/30 border border-purple-500/30 rounded-lg px-3 py-2 text-white font-medium text-sm flex-1">
                  <option value="8" selected>8 Players</option>
                  <option value="16">16 Players</option>
                </select>
              </div>
              <button data-action="tourn" class="btn btn-primary w-full mb-3">🏆 Create Tournament</button>
              <div class="text-xs text-purple-400 text-center">📊 Results saved to database</div>
            </div>
          </div>
        </div>
      `;

      const css = document.createElement("style");
      css.setAttribute("data-pong-ui", "1");
      css.textContent = `
        .btn {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
          border: 1px solid ${primaryHex}50;
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .btn:hover {
          background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
          border-color: ${primaryHex}80;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px ${primaryHex}25;
        }
        .btn-primary {
          background: linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}dd 100%);
          border-color: ${primaryHex};
          color: black;
          font-weight: 700;
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, ${primaryHex}ee 0%, ${primaryHex} 100%);
          border-color: ${primaryHex}ee;
          box-shadow: 0 8px 25px ${primaryHex}50;
        }
        .btn-secondary {
          background: linear-gradient(135deg, ${primaryHex}33 0%, ${primaryHex}1a 100%);
          border-color: ${primaryHex}66;
          color: ${primaryHex};
        }
        .btn-secondary:hover {
          background: linear-gradient(135deg, ${primaryHex}44 0%, ${primaryHex}33 100%);
          color: ${primaryHex}dd;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid #3b82f666;
          color: #3b82f6;
        }
        .btn-outline:hover {
          background: #3b82f61a;
          border-color: #3b82f6;
          color: #60a5fa;
        }
        .ov {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(0, 0, 0, 0.85) !important;
          backdrop-filter: blur(8px) !important;
          z-index: 20000 !important;
          font-family: system-ui, sans-serif !important;
          color: white !important;
        }
        .card {
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%) !important;
          border: 2px solid rgba(132, 204, 22, 0.3) !important;
          padding: 24px !important;
          border-radius: 16px !important;
          min-width: 320px !important;
          max-width: 500px !important;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(132, 204, 22, 0.2) !important;
          position: relative !important;
          margin: 20px !important;
        }
        .muted {
          @apply opacity-80 text-xs text-gray-400;
        }
        input:focus, select:focus {
          @apply outline-none border-lime-500;
          box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.1);
        }
        code {
          @apply bg-black/40 px-2 py-1 rounded border border-lime-500/20 text-lime-500 font-medium;
        }
      `;
      document.head.appendChild(css);
      document.body.appendChild(root);

      const aiSlider = root.querySelector("#aiSlider") as HTMLInputElement;
      const aiVal = root.querySelector("#aiVal") as HTMLSpanElement;
      aiSlider.addEventListener("input", () => (aiVal.textContent = aiSlider.value));

      const tSizeSel = root.querySelector("#tSize") as HTMLSelectElement;

      const ensureLogin = async (): Promise<any> => {
        // Check frontend authentication instead of separate API
        if (!frontendAuthToken || !frontendUserData) {
          overlay(`<div class="card">
            <div class="font-bold mb-2 text-lime-500">🔐 Sign in required</div>
            <div class="muted">Please use the frontend login to access online features.</div>
            <div class="mt-4 text-right"><button class="btn btn-primary" data-close>Got it!</button></div>
          </div>`);
          throw new Error("not-signed-in");
        }
        return { user: you };
      };

      function overlay(html: string) {
        console.log('Creating overlay...', html.substring(0, 50));
        const ov = markUI(document.createElement("div"));
        ov.className = "ov";
        ov.innerHTML = html;
        console.log('Overlay element:', ov);
        
        // Add X button to the card if it doesn't have one
        const card = ov.querySelector('.card');
        if (card && !card.querySelector('[data-close]')) {
          const closeBtn = document.createElement('button');
          closeBtn.innerHTML = '✕';
          closeBtn.className = 'absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 transition-all duration-200 flex items-center justify-center text-lg font-bold';
          closeBtn.setAttribute('data-close', '');
          closeBtn.title = 'Close (Esc)';
          card.appendChild(closeBtn);
          card.classList.add('relative');
        }
        
        // Click outside to close
        ov.addEventListener("click", (e) => {
          const t = e.target as HTMLElement;
          if (t === ov || t.hasAttribute("data-close")) {
            ov.remove();
            document.removeEventListener('keydown', escapeHandler);
          }
        });
        
        // Escape key to close
        const escapeHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            ov.remove();
            document.removeEventListener('keydown', escapeHandler);
          }
        };
        document.addEventListener('keydown', escapeHandler);
        
        document.body.appendChild(ov);
        return ov;
      }

      async function startLocal2P() {
        const cfg: GameConfig = {
          playerCount: 2,
          connection: "local",
          winScore: 10,
          currentUser: you || null,
          displayNames: ["Player One", "Player Two"],
        };
        root.remove();
        resolve(cfg);
      }

      async function startVsAI() {
        const lvl = parseInt(aiSlider.value, 10);
        const cfg: GameConfig = {
          playerCount: 2,
          connection: "ai",
          aiDifficulty: lvl,
          winScore: 10,
          currentUser: you || null,
          displayNames: [`AI (Level ${lvl})`, you?.name || "You"],
        };
        root.remove();
        resolve(cfg);
      }

      async function createOnline(playerCount: PlayerCount) {
        const s = await ensureLogin();
        const ov = overlay(`<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">Creating ${playerCount}P Match…</div>
          <div class="muted">Please wait…</div>
        </div>`);

        try {
          const { wsUrl, roomId, code, matchId } = await ApiClient.createOnlineMatch({ playerCount });
          ov.innerHTML = `<div class="card">
            <div style="font-weight:700; margin-bottom:8px;">Match Created</div>
            <div class="muted">Share this code with your friend(s):</div>
            <div style="font-size:20px; font-weight:800; margin:6px 0;"><code>${code}</code></div>
            <div class="muted">Waiting for players to join…</div>
            <div style="margin-top:10px; text-align:right;"><button class="btn" data-go>Launch</button></div>
          </div>`;

          (ov.querySelector("[data-go]") as HTMLButtonElement).onclick = () => {
            ov.remove();
            const cfg: GameConfig = {
              playerCount,
              connection: playerCount === 4 ? "remote4Host" : "remoteHost",
              wsUrl, roomId, winScore: 10, matchId,
              currentUser: s.user, sessionId: s.sessionId,
              displayNames: playerCount === 2 ? [s.user.name, "Waiting…"] : [s.user.name, "…", "…", "…"],
            };
            root.remove();
            resolve(cfg);
          };
        } catch (e: any) {
          ov.innerHTML = `<div class="card">
            <div style="font-weight:700; margin-bottom:8px;">Unable to create match</div>
            <div class="muted">${e?.message || "Please try again."}</div>
            <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
          </div>`;
        }
      }

      async function joinOnline(playerCount: PlayerCount) {
        const s = await ensureLogin();
        const ov = overlay(`<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">Join ${playerCount}P Match</div>
          <div class="muted">Enter the code:</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <input id="joinCode" placeholder="ABC123" style="flex:1; text-transform:uppercase;">
            <button class="btn" id="joinBtn">Join</button>
          </div>
        </div>`);
        const btn = ov.querySelector("#joinBtn") as HTMLButtonElement;
        const inp = ov.querySelector("#joinCode") as HTMLInputElement;
        btn.onclick = async () => {
          btn.disabled = true;
          try {
            const { wsUrl, roomId, matchId } = await ApiClient.joinOnlineMatch({
              code: inp.value.trim().toUpperCase(),
            });
            ov.remove();
            const cfg: GameConfig = {
              playerCount,
              connection: playerCount === 4 ? "remote4Guest" : "remoteGuest",
              wsUrl, roomId, winScore: 10, matchId,
              currentUser: s.user, sessionId: s.sessionId,
              displayNames: playerCount === 2 ? [s.user.name, "Host"] : [s.user.name, "…", "…", "…"],
            };
            root.remove();
            resolve(cfg);
          } catch (e: any) {
            btn.disabled = false;
            (ov.querySelector(".muted") as HTMLElement).textContent = "Invalid code or match is full.";
          }
        };
      }

      async function createTournament() {
        const s = await ensureLogin();
        const size = parseInt(tSizeSel.value, 10) as 8 | 16;
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
            ${players.map((p) => `
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
              <div class="muted">When each match starts, this app will post results to your DB automatically.</div>
              <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Done</button></div>
            </div>`;
          } catch (e: any) {
            ov.innerHTML = `<div class="card">
              <div style="font-weight:700; margin-bottom:8px;">Couldn’t create tournament</div>
              <div class="muted">${e?.message || "Please try again."}</div>
              <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
            </div>`;
          }
        };
      }

      async function createSocketIORoom(gameMode: '2p' | '4p') {
        const playerCount = gameMode === '2p' ? 2 : 4;
        // Generate unique player names for each browser session
        const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const playerName = you?.name ? `${you.name}_Host` : `Host_${sessionId}`;
        console.log('Creating room with player name:', playerName, 'user object:', you);
        
        // First, ask for player name
        const nameOv = overlay(`<div class="card">
          <div style="font-weight:700; margin-bottom:16px; color:#84cc16; font-size:18px;">🎯 Host ${gameMode.toUpperCase()} Game</div>
          <div style="margin-bottom:12px; color:#d1d5db;">Enter your player name:</div>
          <div style="margin:16px 0;">
            <input id="hostPlayerName" placeholder="Enter your name" value="${you?.name || ''}" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:2px solid #374151; border-radius:8px; text-align:center; font-size:16px; color:#84cc16;" maxlength="20">
          </div>
          <div style="display:flex; gap:12px; margin-top:20px;">
            <button class="btn btn-outline" data-close style="flex:1;">Cancel</button>
            <button class="btn btn-primary" id="createRoomBtn" style="flex:1;">Create Room</button>
          </div>
        </div>`);

        const createBtn = nameOv.querySelector("#createRoomBtn") as HTMLButtonElement;
        const nameInput = nameOv.querySelector("#hostPlayerName") as HTMLInputElement;
        
        createBtn.onclick = async () => {
          const finalPlayerName = nameInput.value.trim() || `Host_${sessionId}`;
          nameOv.remove();
          
          const ov = overlay(`<div class="card">
            <div style="font-weight:700; margin-bottom:8px;">🔌 Connecting to Socket.IO server…</div>
            <div class="muted">Please wait…</div>
          </div>`);

        try {
          // Check if server is available
          const serverAvailable = await (socketManager.constructor as any).checkServerAvailability();
          if (!serverAvailable) {
            ov.innerHTML = `<div class="card">
              <div style="font-weight:700; margin-bottom:8px;">❌ Server Unavailable</div>
              <div class="muted">Socket.IO server is not running. Please start the server first:</div>
              <div style="margin:8px 0; padding:8px; background:black/20; border-radius:8px; font-family:monospace; font-size:12px;">
                cd server<br>
                npm install<br>
                node server.js
              </div>
              <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
            </div>`;
            return;
          }

          // Connect to Socket.IO server
          await socketManager.connect(finalPlayerName);
          
          ov.innerHTML = `<div class="card">
            <div style="font-weight:700; margin-bottom:8px;">🏠 Creating ${gameMode.toUpperCase()} room…</div>
            <div class="muted">Setting up multiplayer session…</div>
          </div>`;

          // Create room
          const roomId = await socketManager.createRoom(gameMode);
          
          if (!roomId) {
            throw new Error('Failed to create room');
          }

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
            const cfg: GameConfig = {
              playerCount,
              connection: gameMode === '2p' ? "remoteHost" : "remote4Host",
              roomId,
              winScore: 10,
              currentUser: you,
              displayNames: gameMode === '2p' ? [finalPlayerName || "Host", "Waiting…"] : [finalPlayerName || "Host", "…", "…", "…"],
            };
            console.log('Starting game with config:', cfg);
            root.remove();
            resolve(cfg);
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

      async function joinSocketIORoom(gameMode: '2p' | '4p') {
        const playerCount = gameMode === '2p' ? 2 : 4;
        // Generate unique player names for each browser session
        const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const playerName = you?.name ? `${you.name}_Guest` : `Guest_${sessionId}`;
        console.log('Joining room with player name:', playerName, 'user object:', you);
        
        const ov = overlay(`<div class="card">
          <div style="font-weight:700; margin-bottom:16px; color:#3b82f6; font-size:18px;">🔗 Join ${gameMode.toUpperCase()} Room</div>
          <div style="margin-bottom:12px; color:#d1d5db;">Enter your name and room ID:</div>
          <div style="margin:16px 0;">
            <input id="guestPlayerName" placeholder="Enter your name" value="${you?.name || ''}" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:2px solid #374151; border-radius:8px; text-align:center; font-size:16px; color:#84cc16; margin-bottom:12px;" maxlength="20">
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
          const finalPlayerName = nameInp.value.trim() || `Guest_${sessionId}`;
          
          if (!roomId) {
            btn.disabled = false;
            (ov.querySelector(".muted") as HTMLElement).textContent = "Please enter a room ID.";
            return;
          }

          try {
            ov.innerHTML = `<div class="card">
              <div style="font-weight:700; margin-bottom:8px;">🔌 Connecting to Socket.IO server…</div>
              <div class="muted">Please wait…</div>
            </div>`;

            // Check if server is available
            const serverAvailable = await (socketManager.constructor as any).checkServerAvailability();
            if (!serverAvailable) {
              ov.innerHTML = `<div class="card">
                <div style="font-weight:700; margin-bottom:8px;">❌ Server Unavailable</div>
                <div class="muted">Socket.IO server is not running. Please start the server first.</div>
                <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
              </div>`;
              return;
            }

            // Connect to Socket.IO server
            await socketManager.connect(finalPlayerName);
            
            ov.innerHTML = `<div class="card">
              <div style="font-weight:700; margin-bottom:8px;">🚪 Joining room ${roomId}…</div>
              <div class="muted">Connecting to other players…</div>
            </div>`;

            // Join room
            const success = await socketManager.joinRoom(roomId);
            
            if (!success) {
              throw new Error('Failed to join room');
            }

            ov.remove();
            const cfg: GameConfig = {
              playerCount,
              connection: gameMode === '2p' ? "remoteGuest" : "remote4Guest",
              roomId,
              winScore: 10,
              currentUser: you,
              displayNames: gameMode === '2p' ? [finalPlayerName || "Guest", "Host"] : [finalPlayerName || "Guest", "…", "…", "…"],
            };
            console.log('Joining game with config:', cfg);
            root.remove();
            resolve(cfg);

          } catch (error: any) {
            ov.innerHTML = `<div class="card">
              <div style="font-weight:700; margin-bottom:8px;">❌ Join Failed</div>
              <div class="muted">${error?.message || "Could not join room. Room may be full or not exist."}</div>
              <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
            </div>`;
          }
        };
      }

      root.addEventListener("click", (e) => {
        const t = e.target as HTMLElement;
        if (!t || !t.dataset.action) return;
        const a = t.dataset.action;
        if (a === "back") {
          root.remove();
          window.location.href = "/"; // Go back to frontend
          return;
        }
        if (a === "local2") startLocal2P();
        if (a === "ai2") startVsAI();
        if (a === "sockethost2") createSocketIORoom('2p');
        if (a === "socketjoin2") joinSocketIORoom('2p');
        if (a === "sockethost4") createSocketIORoom('4p');
        if (a === "socketjoin4") joinSocketIORoom('4p');
        if (a === "host2") createOnline(2);
        if (a === "join2") joinOnline(2);
        if (a === "host4") createOnline(4);
        if (a === "join4") joinOnline(4);
        if (a === "tourn") createTournament();
      });
    });
  }
}

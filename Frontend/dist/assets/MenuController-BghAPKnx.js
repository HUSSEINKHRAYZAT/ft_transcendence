import{markUI as k,clearPongUI as E}from"./ui-DHXkOSGK.js";import{o as P,D as $,F as p,a4 as C,y as l,T as N}from"./index-BkxLX6Gf.js";import{A as j}from"./api-Brgsddsy.js";import{g as L}from"./session-BpRpLxZA.js";function h(t){const e=k(document.createElement("div"));e.className="ov",e.innerHTML=t;const o=e.querySelector(".card");if(o&&!o.querySelector("[data-close]")){const n=document.createElement("button");n.innerHTML="✕",n.className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 transition-all duration-200 flex items-center justify-center text-lg font-bold",n.setAttribute("data-close",""),n.title="Close (Esc)",o.appendChild(n),o.classList.add("relative")}const a=n=>{n.key==="Escape"&&(e.remove(),document.removeEventListener("keydown",a))};return e.addEventListener("click",n=>{const r=n.target;(r===e||r.hasAttribute("data-close"))&&(e.remove(),document.removeEventListener("keydown",a))}),document.addEventListener("keydown",a),document.body.appendChild(e),e}class T{constructor(e){this.modal=null,this.socketService=null,this.token=e,this.socketService=window.socketService||null}async show(e,o,a){const n=await this.getFriendsList();if(!n||n.length===0)throw new Error("No online friends available");const r=n.filter(i=>i.status==="online");if(r.length===0)throw new Error("None of your friends are currently online");this.modal=k(document.createElement("div")),this.modal.className="fixed inset-0 grid place-items-center text-white font-sans z-[20000]",this.modal.style.background="rgba(0, 0, 0, 0.8)",this.modal.style.backdropFilter="blur(5px)",this.modal.innerHTML=`
      <div class="rounded-xl w-full max-w-md mx-4 shadow-2xl" style="background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(59, 130, 246, 0.3); padding: 24px;">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-blue-400">🎮 Invite Friends to Play</h2>
          <button class="close-modal text-gray-400 hover:text-white">✕</button>
        </div>

        <div class="mb-4">
          <p class="text-sm text-blue-300 mb-1">Room Code: <span class="font-mono font-bold">${e}</span></p>
          <p class="text-sm text-blue-300">Game Type: ${o.toUpperCase()}</p>
        </div>

        <div class="mb-4 border border-blue-900 rounded-lg p-3 bg-blue-900/20">
          <div class="text-sm text-blue-300 mb-2">Select friends to invite:</div>
          <div class="max-h-60 overflow-y-auto" id="friends-list">
            ${r.map(i=>`
              <label class="flex items-center gap-2 py-2 px-1 hover:bg-blue-900/30 rounded cursor-pointer">
                <input type="checkbox" class="friend-checkbox" value="${i.username}" data-id="${i.id}">
                <span class="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span class="text-white">${i.username}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div class="border-t border-blue-900/50 pt-4 flex justify-between">
          <button class="close-modal px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition">Cancel</button>
          <button id="send-invites" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">Send Invites</button>
        </div>
      </div>
    `,document.body.appendChild(this.modal),this.modal.querySelectorAll(".close-modal").forEach(i=>{i.addEventListener("click",()=>this.close())});const d=this.modal.querySelector("#send-invites");d&&d.addEventListener("click",()=>{const i=this.getSelectedFriends();if(i.length===0){this.showError("Please select at least one friend to invite");return}this.sendInvitations(i,e,o,a),this.close()})}getSelectedFriends(){if(!this.modal)return[];const e=this.modal.querySelectorAll(".friend-checkbox:checked");return Array.from(e).map(o=>o.value)}sendInvitations(e,o,a,n){if(!this.socketService){console.error("Socket service not available");return}const r=`🎮 GAME INVITE: ${n} invites you to play ${a.toUpperCase()}! Join with code: ${o}`;e.forEach(b=>{this.socketService.sendDirectMessage(b,r),window.notifyBox&&window.notifyBox.addNotification(`Invite sent to ${b}`,"success")})}close(){this.modal&&this.modal.parentNode&&(this.modal.parentNode.removeChild(this.modal),this.modal=null)}showError(e){window.notifyBox?window.notifyBox.addNotification(e,"error"):alert(e)}async getFriendsList(){try{const e=localStorage.getItem("ft_pong_user_data");if(!e)throw new Error("User data not found");const a=JSON.parse(e).id;if(!a)throw new Error("User ID not found");const n=await fetch(`${P}/relation/friends/${a}`,{method:"GET",headers:{Authorization:`Bearer ${this.token}`,"Content-Type":"application/json"}});if(!n.ok)throw new Error("Failed to load friends list");return await n.json()}catch(e){throw console.error("Error fetching friends list:",e),e}}}function z(t,e){const o={playerCount:2,connection:"local",winScore:10,currentUser:t||null,displayNames:["Player One","Player Two"]};$.radius=19,e(o)}function B(t,e,o){const a={playerCount:2,connection:"ai",aiDifficulty:t,winScore:10,currentUser:e||null,displayNames:[`AI (Level ${t})`,e?.name||"You"]};$.radius=19,o(a)}function A(t,e,o){const a={playerCount:4,connection:"ai3",aiDifficulty:t,winScore:10,currentUser:e||null,displayNames:[e?.name||"You","LEFT","BOTTOM","TOP"]};$.radius=30,o(a)}async function S(t,e,o){const a=await j.checkUserCanJoin("game");if(!a.canJoin){h(`<div class="card">
      <div style="font-weight:700; margin-bottom:16px; color:#ef4444; font-size:18px;">⚠️ Cannot Create Game</div>
      <div style="margin-bottom:16px; color:#d1d5db;">${a.reason}</div>
      <div style="margin-top:20px; text-align:right;">
        <button class="btn btn-primary" data-close>Got it!</button>
      </div>
    </div>`);return}const n=t==="2p"?2:4,r=Math.random().toString(36).substring(2,6).toUpperCase(),b=e?.name?`${e.name}_Host`:`Host_${r}`,d=h(`
  <div class="card" style="max-width: 420px; margin: auto; padding: 24px; border-radius: 16px; background: rgba(17, 24, 39, 0.95); box-shadow: 0 8px 20px rgba(0,0,0,0.4);">

    <h2 style="font-weight:700; margin-bottom:20px; color:#a3e635; font-size:20px; text-align:center;">
      🎯 Host <span style="color:#facc15;">${t.toUpperCase()}</span> Game
    </h2>

        <label for="hostPlayerName"
        style="display:block; margin-bottom:8px; color:#e5e7eb; font-size:18px; font-weight:700;">
        🎮 Your player name:
        </label>


    <input
      id="hostPlayerName"
      type="text"
      value="${e?.name||""}"
      maxlength="20"
      disabled
      style="width:100%; padding:12px; background:rgba(31,41,55,0.6); border:2px solid #374151; border-radius:10px; text-align:center; font-size:16px; color:#9ca3af; cursor:not-allowed;"
    />

    <div style="display:flex; gap:12px; margin-top:28px;">
      <button class="btn btn-outline" data-close style="flex:1; padding:12px; border-radius:10px; font-size:15px;">
        Cancel
      </button>
      <button class="btn btn-primary" id="createRoomBtn" style="flex:1; padding:12px; border-radius:10px; font-size:15px;">
        Create Room
      </button>
    </div>
  </div>
`),i=d.querySelector("#createRoomBtn"),v=d.querySelector("#hostPlayerName");i.onclick=async()=>{const m=(v.value.trim()||b).slice(0,20);d.remove();const s=h(`<div class="card">
      <div style="font-weight:700; margin-bottom:8px;">🔌 Connecting to Web socket server…</div>
      <div class="muted">Please wait…</div>
    </div>`);try{if(!await p.constructor.checkServerAvailability()){s.innerHTML=`<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">❌ Server Unavailable</div>
          <div class="muted">Web socket server is not running. Please start the server.</div>
          <div style="margin:8px 0; padding:8px; background:black/20; border-radius:8px; font-family:monospace; font-size:12px;">
            cd server<br>npm install<br>node server.js
          </div>
          <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
        </div>`;return}await p.connect(m),s.innerHTML=`<div class="card"><div style="font-weight:700; margin-bottom:8px;">🏠 Creating ${t.toUpperCase()} room…</div><div class="muted">Setting up multiplayer session…</div></div>`;const g=await p.createRoom(t);if(!g)throw new Error("Failed to create room");s.innerHTML=`<div class="card">
        <div style="font-weight:700; margin-bottom:16px; color:#84cc16; font-size:18px;">✅ Room Created Successfully!</div>
        <div style="margin-bottom:12px; color:#d1d5db;">Share this room ID with other players:</div>
        <div style="font-size:28px; font-weight:800; margin:16px 0; padding:16px; background:rgba(0,0,0,0.4); border-radius:12px; text-align:center; border:2px solid #84cc16; color:#84cc16; letter-spacing:2px; font-family:monospace;">${g}</div>
        <div style="margin-bottom:16px; color:#9ca3af; text-align:center;">Other players can join using this code</div>
        <div id="room-status" style="margin-bottom:16px; color:#f59e0b; text-align:center; font-weight:600;">⏳ Waiting for players to join...</div>
        <div style="display:flex; gap:8px; margin-top:20px;">
          <button class="btn btn-outline" data-close style="flex:1;">Cancel</button>
          <button class="btn btn-secondary" id="invite-friends-btn" style="flex:1;">🎯 Invite Friends</button>
          <button class="btn btn-primary" id="start-game-btn" data-start style="flex:1; opacity:0.5;" disabled>Start Game</button>
        </div>
      </div>`;const f=s.querySelector("#start-game-btn"),y=s.querySelector("#invite-friends-btn");let x=1;const w=()=>{const u=s.querySelector("#room-status");x>=(t==="2p"?2:4)?(f.disabled=!1,f.style.opacity="1",u&&(u.textContent=`✅ Ready to start! (${x}/${t==="2p"?2:4} players)`)):(f.disabled=!0,f.style.opacity="0.5",u&&(u.textContent=`⏳ Waiting for players... (${x}/${t==="2p"?2:4} players)`))};p.on("player_joined",u=>{x++,w()}),p.on("player_left",u=>{x=Math.max(1,x-1),w()}),f.onclick=()=>{x>=(t==="2p"?2:4)&&(s.remove(),o({playerCount:n,connection:t==="2p"?"remoteHost":"remote4Host",roomId:g,winScore:10,currentUser:e,displayNames:t==="2p"?[e?.name||m||"Host","Waiting…"]:[e?.name||m||"Host","…","…","…"]}))},y.onclick=async()=>{try{y.disabled=!0,y.textContent="Loading friends...";const u=localStorage.getItem("ft_pong_token")||"";await new T(u).show(g,t,e?.name||m)}catch(u){console.error("Error inviting friends:",u),window.notifyBox?window.notifyBox.addNotification("Failed to load friends list. Please try again.","error"):alert("Failed to load friends list. Please try again.")}finally{y.disabled=!1,y.textContent="🎯 Invite Friends"}},w()}catch(c){s.innerHTML=`<div class="card">
        <div style="font-weight:700; margin-bottom:8px;">❌ Connection Failed</div>
        <div class="muted">${c?.message||"Could not connect to Web socket server"}</div>
        <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
      </div>`}}}async function I(t,e,o){const a=await j.checkUserCanJoin("game");if(!a.canJoin){h(`<div class="card">
      <div style="font-weight:700; margin-bottom:16px; color:#ef4444; font-size:18px;">⚠️ Cannot Join Game</div>
      <div style="margin-bottom:16px; color:#d1d5db;">${a.reason}</div>
      <div style="margin-top:20px; text-align:right;">
        <button class="btn btn-primary" data-close>Got it!</button>
      </div>
    </div>`);return}const n=t==="2p"?2:4,r=Math.random().toString(36).substring(2,6).toUpperCase(),b=e?.name?`${e.name}_Guest`:`Guest_${r}`,d=h(`
  <div class="card" style="max-width: 420px; margin: auto; padding: 24px; border-radius: 16px; background: rgba(17, 24, 39, 0.95); box-shadow: 0 8px 20px rgba(0,0,0,0.4);">

    <h2 style="font-weight:700; margin-bottom:20px; color:#3b82f6; font-size:20px; text-align:center;">
      🔗 Join <span style="color:#facc15;">${t.toUpperCase()}</span> Room
    </h2>

    <p style="margin-bottom:16px; color:#d1d5db; text-align:center; font-size:14px;">
      Enter your room ID below:
    </p>

    <label for="guestPlayerName" style="display:block; margin-bottom:6px; color:#e5e7eb; font-size:14px; font-weight:500;">
      Your name
    </label>
    <input
      id="guestPlayerName"
      type="text"
      value="${e?.name||""}"
      maxlength="20"
      disabled
      style="width:100%; padding:12px; background:rgba(31,41,55,0.6); border:2px solid #374151; border-radius:10px; text-align:center; font-size:16px; color:#9ca3af; margin-bottom:14px; cursor:not-allowed;"
    />

    <label for="roomId" style="display:block; margin-bottom:6px; color:#e5e7eb; font-size:14px; font-weight:500;">
      Room ID
    </label>
    <input
      id="roomId"
      type="text"
      placeholder="ABC123"
      maxlength="6"
      style="width:100%; padding:12px; background:rgba(31,41,55,0.8); border:2px solid #4b5563; border-radius:10px; text-align:center; font-size:20px; font-weight:600; text-transform:uppercase; letter-spacing:2px; color:#a3e635; font-family:monospace;"
    />

    <div style="display:flex; gap:12px; margin-top:28px;">
      <button class="btn btn-outline" data-close style="flex:1; padding:12px; border-radius:10px; font-size:15px;">
        Cancel
      </button>
      <button class="btn btn-primary" id="joinRoomBtn" style="flex:1; padding:12px; border-radius:10px; font-size:15px;">
        Join Room
      </button>
    </div>
  </div>
`),i=d.querySelector("#joinRoomBtn"),v=d.querySelector("#roomId"),m=d.querySelector("#guestPlayerName");i.onclick=async()=>{i.disabled=!0;const s=v.value.trim().toUpperCase(),c=(m.value.trim()||b).slice(0,20);if(!s){i.disabled=!1,d.querySelector(".muted").textContent="Please enter a room ID.";return}try{if(d.innerHTML='<div class="card"><div style="font-weight:700; margin-bottom:8px;">🔌 Connecting to Web socket server…</div><div class="muted">Please wait…</div></div>',!await p.constructor.checkServerAvailability()){d.innerHTML=`<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">❌ Server Unavailable</div>
          <div class="muted">Web socket server is not running. Please start the server.</div>
          <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
        </div>`;return}if(await p.connect(c),d.innerHTML=`<div class="card"><div style="font-weight:700; margin-bottom:8px;">🚪 Joining room ${s}…</div><div class="muted">Connecting to other players…</div></div>`,!await p.joinRoom(s))throw new Error("Failed to join room");d.remove(),o({playerCount:n,connection:t==="2p"?"remoteGuest":"remote4Guest",roomId:s,winScore:10,currentUser:e,displayNames:t==="2p"?["Host",e?.name||c||"Guest"]:["Host",e?.name||c||"Guest","…","…"]})}catch(g){d.innerHTML=`<div class="card">
        <div style="font-weight:700; margin-bottom:8px;">❌ Join Failed</div>
        <div class="muted">${g?.message||"Could not join room. Room may be full or not exist."}</div>
        <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
      </div>`}}}function F(t){const e=C.getCurrentTheme(),o=C.color3ToHex(e.primary),a=`${Math.round(e.background.r*255)}, ${Math.round(e.background.g*255)}, ${Math.round(e.background.b*255)}`,n=k(document.createElement("div"));return n.className="fixed inset-0 grid place-items-center text-white font-sans z-[10000]",n.style.background=`rgba(${a}, 0.95)`,n.style.backdropFilter="blur(8px)",n.innerHTML=`
    <div class="rounded-3xl w-full max-w-4xl mx-4 shadow-2xl backdrop-blur-sm relative" style="background: rgba(${a}, 0.85); border: 2px solid rgba(132, 204, 22, 0.4); padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(132, 204, 22, 0.2); z-index: 10;">
      <div class="flex items-center justify-between mb-8 relative z-10">
        <div class="flex items-center gap-4">
          <button data-action="back" class="w-12 h-12 rounded-xl flex items-center justify-center text-xl btn border" style="background: linear-gradient(135deg, #4b5563 0%, #374151 100%); border-color: rgba(75, 85, 99, 0.3);" title="${l("← Back to Frontend")}">
            <span>←</span>
          </button>
          <div class="menu-icon w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg" style="background: linear-gradient(135deg, ${o} 0%, ${o}dd 100%); box-shadow: 0 8px 25px ${o}40;">🎮</div>
          <h1 class="menu-title text-4xl font-bold tracking-wide" style="
            color: ${o};
            text-shadow: 
              1px 1px 0 rgba(0,0,0,0.3),
              2px 2px 0 rgba(0,0,0,0.25),
              3px 3px 0 rgba(0,0,0,0.2),
              4px 4px 0 rgba(0,0,0,0.15),
              5px 5px 0 rgba(0,0,0,0.1),
              6px 6px 10px rgba(0,0,0,0.4),
              0 0 20px ${o}80;
            transform: perspective(500px) rotateX(5deg);
            transform-style: preserve-3d;
          ">${l("3D Pong Game Setup")}</h1>
        </div>
        <div class="text-sm px-5 py-3 rounded-xl border backdrop-blur-sm" style="background: linear-gradient(135deg, rgba(132, 204, 22, 0.15) 0%, rgba(132, 204, 22, 0.05) 100%); border: 1px solid rgba(132, 204, 22, 0.4); color: ${o};">
          ${t.youName?`👤 <span class="font-bold">${t.youName}</span>`:`<span class="opacity-80">${l("🔒 Not signed in")}</span>`}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <!-- Local Play Card -->
        <div class="menu-card rounded-2xl p-5 border" style="background: linear-gradient(135deg, rgba(132, 204, 22, 0.05) 0%, rgba(132, 204, 22, 0.02) 100%); border-color: rgba(132, 204, 22, 0.2);">
          <div class="flex items-center gap-2 mb-4">
            <div class="menu-icon w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);">🏠</div>
            <div class="text-lg font-semibold" style="color: #84cc16;">${l("Local Play")}</div>
          </div>
          <button data-action="local2" class="btn btn-primary w-full mb-4 px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2" style="background: #84cc16; color: white;">🎮 ${l("2P Local Match")}</button>
          <div class="rounded-xl p-4" style="background: rgba(0, 0, 0, 0.2);">
            <label class="block text-sm font-medium mb-2" style="color: #84cc16;">${l("🤖 AI Difficulty")}</label>
            <div class="flex items-center gap-3 mb-3">
              <input id="aiSlider" type="range" min="1" max="10" step="1" value="6" class="slider-3d flex-1">
              <span id="aiVal" class="w-8 text-center font-semibold" style="color: #84cc16;">6</span>
            </div>
            <button data-action="ai2" class="btn btn-secondary w-full mb-2 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2" style="background: rgba(132, 204, 22, 0.1); border-color: rgba(132, 204, 22, 0.3); color: #84cc16;">⚔️ ${l("VS AI")}</button>
            <button data-action="ai3" class="btn btn-secondary w-full mb-2 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2" style="background: rgba(132, 204, 22, 0.1); border-color: rgba(132, 204, 22, 0.3); color: #84cc16;">🧠 ${l("3 AI (4P)")}</button>
            <div class="text-xs opacity-70 mt-1" style="color: #84cc16;">${l("1 player vs 3 bots (uses difficulty above)")}</div>
          </div>
        </div>

        <!-- Online Play Card -->
        <div class="menu-card rounded-2xl p-5 border" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%); border-color: rgba(59, 130, 246, 0.2);">
          <div class="flex items-center gap-2 mb-4">
            <div class="menu-icon w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">🌐</div>
            <div class="text-lg font-semibold" style="color: #3b82f6;">${l("Online Play")}</div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <button data-action="sockethost2" class="btn btn-primary px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 text-sm" style="background: #3b82f6; color: white;">🎯 ${l("Host 2P")}</button>
            <button data-action="socketjoin2" class="btn btn-outline px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 text-sm" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: #3b82f6;">🔗 ${l("Join 2P")}</button>
            <button data-action="sockethost4" class="btn btn-primary px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 text-sm" style="background: #3b82f6; color: white;">🎯 ${l("Host 4P")}</button>
            <button data-action="socketjoin4" class="btn btn-outline px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 text-sm" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: #3b82f6;">🔗 ${l("Join 4P")}</button>
          </div>
                    <div class="text-xs text-center pulse" style="color: #3b82f6;">🌐 ${l("Real-time Web socket multiplayer")}</div>
        </div>

        <!-- Tournament Card -->
        <div class="menu-card rounded-2xl p-5 border" style="background: linear-gradient(135deg, rgba(132, 204, 22, 0.05) 0%, rgba(132, 204, 22, 0.02) 100%); border-color: rgba(132, 204, 22, 0.2);">
          <div class="flex items-center gap-2 mb-4">
            <div class="menu-icon w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);">🏆</div>
            <div class="text-lg font-semibold" style="color: #84cc16;">${l("Tournaments")}</div>
          </div>

          <div class="text-center mb-4">
            <div class="text-sm mb-3" style="color: #84cc16;">${l("Create & join competitive tournaments")}</div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <button data-action="tournament-create" class="btn btn-primary px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2" style="background: #84cc16; color: white;">
              ➕ ${l("Create")}
            </button>
            <button data-action="tournament-join" class="btn btn-primary px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2" style="background: #22c55e; color: white;">
              🔑 ${l("Join")}
            </button>
          </div>

          <div class="text-xs text-center" style="color: #84cc16;">🤖 ${l("AI bots • Remote multiplayer • Brackets")}</div>
        </div>
      </div>
    </div>
  `,setTimeout(()=>{const r=n.querySelector("#aiSlider"),b=n.querySelector("#aiVal");r&&b&&r.addEventListener("input",d=>{const i=d.target.value;b.textContent=i})},0),{root:n,primaryHex:o,backgroundRgb:a}}function G(t){if(document.querySelector('style[data-pong-ui="1"]'))return;const e=document.createElement("style");e.setAttribute("data-pong-ui","1"),e.textContent=`
    /* Button Styles (animations removed) */
    .btn{
      background:linear-gradient(135deg,#374151 0%,#1f2937 100%);
      border:1px solid ${t}50;
      color:#fff;
      padding:12px 20px;
      border-radius:12px;
      cursor:pointer;
      font-weight:600;
      font-size:14px;
      position:relative;
      overflow:hidden;
      box-shadow:0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .btn:hover{
      background:linear-gradient(135deg,#4b5563 0%,#374151 100%);
      border-color:${t}80;
      box-shadow:0 12px 30px ${t}25, 0 6px 12px rgba(0,0,0,0.3);
    }
    
    .btn-primary{
      background:linear-gradient(135deg,${t} 0%,${t}dd 100%);
      border-color:${t};
      color:#000;
      font-weight:700;
      box-shadow:0 6px 16px ${t}40, 0 3px 6px rgba(0,0,0,0.2);
    }
    
    .btn-primary:hover{
      background:linear-gradient(135deg,${t}ee 0%,${t} 100%);
      border-color:${t}ee;
      box-shadow:0 16px 40px ${t}50, 0 8px 16px rgba(0,0,0,0.4);
    }
    
    .btn-secondary{
      background:linear-gradient(135deg,${t}33 0%,${t}1a 100%);
      border-color:${t}66;
      color:${t};
    }
    
    .btn-secondary:hover{
      background:linear-gradient(135deg,${t}44 0%,${t}33 100%);
      color:${t}dd;
    }
    
    .btn-outline{
      background:transparent;
      border:1px solid #3b82f666;
      color:#3b82f6;
    }
    
    .btn-outline:hover{
      background:#3b82f61a;
      border-color:#3b82f6;
      color:#60a5fa;
    }

    /* 3D Card Styles (animations removed) */
    .menu-card{
      position:relative;
      z-index:1;
    }
    
    /* Menu Title */
    .menu-title{
      /* No animations */
    }

    /* Menu Icon */
    .menu-icon{
      /* No animations */
    }

    /* Enhanced Slider */
    .slider-3d{
      appearance:none;
      height:8px;
      border-radius:4px;
      background:linear-gradient(90deg, #374151, ${t}33);
      outline:none;
    }
    
    .slider-3d::-webkit-slider-thumb{
      appearance:none;
      width:20px;
      height:20px;
      border-radius:50%;
      background:linear-gradient(135deg, ${t}, ${t}dd);
      cursor:pointer;
      border:2px solid #fff;
      box-shadow:0 4px 8px rgba(0,0,0,0.3);
    }

    /* Existing styles remain... */
    .ov{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);z-index:20000;font-family:system-ui,sans-serif;color:#fff}
    .card{background:linear-gradient(135deg,#1f2937 0%,#111827 100%);border:2px solid rgba(132,204,22,.3);padding:24px;border-radius:16px;min-width:320px;max-width:500px;box-shadow:0 25px 50px rgba(0,0,0,.5),0 0 0 1px rgba(132,204,22,.2);position:relative;margin:20px}
    .muted{opacity:.8;font-size:.75rem;color:#9ca3af}
    input:focus,select:focus{outline:none;border-color:#84cc16;box-shadow:0 0 0 3px rgba(132,204,22,.1)}
    code{background:rgba(0,0,0,.4);padding:.25rem .5rem;border-radius:.25rem;border:1px solid rgba(132,204,22,.2);color:#84cc16;font-weight:500}
  `,document.head.appendChild(e)}class _{static async render(){E();const e=L(),o=N.getInstance(),a=o.getCurrentTheme(),n=o.color3ToHex(a.primary),{root:r}=F({youName:e?.name??null});G(n),document.body.appendChild(r);const b=r.querySelector("#aiSlider"),d=r.querySelector("#aiVal");return b&&d&&b.addEventListener("input",()=>d.textContent=b.value),new Promise(i=>{r.addEventListener("click",v=>{const s=v.target?.dataset.action;if(s){if(s==="back"){r.remove(),window.location.href="/";return}if(s==="local2"){r.remove(),z(e,i);return}if(s==="ai2"){const c=parseInt(b?.value??"6",10);r.remove(),B(c,e,i);return}if(s==="ai3"){const c=parseInt(b?.value??"6",10);r.remove(),A(c,e,i);return}if(s==="sockethost2"){S("2p",e,c=>{r.remove(),i(c)});return}if(s==="socketjoin2"){I("2p",e,c=>{r.remove(),i(c)});return}if(s==="sockethost4"){S("4p",e,c=>{r.remove(),i(c)});return}if(s==="socketjoin4"){I("4p",e,c=>{r.remove(),i(c)});return}if(s==="tournament-create"){r.remove(),window.selectGameMode&&window.selectGameMode("create-tournament");return}if(s==="tournament-join"){r.remove(),window.selectGameMode&&window.selectGameMode("join-tournament");return}}})})}}export{_ as Menu};

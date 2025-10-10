import{newTournamentService as i}from"./NewTournamentService-BP1FKkH1.js";import{s as o,c as r}from"./index-BkxLX6Gf.js";class l{constructor(){this.container=null,this.tournament=null,this.countdownInterval=null,this.isHost=!1,this.handleTournamentUpdate=t=>{console.log("🔄 TournamentLobby received tournament_updated:",t),t.tournament&&this.tournament&&t.tournament.id===this.tournament.id?(console.log("🔄 Updating tournament from",this.tournament.players.length,"to",t.tournament.players.length,"players"),this.tournament=t.tournament,this.update()):console.warn("⚠️ Tournament update ignored - ID mismatch or missing data")},this.handlePlayerJoined=t=>{t.tournament&&this.tournament&&t.tournament.id===this.tournament.id&&(this.tournament=t.tournament,this.update(),t.player&&this.showNotification(`${t.player.name} joined the tournament!`))},this.handleTournamentStarted=t=>{t.tournamentId===this.tournament?.id&&(this.showNotification("Tournament is starting!","success"),setTimeout(()=>{this.hide(),window.dispatchEvent(new CustomEvent("tournament-started",{detail:{tournament:this.tournament}}))},2e3))}}show(t){if(this.tournament=t,this.isHost=this.checkIfHost(),this.container){this.update();return}this.container=document.createElement("div"),this.container.className="tournament-lobby-overlay",this.container.innerHTML=this.getLobbyHTML(),document.body.appendChild(this.container),this.attachEventListeners(),this.startCountdownTimer(),this.setupRealtimeUpdates()}hide(){this.container&&(this.container.remove(),this.container=null),this.countdownInterval&&(clearInterval(this.countdownInterval),this.countdownInterval=null),this.removeRealtimeUpdates()}update(){if(!this.container||!this.tournament)return;const t=this.container.querySelector("#playerCount");t&&(t.textContent=`${this.tournament.players.length} / ${this.tournament.size}`,console.log("✅ Player count updated:",this.tournament.players.length,"/",this.tournament.size));const e=this.container.querySelector("#playerGrid");e&&(e.innerHTML=this.getPlayerGridHTML());const n=this.container.querySelector("#statusBadge");n&&(n.innerHTML=this.getStatusBadgeHTML()),this.updateCountdown(),this.updateStartButton()}getLobbyHTML(){return`
      <div class="tournament-lobby">
        <!-- Header -->
        <div class="lobby-header">
          <div class="lobby-title">
            <h2>🏆 Tournament Lobby</h2>
            <div id="statusBadge">${this.getStatusBadgeHTML()}</div>
          </div>
          <button class="close-btn" data-action="close">×</button>
        </div>

        <!-- Tournament Info -->
        <div class="lobby-info">
          <div class="info-card">
            <div class="info-label">Tournament Code</div>
            <div class="code-display">
              <span class="code-value">${this.tournament?.code}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="info-label">Players</div>
            <div class="info-value" id="playerCount">
              ${this.tournament?.players.length} / ${this.tournament?.size}
            </div>
          </div>

          <div class="info-card">
            <div class="info-label">Max Goals</div>
            <div class="info-value">
              ⚽ ${this.tournament?.maxGoals}
            </div>
          </div>
        </div>

        <!-- Player Grid -->
        <div class="players-section">
          <h3>Players</h3>
          <div class="player-grid" id="playerGrid">
            ${this.getPlayerGridHTML()}
          </div>
        </div>

        <!-- Actions -->
        <div class="lobby-actions">
          ${this.getActionButtonsHTML()}
        </div>
      </div>
    `}getStatusBadgeHTML(){if(!this.tournament)return"";const t=this.tournament.status,e=this.tournament.players.length===this.tournament.size;let n="status-badge",a="",s="";return t==="completed"?(n+=" status-completed",s="🏆",a="Completed"):t==="active"?(n+=" status-active",s="🎮",a="In Progress"):e?(n+=" status-ready",s="✅",a="Ready to Start"):(n+=" status-waiting",s="⏳",a="Waiting for Players"),`
      <span class="${n}">
        ${s} ${a}
      </span>
    `}getPlayerGridHTML(){if(!this.tournament)return"";const t=[],e=this.tournament.size,n=this.tournament.players;for(let a=0;a<e;a++){const s=n[a];s?t.push(this.getPlayerSlotHTML(s,a+1)):t.push(this.getEmptySlotHTML(a+1))}return t.join("")}getPlayerSlotHTML(t,e){const n=t.isOnline?"online":"offline",a=t.avatar||this.getDefaultAvatar();return`
      <div class="player-slot filled ${n}">
        <div class="slot-number">#${e}</div>
        <div class="player-avatar">
          <img src="${a}" alt="${t.name}" />
          <span class="online-indicator"></span>
        </div>
        <div class="player-info">
          <div class="player-name">${this.escapeHTML(t.name)}</div>
          <div class="player-status">${n==="online"?"🟢 Online":"🔴 Offline"}</div>
        </div>
      </div>
    `}getEmptySlotHTML(t){return`
      <div class="player-slot empty">
        <div class="slot-number">#${t}</div>
        <div class="empty-icon">👤</div>
        <div class="empty-text">Waiting...</div>
      </div>
    `}getActionButtonsHTML(){if(!this.tournament)return"";const t=this.tournament.players.length===this.tournament.size;return`
      <button class="btn btn-secondary" data-action="leave">
        Leave Tournament
      </button>
      
      ${this.isHost&&t&&this.tournament.status==="waiting"?`
        <button class="btn btn-primary btn-start" data-action="start" id="startBtn">
          <span class="btn-icon">🚀</span>
          Start Tournament Now
        </button>
      `:""}
    `}attachEventListeners(){this.container&&(this.container.querySelector('[data-action="close"]')?.addEventListener("click",()=>this.handleLeave()),this.container.querySelector('[data-action="leave"]')?.addEventListener("click",()=>this.handleLeave()),this.container.querySelector('[data-action="start"]')?.addEventListener("click",()=>this.handleStart()))}async handleStart(){if(this.tournament)try{console.log("🚀 Starting tournament manually..."),await i.startTournament(this.tournament.id)}catch(t){console.error("❌ Failed to start tournament:",t),alert("Failed to start tournament. Please try again.")}}async handleLeave(){await o("Are you sure you want to leave this tournament?","Leave Tournament","Yes, Leave","Stay")&&(i.leaveTournament(),this.hide(),window.dispatchEvent(new CustomEvent("ft:pong:returnToMenu",{detail:{reason:"tournament-lobby-left"}})))}setupRealtimeUpdates(){i.on("tournament_updated",this.handleTournamentUpdate),i.on("player_joined",this.handlePlayerJoined),i.on("tournament_started",this.handleTournamentStarted)}removeRealtimeUpdates(){i.off("tournament_updated",this.handleTournamentUpdate),i.off("player_joined",this.handlePlayerJoined),i.off("tournament_started",this.handleTournamentStarted)}startCountdownTimer(){}updateCountdown(){}checkIfHost(){const t=r.getUser();if(!t||!this.tournament)return!1;const e=t.id||t.email;return this.tournament.createdBy===e}updateStartButton(){if(!this.isHost)return;if(!this.container?.querySelector("#startBtn")){const e=this.container?.querySelector(".lobby-actions");e&&(e.innerHTML=this.getActionButtonsHTML(),this.attachEventListeners())}}showNotification(t,e="info"){const n=document.createElement("div");n.className=`tournament-notification ${e}`,n.textContent=t,document.body.appendChild(n),setTimeout(()=>n.remove(),3e3)}getDefaultAvatar(){return"/avatars/panda.png"}escapeHTML(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}const h=new l;export{l as TournamentLobby,h as tournamentLobby};

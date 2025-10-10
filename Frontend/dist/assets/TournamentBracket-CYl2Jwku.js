const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/TournamentMatchService-BwM4g70D.js","assets/index-BkxLX6Gf.js","assets/index-L2VcX_a3.css","assets/Pong3D-DmwfZDRA.js","assets/api-Brgsddsy.js","assets/ui-DHXkOSGK.js","assets/TournamentService-6_ipt_40.js"])))=>i.map(i=>d[i]);
import{_ as g}from"./index-BkxLX6Gf.js";class v{constructor(t,e){this.currentUserId=null,this.pollingInterval=null,this.isPolling=!1,this.container=t,this.data=e,this.resolveCurrentUser(),this.render()}resolveUserIdFromRecord(t){if(!t||typeof t!="object")return null;const n=[t.id,t.externalId,t.userId,t.playerId,t.email,t.username].find(r=>typeof r=="string"&&r.trim().length>0);return n?String(n):null}doesIdMatchUser(t,e){return!t||!e?!1:t===e}doesPlayerMatchUser(t,e){return t?this.doesIdMatchUser(t.id,e)||this.doesIdMatchUser(t.externalId,e):!1}areSamePlayer(t,e){return!t||!e?!1:this.doesIdMatchUser(t.id,e.id)||this.doesIdMatchUser(t.id,e.externalId)||this.doesIdMatchUser(t.externalId,e.id)||this.doesIdMatchUser(t.externalId,e.externalId)}updateData(t){this.data=t,this.render()}destroy(){this.pollingInterval&&(console.log("🧹 Cleaning up auto-polling interval"),clearInterval(this.pollingInterval),this.pollingInterval=null),this.isPolling=!1}resolveCurrentUser(){try{const t=window.authService;if(t&&t.getUser){const e=t.getUser();e&&(this.currentUserId=this.resolveUserIdFromRecord(e))}if(!this.currentUserId){const e=sessionStorage.getItem("ft_pong_current_user");if(e)try{const n=JSON.parse(e);this.currentUserId=this.resolveUserIdFromRecord(n)}catch{}}}catch(t){console.warn("Failed to resolve current user for tournament bracket:",t)}}checkForActiveMatch(){if(!this.currentUserId)return;console.log("🏆 Tournament bracket displayed for all players");const t=this.data.matches.find(n=>n.isActive&&!n.isComplete&&(this.doesPlayerMatchUser(n.player1,this.currentUserId)||this.doesPlayerMatchUser(n.player2,this.currentUserId)));if(t){console.log("🏆 Current user has an active match:",t);return}const e=this.data.matches.filter(n=>n.isComplete&&this.doesPlayerMatchUser(n.winner,this.currentUserId));if(e.length>0&&!this.data.isComplete&&!this.isPolling){const n=Math.max(...e.map(i=>i.round)),r=n+1;console.log("🏆 User has won matches, checking for next round..."),console.log(`   Latest completed round: ${n}, next round: ${r}`),this.startAutoMatchPolling(r)}}async startMatchForCurrentUser(t){try{console.log("🏆 Auto-starting tournament match:",t);const{TournamentMatchService:e}=await g(async()=>{const{TournamentMatchService:o}=await import("./TournamentMatchService-BwM4g70D.js");return{TournamentMatchService:o}},__vite__mapDeps([0,1,2])),n=e.getInstance(),i=window.authService?.getUser?.();if(!i)return;const l=this.resolveUserIdFromRecord(i);if(!l)return;const a={id:l,name:i.userName||i.firstName||i.email,isOnline:!0,isAI:!1};await n.startTournamentMatch(this.data,t,a,async o=>{console.log("🏆 Starting tournament game:",o);const d=document.getElementById("jumbotron");d&&(d.innerHTML=`
              <div class="min-h-screen bg-black relative">
                <canvas id="gameCanvas" class="w-full h-full block"></canvas>
              </div>
            `);const{Pong3D:u}=await g(async()=>{const{Pong3D:c}=await import("./Pong3D-DmwfZDRA.js").then(s=>s.i);return{Pong3D:c}},__vite__mapDeps([3,1,2,4,5])),p=new u(o);window.currentGameInstance=p})}catch(e){console.error("Failed to auto-start tournament match:",e)}}render(){this.container.innerHTML="";const t=document.createElement("div");t.className="tournament-bracket",t.innerHTML=this.generateBracketHTML(),this.container.appendChild(t),this.addEventListeners(),this.checkForActiveMatch()}generateBracketHTML(){const t=this.getRounds();return`
      <div class="bracket-container">
        <div class="bracket-header">
          <h2 class="tournament-title">🏆 Tournament Bracket (${this.data.size} Players)</h2>
          <div class="tournament-status">
            ${this.data.isComplete?`<span class="status-complete">✅ Tournament Complete - Winner: ${this.data.winner?.name||"TBD"}</span>`:`<span class="status-active">⚡ Round ${this.data.currentRound} in progress - Live for all players</span>`}
          </div>
          <div class="bracket-info">
            <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">
              📺 All players can view the tournament brackets in real-time
            </p>
          </div>
        </div>
        
        <div class="bracket-rounds">
          ${t.map((e,n)=>this.generateRoundHTML(e,n)).join("")}
        </div>
      </div>
      
      <style>
        .tournament-bracket {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 16px;
          padding: 24px;
          color: white;
          max-width: 1200px;
          margin: 0 auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        .bracket-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .tournament-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 12px 0;
          background: linear-gradient(135deg, #84cc16, #65a30d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .tournament-status {
          font-size: 16px;
          font-weight: 600;
        }
        
        .status-complete {
          color: #10b981;
        }
        
        .status-active {
          color: #f59e0b;
        }
        
        .bracket-rounds {
          display: flex;
          justify-content: space-between;
          gap: 32px;
          overflow-x: auto;
          padding: 16px 0;
        }
        
        .bracket-round {
          flex: 1;
          min-width: 220px;
        }
        
        .round-header {
          text-align: center;
          margin-bottom: 20px;
          padding: 12px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
        }
        
        .round-matches {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .match-card {
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .match-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
          border-color: rgba(132, 204, 22, 0.5);
        }
        
        .match-card.completed {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }
        
        .match-card.active {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          animation: pulse 2s infinite;
        }

        .match-card.waiting {
          border-color: rgba(148, 163, 184, 0.4);
          background: rgba(148, 163, 184, 0.12);
        }
        
        @keyframes pulse {
          0%, 100% { border-color: #f59e0b; }
          50% { border-color: #fbbf24; }
        }
        
        .match-header {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 12px;
          text-align: center;
          font-weight: 600;
        }
        
        .match-players {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .player {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(0,0,0,0.2);
          font-weight: 600;
        }
        
        .player.winner {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        
        .player.loser {
          opacity: 0.6;
          text-decoration: line-through;
        }
        
        .player.current-user {
          border: 2px solid #84cc16;
          background: rgba(132, 204, 22, 0.15);
          box-shadow: 0 0 12px rgba(132, 204, 22, 0.3);
          font-weight: 700;
        }
        
        .player.current-user.winner {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.25);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
        }
        
        .player-name {
          flex: 1;
        }
        
        .player-score {
          font-weight: 800;
          font-size: 18px;
        }
        
        .player-status {
          font-size: 10px;
          color: #64748b;
        }
        
        .tbd-player {
          color: #64748b;
          font-style: italic;
        }
        
        .match-vs {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          margin: 4px 0;
          font-weight: 600;
        }
        
        .connection-lines {
          position: absolute;
          top: 50%;
          right: -16px;
          width: 32px;
          height: 2px;
          background: rgba(255,255,255,0.2);
          transform: translateY(-50%);
        }
        
        .connection-lines::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          width: 8px;
          height: 8px;
          background: rgba(255,255,255,0.3);
          border-radius: 50%;
          transform: translate(50%, -50%);
        }
        .connection-lines::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          width: 8px;
          height: 8px;
          background: rgba(255,255,255,0.3);
          border-radius: 50%;
          transform: translate(50%, -50%);
        }
        
        .match-actions {
          margin-top: 12px;
          text-align: center;
        }
        
        .btn-start-match {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-start-match:hover {
          background: linear-gradient(135deg, #65a30d, #4d7c0f);
          transform: translateY(-1px);
        }

        .winner-info {
          margin-bottom: 8px;
          text-align: center;
        }

        .winner-text {
          font-size: 12px;
          color: #10b981;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          animation: celebrate 2s ease-in-out infinite;
        }

        @keyframes celebrate {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* Match Status Badges */
        .match-status {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          margin-left: 8px;
        }

        .match-status.completed {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .match-status.active {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          animation: pulse 2s infinite;
        }

        .match-status.user-ready {
          background: rgba(132, 204, 22, 0.2);
          color: #84cc16;
          animation: pulse 2s infinite;
        }

        .match-status.ready {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .match-status.waiting {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }

        /* User Match Highlighting */
        .match-card.user-match {
          border: 2px solid #84cc16;
          box-shadow: 0 0 20px rgba(132, 204, 22, 0.3);
        }

        .match-card.user-match.pending {
          animation: glow 3s ease-in-out infinite;
        }

        /* Auto-start Info */
        .auto-start-info {
          text-align: center;
          margin-bottom: 8px;
        }

        .auto-start-text {
          font-size: 11px;
          color: #84cc16;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(132, 204, 22, 0.3); }
          50% { box-shadow: 0 0 30px rgba(132, 204, 22, 0.6); }
        }
      </style>
    `}getRounds(){const t=[],e=this.data.size===16?4:this.data.size===8?3:2;for(let n=1;n<=e;n++){const r=this.data.matches.filter(i=>i.round===n);t.push(r)}return t}generateRoundHTML(t,e){const n=this.data.size===16?["Round of 16","Quarterfinals","Semifinals","Final"]:this.data.size===8?["Quarterfinals","Semifinals","Final"]:["Semifinals","Final"],r=["🎮","⚔️","🏅","🏆"],i=["#3b82f6","#f59e0b","#8b5cf6","#ef4444"],l=r[e]||"🎯",a=i[e]||"#84cc16",o=n[e]||`Round ${e+1}`;return`
      <div class="bracket-round">
        <div class="round-header" style="background: linear-gradient(135deg, ${a}22, ${a}11); border: 2px solid ${a}44; box-shadow: 0 0 20px ${a}22;">
          <div style="font-size: 24px; margin-bottom: 4px;">${l}</div>
          <div style="color: ${a}; text-shadow: 0 0 10px ${a}88;">${o}</div>
          <div style="font-size: 11px; color: ${a}99; margin-top: 2px;">
            ${t.length} ${t.length===1?"match":"matches"}
          </div>
        </div>
        <div class="round-matches">
          ${t.map(d=>this.generateMatchHTML(d)).join("")}
        </div>
      </div>
    `}generateMatchHTML(t){const e=this.getCurrentUser(),n=this.resolveUserIdFromRecord(e)||this.currentUserId;!this.currentUserId&&n&&(this.currentUserId=n);const r=this.doesPlayerMatchUser(t.player1,n)||this.doesPlayerMatchUser(t.player2,n),i=t.isActive&&!t.isComplete,l=!t.isComplete&&!!t.player1&&!!t.player2&&!i,a=!!t.player1,o=!!t.player2,d=!t.isComplete&&(!!t.waitingForOpponent||a!==o),u=[];return t.isComplete?u.push("completed"):i?u.push("active"):l&&u.push("pending"),d&&u.push("waiting"),r&&u.push("user-match"),`
      <div class="match-card ${u.join(" ")}" data-match-id="${t.id}">
        <div class="match-header">
          Match ${t.matchIndex+1}
          ${this.getMatchStatusBadge(t,r,d)}
        </div>
        <div class="match-players">
          ${this.generatePlayerHTML(t.player1,t.score1,t.winner)}
          <div class="match-vs">VS</div>
          ${this.generatePlayerHTML(t.player2,t.score2,t.winner)}
        </div>
        ${this.getMatchActionsHTML(t,i,l,r)}
        ${!t.isComplete&&t.round<this.getRounds().length?'<div class="connection-lines"></div>':""}
      </div>
    `}getMatchStatusBadge(t,e,n){return t.isComplete?'<span class="match-status completed">✅ Complete</span>':t.isActive?'<span class="match-status active">🎮 Playing</span>':n?e?'<span class="match-status waiting">⌛ Waiting for opponent</span>':'<span class="match-status waiting">⌛ Opponent pending</span>':t.player1&&t.player2?e?'<span class="match-status user-ready">🚀 Your Turn</span>':'<span class="match-status ready">⏳ Ready</span>':'<span class="match-status waiting">⌛ Waiting</span>'}getMatchActionsHTML(t,e,n,r){const i=!!t.player1,l=!!t.player2,a=!t.isComplete&&(!!t.waitingForOpponent||i!==l),o=this.getCurrentUser(),d=this.resolveUserIdFromRecord(o)||this.currentUserId;return t.isComplete?d&&this.doesPlayerMatchUser(t.winner,d)?`
          <div class="match-actions">
            <div class="winner-info">
              <span class="winner-text">🏆 You won this match!</span>
            </div>
            <div style="color: #64748b; font-size: 12px; margin-top: 8px;">
              Waiting for next round to begin...
            </div>
          </div>
        `:"":a?r?`
          <div class="match-actions">
            <div class="auto-start-info">
              <span class="auto-start-text">⌛ Waiting for your opponent to finish their match...</span>
            </div>
          </div>
        `:`
        <div class="match-actions">
          <div class="auto-start-info">
            <span class="auto-start-text">⌛ Awaiting opponent assignment</span>
          </div>
        </div>
      `:e&&r?`
        <div class="match-actions">
          <div class="auto-start-info">
            <span class="auto-start-text">🎮 Your match is ready!</span>
          </div>
          <button class="btn-start-match" onclick="this.dispatchEvent(new CustomEvent('tournamentMatchStartRequest', {bubbles: true, detail: {match: ${JSON.stringify(t).replace(/"/g,"&quot;")}}}))">
            Start Match
          </button>
        </div>
      `:n&&r?`
        <div class="match-actions">
          <div class="auto-start-info">
            <span class="auto-start-text">🚀 Your turn to play!</span>
          </div>
          <button class="btn-start-match" onclick="this.dispatchEvent(new CustomEvent('tournamentMatchStartRequest', {bubbles: true, detail: {match: ${JSON.stringify(t).replace(/"/g,"&quot;")}}}))">
            Start Match
          </button>
        </div>
      `:n?`
        <div class="match-actions">
          <button class="btn-start-match" onclick="this.dispatchEvent(new CustomEvent('tournamentMatchStartRequest', {bubbles: true, detail: {match: ${JSON.stringify(t).replace(/"/g,"&quot;")}}}))">
            Start Match
          </button>
        </div>
      `:""}getCurrentUser(){try{const t=localStorage.getItem("ft_pong_user_data");return t?JSON.parse(t):null}catch{return null}}generatePlayerHTML(t,e,n){if(!t)return`
        <div class="player tbd-player">
          <span class="player-name">TBD</span>
          <span class="player-score">-</span>
        </div>
      `;const r=!!(n&&this.areSamePlayer(n,t)),i=!!(n&&!this.areSamePlayer(n,t)),l=this.doesPlayerMatchUser(t,this.currentUserId),a=r?"winner":i?"loser":"",o=l?"current-user":"",d=t.isAI?"🤖 ":"",u=l?'<span style="margin-left: 6px; padding: 2px 8px; background: #84cc16; color: black; font-size: 10px; font-weight: bold; border-radius: 4px;">YOU</span>':"",p=!t.isOnline&&!t.isAI?" (offline)":"";return`
      <div class="player ${a} ${o}">
        <span class="player-name">
          ${d}${t.name}${p}${u}
        </span>
        <span class="player-score">${e!==void 0?e:"-"}</span>
      </div>
    `}addEventListeners(){this.container.querySelectorAll(".match-card").forEach(e=>{e.addEventListener("click",n=>{const r=n.currentTarget.dataset.matchId;r&&this.onMatchClick(r)})})}onMatchClick(t){const e=this.data.matches.find(n=>n.id===t);e&&(console.log("Match clicked:",e),!e.isComplete&&e.player1&&e.player2&&!e.isActive?this.emitMatchStartRequest(e):e.isActive&&this.emitMatchViewRequest(e))}emitMatchStartRequest(t){const e=new CustomEvent("tournamentMatchStartRequest",{detail:{tournamentId:this.data.tournamentId,match:t}});window.dispatchEvent(e)}emitMatchViewRequest(t){const e=new CustomEvent("tournamentMatchViewRequest",{detail:{tournamentId:this.data.tournamentId,match:t}});window.dispatchEvent(e)}startAutoMatchPolling(t){if(this.isPolling){console.log("⚠️ Already polling for next match - ignoring duplicate request");return}this.pollingInterval&&(console.log("⚠️ Clearing existing polling interval before starting new one"),clearInterval(this.pollingInterval),this.pollingInterval=null),this.isPolling=!0;const e=this.getCurrentUser(),n=this.resolveUserIdFromRecord(e)||this.currentUserId;if(!n){console.log("❌ Cannot start polling - no current user");return}this.currentUserId||(this.currentUserId=n),console.log("🎯 Auto-polling started: checking for match in Round",t,"for user",n);let r=0;const i=60;this.pollingInterval=window.setInterval(async()=>{r++;try{const{tournamentService:l}=await g(async()=>{const{tournamentService:s}=await import("./TournamentService-6_ipt_40.js");return{tournamentService:s}},__vite__mapDeps([6,1,2])),a=await l.getTournament(this.data.tournamentId);console.log(`🔄 Auto-polling #${r}: Tournament state:`,{tournamentCurrentRound:a.currentRound,searchingForRound:t,totalMatches:a.matches.length,status:a.status}),this.data=a;const o=t-1,d=a.matches.filter(s=>s.round===o);if(d.length===0?!0:d.every(s=>s.isComplete))console.log(`✅ Auto-polling #${r}: All Round ${o} matches complete! Looking for Round ${t} match...`);else{const s=d.filter(h=>h.isComplete).length;console.log(`⏳ Auto-polling #${r}: Waiting for other matches in Round ${o}... (${s}/${d.length} complete)`)}const p=a.matches.filter(s=>(this.doesPlayerMatchUser(s.player1,n)||this.doesPlayerMatchUser(s.player2,n))&&!s.isComplete);console.log(`🔍 Auto-polling #${r}: Found ${p.length} incomplete matches with user`),console.log("🔍 DEBUG: All tournament matches:",a.matches.map(s=>({id:s.id,round:s.round,player1:s.player1?.name||"null",player1Id:s.player1?.id||"null",player2:s.player2?.name||"null",player2Id:s.player2?.id||"null",status:s.isComplete?"completed":s.isActive?"active":"pending",isActive:s.isActive,isComplete:s.isComplete}))),console.log("🔍 DEBUG: Current user ID:",n),p.length>0&&p.forEach(s=>{console.log(`  📋 Match: Round ${s.round}, ${s.player1?.name} vs ${s.player2?.name}, Active: ${s.isActive}`)});const c=p.find(s=>s.isActive);if(c){console.log("✅ Auto-polling: Active match found!",{matchId:c.id,round:c.round,player1:c.player1?.name,player2:c.player2?.name,isActive:c.isActive}),console.log("🏆 Auto-polling: Active match ready - showing bracket with Start button"),this.pollingInterval&&(clearInterval(this.pollingInterval),this.pollingInterval=null),this.isPolling=!1;return}else p.length>0?console.log(`⏳ Auto-polling #${r}: Match found but not active yet`):console.log(`🔄 Auto-polling #${r}/${i}: No match with user assigned yet`);a.isComplete&&(console.log("🏆 Auto-polling: Tournament complete - stopping"),this.pollingInterval&&(clearInterval(this.pollingInterval),this.pollingInterval=null),this.isPolling=!1),r>=i&&(console.log("⏰ Auto-polling: Reached max polls - stopping"),this.pollingInterval&&(clearInterval(this.pollingInterval),this.pollingInterval=null),this.isPolling=!1)}catch(l){console.error("❌ Auto-polling error:",l)}},2e3)}findNextMatchForWinner(t){const e=t.round+1,n=this.getCurrentUser(),r=this.resolveUserIdFromRecord(n)||this.currentUserId;if(!r)return console.log("❌ No current user found"),null;console.log("🔍 Looking for next match:",{currentRound:t.round,nextRound:e,userId:r,totalMatches:this.data.matches.length});const i=this.data.matches.filter(a=>a.round===e);console.log("📋 Matches in next round:",i.map(a=>({id:a.id,round:a.round,player1:`${a.player1?.name||"TBD"} (ID: ${a.player1?.id||"none"})`,player2:`${a.player2?.name||"TBD"} (ID: ${a.player2?.id||"none"})`,isActive:a.isActive,isComplete:a.isComplete}))),console.log("🔑 Searching for user ID:",r,"(type:",typeof r+")");const l=this.data.matches.find(a=>a.round===e&&(this.doesPlayerMatchUser(a.player1,r)||this.doesPlayerMatchUser(a.player2,r)));if(console.log("🎯 Match search result:",l?"Found":"Not found"),!l&&i.length>0){const a=i[0].player1,o=i[0].player2;console.log("🔍 Type comparison check:"),console.log("  User ID:",r,"Type:",typeof r),console.log("  Match player1 IDs:",a?.id,"/",a?.externalId),console.log("  Match player2 IDs:",o?.id,"/",o?.externalId),console.log("  Player1 matches user:",this.doesPlayerMatchUser(a,r)),console.log("  Player2 matches user:",this.doesPlayerMatchUser(o,r))}if(l)console.log("✅ Found next match with user already assigned:",{matchId:l.id,player1:l.player1?.name,player2:l.player2?.name});else{console.log("⚠️ User not found in any next round match");const a=this.data.matches.find(o=>o.round===e&&(o.isActive||!o.isComplete)&&o.player1&&o.player2);a&&console.log("ℹ️ Found active match in next round (but user not assigned):",{matchId:a.id,player1:a.player1?.name,player2:a.player2?.name})}return l||null}showTournamentProgression(){const t=new CustomEvent("showTournamentBracket",{detail:{tournamentId:this.data.tournamentId,action:"progression"}});window.dispatchEvent(t)}static generateInitialBracket(t,e,n,r,i="Tournament",l=!0,a=!0){const o=[],d=[...n].sort(()=>Math.random()-.5),u=e/2;for(let c=0;c<u;c++){const s=d[c*2],h=d[c*2+1];o.push({id:`round1-match${c}`,round:1,matchIndex:c,player1:s,player2:h,isComplete:!1,isActive:c===0})}const p=e===16?4:e===8?3:2;for(let c=2;c<=p;c++){const s=Math.pow(2,p-c);for(let h=0;h<s;h++)o.push({id:`round${c}-match${h}`,round:c,matchIndex:h,isComplete:!1,isActive:!1})}return{tournamentId:t,name:i,size:e,players:d,matches:o,currentRound:1,isComplete:!1,createdAt:new Date,status:"waiting",createdBy:r,isPublic:l,allowSpectators:a}}}export{v as TournamentBracket};

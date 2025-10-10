import{F as m}from"./index-BkxLX6Gf.js";class h{constructor(){this.activeMatches=new Map}static getInstance(){return h.instance||(console.log("🏆 Creating TournamentMatchService instance"),h.instance=new h),h.instance}async startTournamentMatch(o,n,t,e){console.log("🏆 Starting tournament match:",{tournament:o.name,match:n.id,player1:n.player1?.name,player2:n.player2?.name,currentPlayer:t.name}),console.log("🔍 Role assignment:",{"currentPlayer.id":t.id,"match.player1?.id":n.player1?.id,"match.player2?.id":n.player2?.id,isPlayer1Match:n.player1?.id===t.id,isPlayer2Match:n.player2?.id===t.id});const a=n.player1?.id===t.id;if(!(n.player1?.id===t.id||n.player2?.id===t.id))throw console.error("❌ Player ID mismatch - not in match!"),new Error("Current player is not in this match");console.log(`🏆 Player role determined: ${a?"HOST (player1)":"GUEST (player2)"}`);const i={tournament:o,match:n,currentPlayer:t,isHost:a};n.player1?.isAI||n.player2?.isAI?await this.startAIMatch(i,e):await this.startRemoteMultiplayerMatch(i,e)}async startRemoteMultiplayerMatch(o,n){const{tournament:t,match:e,currentPlayer:a,isHost:c}=o;console.log("🏆 Starting remote multiplayer tournament match:",{isHost:c,match:e.id,player1:e.player1?.name,player2:e.player2?.name});try{await m.connect(a.name,a.id);const i=this.getBroadcastChannel(),r=e.player1?.id===a.id?e.player2?.id:e.player1?.id;if(c){console.log("🏆 Creating tournament match room as host");const s=await m.createRoom("2p");if(!s)throw new Error("Failed to create tournament match room");if(console.log("🏆 Tournament match room created:",s),r){m.announceTournamentMatchRoom({roomId:s,tournamentId:t.tournamentId,matchId:e.id,opponentExternalId:r,match:{id:e.id,player1:e.player1?.name,player2:e.player2?.name},hostName:a.name});const d=l=>{l.opponentExternalId===r&&(m.off("tournament_match_room_ack",d),l.status==="error"&&console.warn("🏆 Tournament room delivery issue:",l.reason))};m.on("tournament_match_room_ack",d)}else console.warn("🏆 Unable to announce tournament match room - missing opponent ID");const p=e.player1?.id===a.id?e.player2:e.player1;if(p&&this.showHostWaitingOverlay(e,s,p),i)try{i.postMessage({type:"match_room_created",tournamentId:t.tournamentId,matchId:e.id,roomId:s,opponentId:r,match:{id:e.id,player1:e.player1?.name,player2:e.player2?.name}})}catch(d){console.warn("BroadcastChannel post failed (non-critical):",d)}this.waitForOpponentAndStart(o,s,n)}else{console.log("🏆 Guest waiting for host to announce room...");const s=await this.waitForRoomAnnouncement(t.tournamentId,e.id,a.id);if(!s)throw new Error("Timed out waiting for room announcement");if(!await m.joinRoom(s))throw new Error("Failed to join tournament match room");this.startTournamentGame(o,s,n)}}catch(i){console.error("🏆 Failed to start remote tournament match:",i),console.log("🏆 Falling back to AI match due to remote failure");const r={...o};r.match.player1&&r.match.player2&&(r.match.player1.isAI||(r.match.player2.isAI=!0,r.match.player2.aiLevel="medium")),await this.startAIMatch(r,n)}}getBroadcastChannel(){try{return new BroadcastChannel("ft_pong_tournaments")}catch{return null}}waitForRoomAnnouncement(o,n,t,e=3e4){return new Promise(a=>{let c=!1;const i=this.getBroadcastChannel();let r=null;const s=l=>{if(!c){if(c=!0,m.off("tournament_match_room",p),i){try{i.removeEventListener("message",d)}catch{}try{i.close()}catch{}}r&&(clearTimeout(r),r=null),a(l)}},p=l=>{l.tournamentId===o&&l.matchId===n&&typeof l.roomId=="string"&&s(l.roomId)},d=l=>{const y=l.data||{};y.type==="match_room_created"&&y.tournamentId===o&&y.matchId===n&&y.opponentId===t&&typeof y.roomId=="string"&&s(y.roomId)};if(m.on("tournament_match_room",p),i)try{i.addEventListener("message",d)}catch(l){console.warn("BroadcastChannel unavailable for tournament announcements:",l)}r=setTimeout(()=>{s(null)},e)})}async waitForOpponentAndStart(o,n,t){console.log("🏆 Host waiting for opponent to join...");const e=a=>{console.log("🏆 Opponent joined tournament match:",a),m.off("player_joined",e),this.hideWaitingOverlay(),this.startTournamentGame(o,n,t)};m.on("player_joined",e),setTimeout(()=>{m.off("player_joined",e),console.warn("🏆 Opponent did not join within timeout, starting AI match"),this.hideWaitingOverlay();const a={...o};a.match.player1&&a.match.player2&&(a.match.player2.isAI=!0,a.match.player2.aiLevel="medium"),this.startAIMatch(a,t)},3e4)}startTournamentGame(o,n,t){const{tournament:e,match:a,currentPlayer:c,isHost:i}=o,r={playerCount:2,connection:i?"remoteHost":"remoteGuest",roomId:n,winScore:5,displayNames:[a.player1.name,a.player2.name],currentUser:{id:c.id,email:"",firstName:c.name,lastName:"",userName:c.name,createdAt:new Date,updatedAt:new Date},tournament:{id:e.tournamentId,matchId:a.id,round:a.round,matchIndex:a.matchIndex,players:[{id:a.player1.id,name:a.player1.name,isAI:!1,side:"left"},{id:a.player2.id,name:a.player2.name,isAI:!1,side:"right"}]}};console.log("🏆 Starting tournament game with remote connection:",r),t(r)}async startAIMatch(o,n){const{match:t,currentPlayer:e}=o,a=t.player1?.isAI?t.player1:t.player2,c=t.player1?.isAI?t.player2:t.player1,i={playerCount:2,connection:"ai",aiDifficulty:this.getAIDifficultyLevel(a?.aiLevel||"medium"),winScore:5,displayNames:[c?.name||"Player",a?.name||"AI"],currentUser:{id:e.id,email:"",firstName:e.name,lastName:"",userName:e.name,createdAt:new Date,updatedAt:new Date},tournament:{id:o.tournament.tournamentId,matchId:t.id,round:t.round,matchIndex:t.matchIndex,players:[{id:t.player1.id,name:t.player1.name,isAI:t.player1.isAI||!1,side:"left"},{id:t.player2.id,name:t.player2.name,isAI:t.player2.isAI||!1,side:"right"}]}};console.log("🏆 Starting AI tournament match:",i),n(i)}showHostWaitingOverlay(o,n,t){const e=document.createElement("div");e.id="tournament-match-overlay",e.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `,e.innerHTML=`
      <div style="
        background: linear-gradient(135deg, #1e293b, #334155);
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        color: white;
        max-width: 500px;
        border: 2px solid #84cc16;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">🏆</div>
        <h2 style="color: #84cc16; margin-bottom: 20px; font-size: 24px;">Tournament Match</h2>
        <p style="margin-bottom: 20px; font-size: 18px;">
          Waiting for <strong style="color: #84cc16;">${t.name}</strong> to join...
        </p>
        <div style="
          background: rgba(0,0,0,0.4);
          padding: 16px;
          border-radius: 12px;
          margin: 20px 0;
          font-family: monospace;
          font-size: 20px;
          letter-spacing: 2px;
          color: #84cc16;
          border: 1px solid #84cc16;
        ">${n}</div>
        <div style="margin-top: 30px;">
          <div class="spinner" style="
            width: 40px;
            height: 40px;
            border: 4px solid rgba(132, 204, 22, 0.3);
            border-top: 4px solid #84cc16;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          "></div>
        </div>
        <button id="cancel-match" style="
          margin-top: 30px;
          padding: 12px 24px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">Cancel Match</button>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `,document.body.appendChild(e),e.querySelector("#cancel-match")?.addEventListener("click",()=>{this.hideWaitingOverlay(),m.disconnect()})}hideWaitingOverlay(){const o=document.getElementById("tournament-match-overlay");o&&o.remove()}getAIDifficultyLevel(o){switch(o){case"easy":return 3;case"medium":return 6;case"hard":return 9;default:return 6}}cleanup(){this.activeMatches.clear(),this.hideWaitingOverlay()}}export{h as TournamentMatchService};

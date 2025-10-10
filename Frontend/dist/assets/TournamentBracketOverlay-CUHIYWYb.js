const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/TournamentBracket-CYl2Jwku.js","assets/index-BkxLX6Gf.js","assets/index-L2VcX_a3.css","assets/TournamentService-6_ipt_40.js"])))=>i.map(i=>d[i]);
import{_ as i}from"./index-BkxLX6Gf.js";class s{constructor(){this.overlay=null,this.bracketComponent=null,this.autoHideTimer=null,this.handleKeyDown=t=>{if(this.overlay)switch(t.key){case"Escape":this.hide();break;case"Enter":case" ":this.handleContinue();break}}}async show(t,e){console.log("🏆 Showing tournament bracket overlay:",t),this.hide(),this.createOverlay(t),e||(e=await this.loadTournamentData(t.tournamentId)),e&&this.renderBracket(e,t),this.setupAutoHide()}hide(){this.overlay&&(this.overlay.remove(),this.overlay=null),this.bracketComponent&&(this.bracketComponent=null),this.autoHideTimer&&(clearTimeout(this.autoHideTimer),this.autoHideTimer=null)}async updateBracket(t){if(this.overlay)try{const e=await this.loadTournamentData(t);e&&this.bracketComponent&&this.bracketComponent.updateData(e)}catch(e){console.error("❌ Failed to update bracket:",e)}}createOverlay(t){this.overlay=document.createElement("div"),this.overlay.className="tournament-bracket-overlay",this.overlay.innerHTML=this.getOverlayHTML(t),document.body.appendChild(this.overlay),this.attachEventListeners()}getOverlayHTML(t){const e=t.isWinner?"Victory!":"Eliminated",n=t.isWinner?"🏆":"⚰️",o=t.isWinner?"winner":"loser",[a,r]=t.scores||[0,0];return`
      <style>
        .tournament-bracket-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.5s ease-out;
        }

        .bracket-header {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          padding: 20px;
          border-bottom: 2px solid #84cc16;
          text-align: center;
        }

        .match-result {
          margin-bottom: 16px;
        }

        .result-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }

        .result-text {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .result-text.winner {
          color: #84cc16;
        }

        .result-text.loser {
          color: #ef4444;
        }

        .match-score {
          font-size: 20px;
          color: #94a3b8;
          font-weight: 600;
        }

        .bracket-title {
          font-size: 24px;
          font-weight: bold;
          color: white;
          margin: 8px 0;
        }

        .bracket-subtitle {
          font-size: 14px;
          color: #94a3b8;
        }

        .bracket-container {
          flex: 1;
          padding: 20px;
          overflow: auto;
          position: relative;
        }

        .bracket-content {
          max-width: 1400px;
          margin: 0 auto;
          min-height: 400px;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 12px;
          padding: 24px;
          border: 1px solid rgba(132, 204, 22, 0.3);
        }

        .bracket-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #94a3b8;
          font-size: 18px;
        }

        .bracket-actions {
          padding: 20px;
          background: rgba(15, 23, 42, 0.9);
          border-top: 1px solid rgba(132, 204, 22, 0.3);
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #84cc16, #65a30d);
          color: white;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #65a30d, #4d7c0f);
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .auto-hide-countdown {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.7);
          color: #94a3b8;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .bracket-header {
            padding: 16px;
          }

          .result-icon {
            font-size: 36px;
          }

          .result-text {
            font-size: 20px;
          }

          .match-score {
            font-size: 16px;
          }

          .bracket-title {
            font-size: 20px;
          }

          .bracket-container {
            padding: 12px;
          }

          .bracket-content {
            padding: 16px;
          }

          .bracket-actions {
            flex-direction: column;
            padding: 16px;
          }
        }
      </style>

      <div class="bracket-header">
        <div class="match-result">
          <div class="result-icon">${n}</div>
          <div class="result-text ${o}">${e}</div>
          <div class="match-score">${a} - ${r}</div>
        </div>
        <div class="bracket-title">Tournament Bracket</div>
        <div class="bracket-subtitle">Current tournament standings and progression</div>
      </div>

      <div class="bracket-container">
        <div class="auto-hide-countdown" id="autoHideCountdown">
          Auto-continue in <span id="countdownTimer">10</span>s
        </div>
        <div class="bracket-content" id="bracketContent">
          <div class="bracket-loading">
            <div style="margin-right: 12px;">⏳</div>
            Loading tournament bracket...
          </div>
        </div>
      </div>

      <div class="bracket-actions">
        <button class="btn btn-secondary" data-action="continue">
          Continue Tournament
        </button>
        <button class="btn btn-primary" data-action="view-full">
          View Full Bracket
        </button>
        <button class="btn btn-secondary" data-action="close">
          Close
        </button>
      </div>
    `}attachEventListeners(){this.overlay&&(this.overlay.addEventListener("click",t=>{switch(t.target.dataset.action){case"continue":this.handleContinue();break;case"view-full":this.handleViewFull();break;case"close":this.hide();break}}),this.overlay.addEventListener("mouseenter",()=>{this.pauseAutoHide()}),this.overlay.addEventListener("mouseleave",()=>{this.resumeAutoHide()}),document.addEventListener("keydown",this.handleKeyDown))}async renderBracket(t,e){const n=this.overlay?.querySelector("#bracketContent");if(n)try{n.innerHTML="";const{TournamentBracket:o}=await i(async()=>{const{TournamentBracket:a}=await import("./TournamentBracket-CYl2Jwku.js");return{TournamentBracket:a}},__vite__mapDeps([0,1,2]));this.bracketComponent=new o(n,t),this.highlightCompletedMatch(e)}catch(o){console.error("❌ Failed to render tournament bracket:",o),n.innerHTML=`
        <div style="text-align: center; color: #ef4444; padding: 40px;">
          <div style="font-size: 24px; margin-bottom: 12px;">❌</div>
          <div>Failed to load tournament bracket</div>
        </div>
      `}}highlightCompletedMatch(t){setTimeout(()=>{const e=this.overlay?.querySelector(`[data-match-id="${t.matchId}"]`);if(e){e.classList.add("just-completed");const n=document.createElement("style");n.textContent=`
          .just-completed {
            animation: highlight 3s ease-in-out;
            border: 2px solid #84cc16 !important;
            box-shadow: 0 0 20px rgba(132, 204, 22, 0.5) !important;
          }
          @keyframes highlight {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `,document.head.appendChild(n),setTimeout(()=>{e.classList.remove("just-completed"),n.remove()},3e3)}},500)}async loadTournamentData(t){try{const{tournamentService:e}=await i(async()=>{const{tournamentService:n}=await import("./TournamentService-6_ipt_40.js");return{tournamentService:n}},__vite__mapDeps([3,1,2]));return await e.getTournament(t)}catch(e){return console.error("❌ Failed to load tournament data:",e),null}}setupAutoHide(){let t=10;const e=()=>{const n=this.overlay?.querySelector("#countdownTimer");n&&(n.textContent=t.toString()),t--,t<0?this.handleContinue():this.autoHideTimer=window.setTimeout(e,1e3)};this.autoHideTimer=window.setTimeout(e,1e3)}pauseAutoHide(){this.autoHideTimer&&(clearTimeout(this.autoHideTimer),this.autoHideTimer=null);const t=this.overlay?.querySelector("#autoHideCountdown");t&&(t.textContent="Paused - move mouse away to resume")}resumeAutoHide(){this.setupAutoHide()}handleContinue(){this.hide(),window.dispatchEvent(new CustomEvent("ft:tournament:continueFromBracket",{detail:{action:"continue"}}))}handleViewFull(){this.hide(),window.dispatchEvent(new CustomEvent("ft:tournament:showFullBracket",{detail:{action:"view_full"}}))}destroy(){document.removeEventListener("keydown",this.handleKeyDown),this.hide()}}const l=new s;export{s as TournamentBracketOverlay,l as tournamentBracketOverlay};

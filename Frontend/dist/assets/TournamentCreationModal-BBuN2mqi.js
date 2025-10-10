import{newTournamentService as c}from"./NewTournamentService-BP1FKkH1.js";import{s as l}from"./index-BkxLX6Gf.js";class d{constructor(){this.container=null,this.selectedSize=8,this.isCreating=!1}show(){this.container||(this.container=document.createElement("div"),this.container.className="tournament-modal-overlay",this.container.innerHTML=this.getModalHTML(),document.body.appendChild(this.container),this.attachEventListeners())}hide(){this.container&&(this.container.remove(),this.container=null)}getModalHTML(){return`
      <div class="tournament-modal">
        <div class="tournament-modal-header">
          <h2>🏆 Create Tournament</h2>
          <button class="close-btn" data-action="close">×</button>
        </div>

        <div class="tournament-modal-body">
          <!-- Size Selection -->
          <div class="form-section">
            <label class="form-label">Tournament Size</label>
            <div class="size-selector">
              ${this.getSizeButtonHTML(4)}
              ${this.getSizeButtonHTML(8)}
              ${this.getSizeButtonHTML(16)}
            </div>
            <p class="form-hint">Choose the number of players for your tournament</p>
          </div>

          <!-- Game Settings -->
          <div class="form-section">
            <label class="form-label">Game Settings</label>
            <div class="settings-info">
              <div class="setting-item">
                <span class="setting-icon">⚽</span>
                <span class="setting-text">First to 5 goals wins</span>
              </div>
              <div class="setting-item">
                <span class="setting-icon">🏁</span>
                <span class="setting-text">Single elimination bracket</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="modal-actions">
            <button class="btn btn-secondary" data-action="cancel">
              Cancel
            </button>
            <button class="btn btn-primary" data-action="create" id="createBtn">
              <span class="btn-icon">🎮</span>
              Create Tournament
            </button>
          </div>

          <!-- Loading State -->
          <div class="loading-state" id="loadingState" style="display: none;">
            <div class="spinner"></div>
            <p>Creating tournament...</p>
          </div>

          <!-- Error State -->
          <div class="error-state" id="errorState" style="display: none;">
            <p class="error-message" id="errorMessage"></p>
          </div>
        </div>
      </div>
    `}getSizeButtonHTML(e){const n=e===this.selectedSize,t=this.getRoundsForSize(e);return`
      <button 
        class="size-btn ${n?"selected":""}" 
        data-size="${e}"
      >
        <div class="size-number">${e}</div>
        <div class="size-label">Players</div>
        <div class="size-rounds">${t} rounds</div>
      </button>
    `}getRoundsForSize(e){switch(e){case 4:return 2;case 8:return 3;case 16:return 4}}attachEventListeners(){if(!this.container)return;this.container.querySelector('[data-action="close"]')?.addEventListener("click",()=>this.handleClose()),this.container.querySelector('[data-action="cancel"]')?.addEventListener("click",()=>this.handleClose()),this.container.querySelector('[data-action="create"]')?.addEventListener("click",()=>this.handleCreate()),this.container.querySelectorAll(".size-btn").forEach(s=>{s.addEventListener("click",i=>{const o=i.currentTarget,r=parseInt(o.dataset.size);this.handleSizeChange(r)})}),this.container.addEventListener("click",s=>{s.target===this.container&&this.handleClose()})}async handleClose(){await l("Return to main menu?","Leave Tournament Creation","Yes, Leave","Stay Here")&&(this.hide(),window.dispatchEvent(new CustomEvent("ft:pong:returnToMenu",{detail:{reason:"tournament-modal-closed"}})))}handleSizeChange(e){this.selectedSize=e,this.container?.querySelectorAll(".size-btn")?.forEach(t=>{parseInt(t.dataset.size)===e?t.classList.add("selected"):t.classList.remove("selected")})}async handleCreate(){if(!this.isCreating){this.isCreating=!0,this.showLoading(!0),this.showError("");try{const e=await c.createTournament({size:this.selectedSize,autoStartMinutes:0});console.log("✅ Tournament created:",e),this.hide(),this.showTournamentLobby(e)}catch(e){console.error("❌ Failed to create tournament:",e),this.showError(e.message||"Failed to create tournament")}finally{this.isCreating=!1,this.showLoading(!1)}}}showLoading(e){const n=this.container?.querySelector("#loadingState"),t=this.container?.querySelector("#createBtn");n&&(n.style.display=e?"flex":"none"),t&&(t.disabled=e)}showError(e){const n=this.container?.querySelector("#errorState"),t=this.container?.querySelector("#errorMessage");n&&t&&(e?(t.textContent=e,n.style.display="block"):n.style.display="none")}showTournamentLobby(e){window.dispatchEvent(new CustomEvent("tournament-created",{detail:{tournament:e}}))}}const v=new d;export{d as TournamentCreationModal,v as tournamentCreationModal};

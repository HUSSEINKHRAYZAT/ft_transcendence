// filepath: /sgoinfre/hkhrayza/ft_pongfayadb/Frontend/src/tournament/ui/TournamentStateMachine.ts
import { tournamentService } from '../TournamentService';

// Lightweight auth resolution (avoid circular deep imports)
function getCurrentUser(): { id: string; name?: string } | null {
  try {
    const raw = sessionStorage.getItem('ft_pong_current_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export type TournamentUIState =
  | 'idle'
  | 'victory_intro'
  | 'eliminated_intro'
  | 'waiting_bracket'
  | 'spectator_bracket'
  | 'ready'
  | 'starting'
  | 'completed';

export interface MatchSummary {
  tournamentId: string;
  matchId: string;
  winnerIdx: number;
  scores: number[];
  players?: Array<{ id?: string; name?: string; side?: string }>;
  isWinner: boolean;
}

interface StateContext {
  summary?: MatchSummary;
  tournament?: any; // Using existing dynamic type until types are unified
  activeMatch?: any;
}

interface Dependencies {
  startMatch: (tournament: any, match: any) => void;
  markReady: (tournamentId: string, matchId: string) => Promise<void>;
  fetchTournament: (id: string) => Promise<any>;
  renderBracket: (t: any) => Promise<void>;
  log?: (...args: any[]) => void;
}

export class TournamentUIStateMachine {
  private state: TournamentUIState = 'idle';
  private ctx: StateContext = {};
  private deps: Dependencies;
  private rootEl: HTMLElement;
  private disposed = false;
  private pollingTimer: any = null;

  constructor(deps: Dependencies) {
    this.deps = deps;
    this.rootEl = this.ensureRoot();
  }

  /* ---------------- Public API ---------------- */
  getState(): TournamentUIState { return this.state; }
  getContext(): StateContext { return this.ctx; }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    // Detach tournamentService listeners
    tournamentService.off('tournamentUpdated', this.handleTournamentUpdated as any);
    tournamentService.off('matchCompleted', this.handleMatchCompleted as any);
    tournamentService.off('bothPlayersReady', this.handleBothPlayersReady as any);
    try { this.rootEl.remove(); } catch {}
  }

  handleMatchEnd(outcome: 'victory' | 'eliminated', summary: MatchSummary) {
    this.ctx.summary = summary;
    if (outcome === 'victory') {
      this.transition('victory_intro');
    } else {
      this.transition('eliminated_intro');
    }
  }

  /* ---------------- Internal Root & Rendering ---------------- */
  private ensureRoot(): HTMLElement {
    let el = document.getElementById('tournament-ui-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tournament-ui-root';
      el.style.cssText = `position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;background:rgba(0,0,0,0.94);color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow-y:auto;`;
      document.body.appendChild(el);
    }
    return el as HTMLElement;
  }

  private setContent(html: string) {
    this.rootEl.innerHTML = html;
  }

  private transition(next: TournamentUIState) {
    if (this.disposed) return;
    const prev = this.state;
    this.state = next;
    this.deps.log?.(`🎯 TournamentUI transition: ${prev} -> ${next}`);

    switch (next) {
      case 'victory_intro':
        this.renderVictoryIntro();
        break;
      case 'eliminated_intro':
        this.renderEliminatedIntro();
        break;
      case 'waiting_bracket':
        this.renderWaitingBracket();
        break;
      case 'spectator_bracket':
        this.renderSpectatorBracket();
        break;
      case 'ready':
        this.renderReadyScreen();
        break;
      case 'starting':
        this.renderStarting();
        break;
      case 'completed':
        this.renderCompleted();
        break;
    }
  }

  /* ---------------- Renderers ---------------- */
  private renderVictoryIntro() {
    const s = this.ctx.summary!;
    const [a=0,b=0] = s.scores || [];
    this.setContent(`
      <div style="margin:auto;text-align:center;animation:victoryPulse 1.2s ease;max-width:900px;padding:40px 20px;">
        <div style="font-size:140px;">🏆</div>
        <h1 style="font-size:64px;margin:0 0 12px;font-weight:800;color:#84cc16;text-shadow:0 0 40px #84cc16aa">VICTORY</h1>
        <div style="font-size:32px;color:#94a3b8;font-weight:600;margin-bottom:24px;">${a} - ${b}</div>
        <p style="color:#64748b;font-size:18px;margin-bottom:32px;">Advancing shortly…</p>
      </div>
      <style>@keyframes victoryPulse{0%{opacity:0;transform:scale(.5)}60%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}} </style>
    `);
    setTimeout(()=>this.transition('waiting_bracket'), 2000);
  }

  private renderEliminatedIntro() {
    const s = this.ctx.summary!;
    const [a=0,b=0] = s.scores || [];
    this.setContent(`
      <div style="margin:auto;text-align:center;animation:fadeIn .9s ease;max-width:900px;padding:40px 20px;">
        <div style="font-size:120px;">💔</div>
        <h1 style="font-size:60px;margin:0 0 12px;font-weight:800;color:#ef4444;text-shadow:0 0 40px #ef4444aa">ELIMINATED</h1>
        <div style="font-size:28px;color:#94a3b8;font-weight:600;margin-bottom:24px;">${a} - ${b}</div>
        <p style="color:#64748b;font-size:18px;margin-bottom:32px;">You can still watch the bracket progress live.</p>
      </div>
      <style>@keyframes fadeIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}} </style>
    `);
    setTimeout(()=>this.transition('spectator_bracket'), 2500);
  }

  private async renderWaitingBracket() {
    const tournamentId = this.ctx.summary?.tournamentId;
    if (!tournamentId) return;
    const t = await this.fetchLatestTournament(tournamentId);
    this.ctx.tournament = t;
    this.attachLiveListeners();
    await this.deps.renderBracket(t);
    this.decorateBracketContainer('You won your match! Waiting for next match assignment…', true);
    this.startPolling();
  }

  private async renderSpectatorBracket() {
    const tournamentId = this.ctx.summary?.tournamentId;
    if (!tournamentId) return;
    const t = await this.fetchLatestTournament(tournamentId);
    this.ctx.tournament = t;
    this.attachLiveListeners();
    await this.deps.renderBracket(t);
    this.decorateBracketContainer('You have been eliminated – spectating bracket…', false);
    this.startPolling();
  }

  private renderReadyScreen() {
    const match = this.ctx.activeMatch;
    const opponent = this.resolveOpponent(match);
    this.setContent(`
      <div style="max-width:1400px;margin:0 auto;padding:32px;">
        <div style="text-align:center;margin-bottom:28px;">
          <h1 style="margin:0;font-size:48px;font-weight:800;color:#84cc16;">Next Match Ready</h1>
          <p style="color:#94a3b8;font-size:18px;">Opponent: <strong style="color:#fff;">${opponent?.name||'Opponent'}</strong></p>
          <p id="ready-sub" style="color:#64748b;font-size:16px;">Click ready when prepared</p>
        </div>
        <div id="bracket-host" style="margin-bottom:32px;"></div>
        <div style="text-align:center;">
          <button id="btn-ready" style="padding:18px 56px;font-size:22px;font-weight:700;background:linear-gradient(135deg,#84cc16,#65a30d);border:none;border-radius:14px;color:#fff;cursor:pointer;box-shadow:0 6px 24px #84cc1633;">✓ Ready</button>
        </div>
      </div>
    `);
    // Re-render bracket inside placeholder
    this.deps.renderBracket(this.ctx.tournament);
    this.wireReadyButton();
  }

  private renderStarting() {
    this.setContent(`
      <div style="margin:auto;text-align:center;padding:60px 20px;">
        <div style="font-size:100px;margin-bottom:24px;">🚀</div>
        <h1 style="font-size:54px;font-weight:800;margin:0 0 12px;color:#84cc16;">Match Starting…</h1>
        <p style="color:#64748b;font-size:18px;">Preparing game session…</p>
      </div>
    `);
  }

  private renderCompleted() {
    const winnerName = this.ctx.tournament?.winner?.name || 'Champion';
    this.setContent(`
      <div style="margin:auto;text-align:center;padding:60px 20px;">
        <div style="font-size:120px;margin-bottom:20px;">🏆</div>
        <h1 style="font-size:60px;font-weight:800;margin:0 0 16px;color:#84cc16;">Tournament Complete</h1>
        <p style="font-size:24px;color:#94a3b8;margin:0 0 40px;">Winner: <strong style="color:#fff;">${winnerName}</strong></p>
        <button id="btn-exit" style="padding:18px 56px;font-size:22px;font-weight:700;background:linear-gradient(135deg,#84cc16,#65a30d);border:none;border-radius:14px;color:#fff;cursor:pointer;">Return Home</button>
      </div>
    `);
    this.rootEl.querySelector('#btn-exit')?.addEventListener('click', ()=>{
      window.location.reload();
    });
  }

  /* ---------------- Helpers ---------------- */
  private decorateBracketContainer(message: string, isWinner: boolean) {
    this.rootEl.innerHTML = `
      <div style="max-width:1400px;margin:0 auto;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="margin:0;font-size:46px;font-weight:800;color:${isWinner?'#84cc16':'#ef4444'};">${isWinner? 'Victory' : 'Eliminated'}</h1>
          <p style="color:#94a3b8;font-size:18px;">${message}</p>
        </div>
        <div id="bracket-host"></div>
      </div>
    `;
  }

  private resolveOpponent(match: any) {
    if (!match) return null;
    const user = getCurrentUser();
    if (!user) return match.player2 || match.player1;
    if (match.player1?.id === user.id) return match.player2;
    if (match.player2?.id === user.id) return match.player1;
    return match.player2 || match.player1;
  }

  private wireReadyButton() {
    const btn = this.rootEl.querySelector('#btn-ready') as HTMLButtonElement | null;
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!this.ctx.tournament || !this.ctx.activeMatch) return;
      btn.disabled = true;
      btn.innerHTML = '⏳ Waiting for opponent…';
      try {
        await this.deps.markReady(this.ctx.tournament.tournamentId, this.ctx.activeMatch.id);
        const sub = this.rootEl.querySelector('#ready-sub');
        if (sub) sub.textContent = 'Ready sent – waiting for opponent…';
      } catch (e) {
        btn.disabled = false;
        btn.innerHTML = 'Retry Ready';
      }
    });
  }

  private async fetchLatestTournament(id: string) {
    try {
      return await this.deps.fetchTournament(id);
    } catch (e) {
      this.deps.log?.('⚠️ Failed fresh tournament fetch:', e);
      throw e;
    }
  }

  private startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(async () => {
      if (this.disposed || !this.ctx.summary) return;
      try {
        const t = await this.fetchLatestTournament(this.ctx.summary.tournamentId);
        this.processTournamentUpdate(t);
      } catch {}
    }, 2500);
  }

  private attachLiveListeners() {
    tournamentService.on('tournamentUpdated', this.handleTournamentUpdated as any);
    tournamentService.on('matchCompleted', this.handleMatchCompleted as any);
    tournamentService.on('bothPlayersReady', this.handleBothPlayersReady as any);
  }

  private handleTournamentUpdated = (t: any) => {
    if (this.disposed || !t) return;
    if (!this.ctx.summary || t.tournamentId !== this.ctx.summary.tournamentId) return;
    this.processTournamentUpdate(t);
  };

  private handleMatchCompleted = ({ tournament: t }: any) => {
    if (t) this.handleTournamentUpdated(t);
  };

  private handleBothPlayersReady = ({ tournamentId, matchId }: any) => {
    if (this.disposed) return;
    if (!this.ctx.tournament || this.ctx.tournament.tournamentId !== tournamentId) return;
    if (this.ctx.activeMatch && this.ctx.activeMatch.id === matchId) {
      this.transition('starting');
      // Delay slightly to show starting UI
      setTimeout(() => {
        this.deps.startMatch(this.ctx.tournament, this.ctx.activeMatch);
      }, 600);
    }
  };

  private processTournamentUpdate(t: any) {
    this.ctx.tournament = t;
    // If tournament completed
    if (t.status === 'completed') {
      this.transition('completed');
      return;
    }

    // Find if user has an active or pending match
    const user = getCurrentUser();
    if (!user) return;
    const candidate = t.matches.find((m: any) => !m.isComplete && (m.player1?.id === user.id || m.player2?.id === user.id));

    if (candidate) {
      // If we are in a waiting or spectator state and now have a next match -> ready state
      if (['waiting_bracket','spectator_bracket'].includes(this.state)) {
        this.ctx.activeMatch = candidate;
        this.transition('ready');
      } else if (this.state === 'ready') {
        // Update bracket region
        const host = this.rootEl.querySelector('#bracket-host');
        if (host) {
          this.deps.renderBracket(t);
        }
      }
    } else {
      // Still waiting; if in waiting states, rerender bracket container
      if (['waiting_bracket','spectator_bracket'].includes(this.state)) {
        const host = this.rootEl.querySelector('#bracket-host');
        if (host) {
          this.deps.renderBracket(t);
        }
      }
    }
  }
}

import { TournamentUI } from './TournamentUI';
import { tournamentService } from './TournamentService';
import { TournamentBracket } from './TournamentBracket';

export class TournamentDemo {
  private demoContainer: HTMLElement | null = null;

  public async createDemoTournament(): Promise<void> {
    try {
      // Create a demo tournament
      const tournament = await tournamentService.createTournament({
        name: 'Demo Championship 2025',
        size: 8,
        isPublic: true,
        allowSpectators: true,
      });

      console.log('Demo tournament created:', tournament);

      // Add some demo players
      const demoPlayers = [
        { id: 'player1', name: 'Alice Champion', isOnline: true },
        { id: 'player2', name: 'Bob Lightning', isOnline: true },
        { id: 'player3', name: 'Charlie Swift', isOnline: false },
        { id: 'player4', name: 'Diana Power', isOnline: true },
      ];

      // Join players to tournament
      for (const player of demoPlayers) {
        await tournamentService.joinTournament({
          tournamentId: tournament.tournamentId,
          playerId: player.id,
          playerName: player.name,
        });
      }

      // Fill remaining slots with AI
      await tournamentService.fillWithAI(tournament.tournamentId);

      // Start the tournament
      const startedTournament = await tournamentService.startTournament(tournament.tournamentId);
      
      console.log('Demo tournament started with bracket:', startedTournament);
      
      return startedTournament.tournamentId;
    } catch (error) {
      console.error('Failed to create demo tournament:', error);
      throw error;
    }
  }

  public async simulateMatchResults(tournamentId: string): Promise<void> {
    try {
      const tournament = await tournamentService.getTournament(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Simulate first round matches
      const firstRoundMatches = tournament.matches.filter(m => m.round === 1);
      
      for (const match of firstRoundMatches) {
        if (match.player1 && match.player2) {
          // Randomly determine winner
          const winner = Math.random() > 0.5 ? match.player1 : match.player2;
          const score1 = winner === match.player1 ? 10 : Math.floor(Math.random() * 9);
          const score2 = winner === match.player2 ? 10 : Math.floor(Math.random() * 9);

          console.log(`Simulating match: ${match.player1.name} vs ${match.player2.name}`);
          console.log(`Result: ${score1} - ${score2}, Winner: ${winner.name}`);

          await tournamentService.completeMatch(
            tournamentId,
            match.id,
            winner.id,
            score1,
            score2
          );

          // Add delay for dramatic effect
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('First round completed!');
    } catch (error) {
      console.error('Failed to simulate match results:', error);
    }
  }

  public showDemoUI(): void {
    // Create demo container
    this.demoContainer = document.createElement('div');
    this.demoContainer.id = 'tournament-demo';
    this.demoContainer.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; z-index: 9999; background: rgba(0,0,0,0.9); padding: 20px; border-radius: 12px; color: white; min-width: 300px;">
        <h3 style="margin: 0 0 16px 0; color: #84cc16;">🏆 Tournament Demo</h3>
        
        <div style="margin-bottom: 12px;">
          <button id="demo-create" style="width: 100%; padding: 8px; background: #84cc16; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 8px;">
            Create Demo Tournament
          </button>
        </div>
        
        <div style="margin-bottom: 12px;">
          <button id="demo-simulate" style="width: 100%; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 8px;" disabled>
            Simulate First Round
          </button>
        </div>
        
        <div style="margin-bottom: 12px;">
          <button id="demo-open-hub" style="width: 100%; padding: 8px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 8px;">
            Open Tournament Hub
          </button>
        </div>
        
        <div style="margin-bottom: 12px;">
          <button id="demo-close" style="width: 100%; padding: 8px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Close Demo
          </button>
        </div>
        
        <div id="demo-status" style="margin-top: 16px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; font-size: 12px;">
          Ready to create demo tournament
        </div>
      </div>
    `;

    document.body.appendChild(this.demoContainer);

    // Set up event listeners
    this.setupDemoEventListeners();
  }

  private setupDemoEventListeners(): void {
    if (!this.demoContainer) return;

    let currentTournamentId: string | null = null;

    // Create demo tournament
    this.demoContainer.querySelector('#demo-create')?.addEventListener('click', async () => {
      const statusEl = this.demoContainer?.querySelector('#demo-status');
      const createBtn = this.demoContainer?.querySelector('#demo-create') as HTMLButtonElement;
      const simulateBtn = this.demoContainer?.querySelector('#demo-simulate') as HTMLButtonElement;

      try {
        if (statusEl) statusEl.textContent = 'Creating demo tournament...';
        createBtn.disabled = true;

        currentTournamentId = await this.createDemoTournament();
        
        if (statusEl) statusEl.textContent = `Demo tournament created: ${currentTournamentId}`;
        simulateBtn.disabled = false;
        createBtn.textContent = 'Create New Demo';
        createBtn.disabled = false;
      } catch (error) {
        if (statusEl) statusEl.textContent = 'Failed to create demo tournament';
        createBtn.disabled = false;
        console.error(error);
      }
    });

    // Simulate matches
    this.demoContainer.querySelector('#demo-simulate')?.addEventListener('click', async () => {
      if (!currentTournamentId) return;

      const statusEl = this.demoContainer?.querySelector('#demo-status');
      const simulateBtn = this.demoContainer?.querySelector('#demo-simulate') as HTMLButtonElement;

      try {
        if (statusEl) statusEl.textContent = 'Simulating first round matches...';
        simulateBtn.disabled = true;

        await this.simulateMatchResults(currentTournamentId);
        
        if (statusEl) statusEl.textContent = 'First round completed! Check tournament hub for results.';
      } catch (error) {
        if (statusEl) statusEl.textContent = 'Failed to simulate matches';
        simulateBtn.disabled = false;
        console.error(error);
      }
    });

    // Open tournament hub
    this.demoContainer.querySelector('#demo-open-hub')?.addEventListener('click', async () => {
      try {
        // Dynamic import to avoid circular dependencies
        const { openTournamentHub } = await import('../menu/MenuActions');
        await openTournamentHub();
      } catch (error) {
        console.error('Failed to open tournament hub:', error);
      }
    });

    // Close demo
    this.demoContainer.querySelector('#demo-close')?.addEventListener('click', () => {
      this.hideDemoUI();
    });
  }

  public hideDemoUI(): void {
    if (this.demoContainer && document.body.contains(this.demoContainer)) {
      document.body.removeChild(this.demoContainer);
    }
    this.demoContainer = null;
  }

  public async createQuickBracketDemo(): Promise<void> {
    const demoPlayers = [
      { id: 'p1', name: 'Alice', isOnline: true },
      { id: 'p2', name: 'Bob', isOnline: true },
      { id: 'p3', name: 'Charlie', isOnline: true },
      { id: 'p4', name: 'Diana', isOnline: true },
    ];

    const bracketData = TournamentBracket.generateInitialBracket(
      'DEMO123',
      4,
      demoPlayers,
      'Demo Creator'
    );

    // Create a demo container
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80vw;
      height: 60vh;
      background: #0f172a;
      border-radius: 16px;
      padding: 24px;
      z-index: 10000;
      overflow: auto;
    `;

    document.body.appendChild(container);

    // Create bracket component
    const bracket = new TournamentBracket(container, bracketData);

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '× Close Demo';
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      background: #ef4444;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => document.body.removeChild(container);
    container.appendChild(closeBtn);
  }
}

// Global demo instance
export const tournamentDemo = new TournamentDemo();

// Quick access functions for console testing
(window as any).tournamentDemo = {
  createDemo: () => tournamentDemo.createDemoTournament(),
  showUI: () => tournamentDemo.showDemoUI(),
  showBracket: () => tournamentDemo.createQuickBracketDemo(),
  hideUI: () => tournamentDemo.hideDemoUI(),
};

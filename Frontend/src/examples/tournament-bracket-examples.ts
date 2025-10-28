/**
 * Tournament Bracket Examples & Demos
 * Shows different tournament states and layouts
 */

import { TournamentBracket } from '../tournament/TournamentBracket';
import { createMockTournament, updateMatchWinner } from '../utils/tournament-bracket-utils';
import '../styles/tournament-bracket.css';

/**
 * Example 1: Basic 8-player tournament
 */
export function initializeBasicTournament(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) {

    return;
  }

  // Create mock tournament data
  const tournament = createMockTournament(8, '1'); // '1' = Alice Thunder (current user)

  // Initialize bracket
  const bracket = new TournamentBracket({
    tournament,
    config: {
      enableKeyboardNav: true,
      enableAnimations: true,
      enableConnectors: true,
      autoScroll: true,
      theme: {
        mode: 'dark',
        colors: {
          background: '#0b1220',
          surface: 'rgba(30, 41, 59, 0.88)',
          border: 'rgba(148, 163, 184, 0.2)',
          textPrimary: '#e5e7eb',
          textSecondary: '#94a3b8',
          lime: '#84cc16',
          sky: '#38bdf8',
          orange: '#f97316',
          green: '#22c55e',
          red: '#ef4444'
        }
      }
    },
    onStartMatch: (matchId) => {

      // Navigate to game screen or trigger match start
      // Example: window.location.href = `/game/${matchId}`;
    },
    onViewMatch: (matchId) => {

      // Navigate to spectate match
      // Example: window.location.href = `/spectate/${matchId}`;
    },
    onRefresh: () => {

      // Fetch latest tournament data from API
    }
  });

  // Mount to DOM
  container.appendChild(bracket.getElement());

  return bracket;
}

/**
 * Example 2: 4-player tournament with light theme
 */
export function initializeLightThemeTournament(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const tournament = createMockTournament(4, '2'); // 4-player tournament

  const bracket = new TournamentBracket({
    tournament,
    config: {
      theme: {
        mode: 'light',
        colors: {
          background: '#f8fafc',
          surface: 'rgba(255, 255, 255, 0.9)',
          border: 'rgba(148, 163, 184, 0.25)',
          textPrimary: '#0f172a',
          textSecondary: '#475569',
          lime: '#84cc16',
          sky: '#38bdf8',
          orange: '#f97316',
          green: '#22c55e',
          red: '#ef4444'
        }
      }
    }
  });

  container.appendChild(bracket.getElement());
  return bracket;
}

/**
 * Example 3: Updating tournament state (e.g., after match completion)
 */
export function updateTournamentExample() {
  const tournament = createMockTournament(8, '1');
  
  // Simulate completing the first match (Alice Thunder vs Bob Lightning)
  const firstMatch = tournament.rounds[0].matches[0];
  
  // Alice wins 5-3
  const updatedTournament = updateMatchWinner(
    tournament,
    firstMatch.id,
    '1', // Alice's ID
    5,   // Alice's score
    3    // Bob's score
  );

  return updatedTournament;
}

/**
 * Example 4: Responding to real-time updates (WebSocket simulation)
 */
export function setupRealtimeUpdates(bracket: TournamentBracket) {
  // Simulate WebSocket connection
  // In real implementation, this would be your WebSocket handler
  
  const simulateMatchUpdate = () => {
    // Fetch updated tournament data
    // const updatedData = await fetchTournamentData();
    
    // Update the bracket
    // bracket.update(updatedData);

  };

  // Example: update every 5 seconds
  const interval = setInterval(simulateMatchUpdate, 5000);

  // Cleanup
  return () => {
    clearInterval(interval);
    bracket.destroy();
  };
}

/**
 * Example 5: Spectator mode
 */
export function initializeSpectatorView(containerId: string, tournamentId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const tournament = createMockTournament(8);
  tournament.isSpectator = true;
  tournament.spectatorCount = 42;

  const bracket = new TournamentBracket({
    tournament,
    onViewMatch: (matchId) => {

      // Join spectator room for this match
    }
  });

  container.appendChild(bracket.getElement());
  return bracket;
}

/**
 * Example 6: Integration with API
 */
export class TournamentBracketManager {
  private bracket?: TournamentBracket;
  private container: HTMLElement;
  private tournamentId: string;

  constructor(containerId: string, tournamentId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = container;
    this.tournamentId = tournamentId;
  }

  async initialize() {
    try {
      // Fetch tournament data from API
      const tournamentData = await this.fetchTournamentData();
      
      this.bracket = new TournamentBracket({
        tournament: tournamentData,
        onStartMatch: (matchId) => this.handleStartMatch(matchId),
        onViewMatch: (matchId) => this.handleViewMatch(matchId),
        onRefresh: () => this.refresh()
      });

      this.container.appendChild(this.bracket.getElement());
    } catch (error) {

      this.showError('Failed to load tournament');
    }
  }

  async fetchTournamentData() {
    // Replace with actual API call
    // const response = await fetch(`/api/tournaments/${this.tournamentId}`);
    // return response.json();
    
    // For demo, return mock data
    return createMockTournament(8, '1');
  }

  async handleStartMatch(matchId: string) {
    try {
      // Start match via API
      // await fetch(`/api/matches/${matchId}/start`, { method: 'POST' });

      // Navigate to game
      // window.location.href = `/game/${matchId}`;
    } catch (error) {

    }
  }

  async handleViewMatch(matchId: string) {
    // Navigate to spectate/view

  }

  async refresh() {
    try {
      const updatedData = await this.fetchTournamentData();
      this.bracket?.update(updatedData);
    } catch (error) {

    }
  }

  showError(message: string) {
    this.container.innerHTML = `
      <div class="bracket-error">
        <h3>Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  destroy() {
    this.bracket?.destroy();
  }
}

/**
 * Example 7: Complete usage in your app
 */
export function exampleAppIntegration() {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    // Get tournament ID from URL or data attribute
    const tournamentId = document.body.dataset.tournamentId || 'demo';
    
    // Initialize bracket manager
    const manager = new TournamentBracketManager('bracket-container', tournamentId);
    manager.initialize();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      manager.destroy();
    });
  });
}

// Export for use in other modules
export { TournamentBracket } from '../tournament/TournamentBracket';
export { createMockTournament, updateMatchWinner } from '../utils/tournament-bracket-utils';
export type { Tournament, Match, MatchPlayer } from '../types/tournament-bracket';

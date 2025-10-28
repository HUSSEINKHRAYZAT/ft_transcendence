/**
 * Tournament Bracket System - Main Export File
 * Premium Esports Dashboard - Glass + Neon Aesthetic
 */

// Main Components
export { TournamentBracket } from './tournament/TournamentBracket';

// Sub-components (if needed separately)
export { MatchCard } from './tournament/MatchCard';
export { PlayerRow } from './tournament/PlayerRow';
export { BracketConnectors } from './tournament/BracketConnectors';

// Utilities
export {
  generateBracketStructure,
  updateMatchWinner,
  getRoundInfo,
  getTotalRounds,
  getMatchesInRound,
  getPlayerSubstatus,
  createMockTournament
} from './utils/tournament-bracket-utils';

// Examples & Manager
export {
  TournamentBracketManager,
  initializeBasicTournament,
  initializeLightThemeTournament,
  updateTournamentExample,
  setupRealtimeUpdates,
  initializeSpectatorView
} from './examples/tournament-bracket-examples';

// Types
export type {
  Tournament,
  Round,
  Match,
  MatchPlayer,
  Player,
  TournamentStatus,
  MatchStatus,
  TournamentSize,
  BracketConnection,
  BracketTheme,
  BracketConfig
} from './types/tournament-bracket';

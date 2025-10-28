/**
 * Tournament Bracket Types
 * Premium Esports Dashboard - Glass + Neon Aesthetic
 */

export type TournamentStatus = 'waiting' | 'active' | 'completed';
export type MatchStatus = 'pending' | 'ready' | 'active' | 'completed';
export type TournamentSize = 4;

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isAI: boolean;
  isYou?: boolean;
  isOnline: boolean;
  substatus?: string; // e.g., "Medium bot", "Offline"
}

export interface MatchPlayer extends Player {
  score?: number;
  isWinner?: boolean;
}

export interface Match {
  id: string;
  matchNumber: number;
  round: number;
  roundName: string; // "Quarterfinals", "Semifinals", "Final"
  status: MatchStatus;
  player1?: MatchPlayer;
  player2?: MatchPlayer;
  winnerId?: string;
  gameId?: string;
  isUserMatch?: boolean; // Is the current user participating?
  isYourTurn?: boolean; // Is it your turn to start?
  startedAt?: string;
  completedAt?: string;
}

export interface Round {
  round: number;
  name: string;
  emoji: string;
  matches: Match[];
}

export interface Tournament {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  size: TournamentSize;
  status: TournamentStatus;
  currentRound: number;
  totalRounds: number;
  playerCount: number;
  maxPlayers: number;
  spectatorCount?: number;
  winnerId?: string;
  winnerName?: string;
  createdBy: string;
  createdAt: string;
  rounds: Round[];
  isSpectator?: boolean;
}

export interface BracketConnection {
  fromMatchId: string;
  toMatchId: string;
  fromPosition: 'top' | 'bottom';
  color: string;
}

export interface BracketTheme {
  mode: 'dark' | 'light';
  colors: {
    background: string;
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    lime: string;
    sky: string;
    orange: string;
    green: string;
    red: string;
  };
}

export interface BracketConfig {
  enableKeyboardNav: boolean;
  enableAnimations: boolean;
  enableConnectors: boolean;
  autoScroll: boolean;
  theme: BracketTheme;
}

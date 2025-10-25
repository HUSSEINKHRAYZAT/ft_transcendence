/**
 * Tournament Bracket Adapter
 * Converts between old TournamentBracketData format and new Tournament format
 * Maintains backward compatibility while using the new premium components
 */

import type { Tournament, Round, Match, MatchPlayer } from '../types/tournament-bracket';

// Old format types (for backward compatibility)
export interface TournamentPlayer {
  id: string;
  name: string;
  isOnline: boolean;
  isAI?: boolean;
  externalId?: string;
  avatar?: string;
  aiLevel?: 'easy' | 'medium' | 'hard';
  aiType?: 'tournament' | 'practice';
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchIndex: number;
  player1?: TournamentPlayer;
  player2?: TournamentPlayer;
  winner?: TournamentPlayer;
  score1?: number;
  score2?: number;
  isComplete: boolean;
  isActive: boolean;
  nextMatchId?: string;
  scheduledTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
  waitingForOpponent?: boolean;
}

export interface TournamentBracketData {
  tournamentId: string;
  name: string;
  size: 4 | 8;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  isComplete: boolean;
  winner?: TournamentPlayer;
  createdAt: Date;
  status: 'waiting' | 'active' | 'completed';
  createdBy: string;
  isPublic: boolean;
  allowSpectators: boolean;
}

/**
 * Convert old TournamentPlayer to new MatchPlayer
 */
function convertPlayer(
  oldPlayer: TournamentPlayer | undefined,
  currentUserId?: string
): MatchPlayer | undefined {
  if (!oldPlayer) return undefined;

  const isYou = currentUserId && (
    oldPlayer.id === currentUserId || 
    oldPlayer.externalId === currentUserId
  );

  return {
    id: oldPlayer.id,
    name: oldPlayer.name,
    avatar: oldPlayer.avatar,
    isAI: oldPlayer.isAI || false,
    isYou: isYou || false,
    isOnline: oldPlayer.isOnline,
    substatus: oldPlayer.isAI 
      ? `${oldPlayer.aiLevel || 'Medium'} bot`
      : !oldPlayer.isOnline 
        ? 'Offline' 
        : undefined
  };
}

/**
 * Get round name and emoji based on size and round number
 */
function getRoundInfo(size: 4 | 8, round: number): { name: string; emoji: string } {
  if (size === 4) {
    return round === 1 
      ? { name: 'Semifinals', emoji: '⚔️' }
      : { name: 'Final', emoji: '🏆' };
  } else {
    // size === 8
    const rounds = [
      { name: 'Quarterfinals', emoji: '🎮' },
      { name: 'Semifinals', emoji: '⚔️' },
      { name: 'Final', emoji: '🏆' }
    ];
    return rounds[round - 1] || { name: 'Round ' + round, emoji: '❓' };
  }
}

/**
 * Determine match status based on old match data
 */
function getMatchStatus(oldMatch: TournamentMatch): Match['status'] {
  if (oldMatch.isComplete) return 'completed';
  if (oldMatch.isActive) return 'active';
  if (oldMatch.player1 && oldMatch.player2) return 'ready';
  return 'pending';
}

/**
 * Convert old TournamentBracketData to new Tournament format
 */
export function convertToNewFormat(
  oldData: TournamentBracketData,
  currentUserId?: string
): Tournament {
  // Group matches by round
  const matchesByRound = new Map<number, TournamentMatch[]>();
  let maxRound = 0;

  oldData.matches.forEach(match => {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round)!.push(match);
    maxRound = Math.max(maxRound, match.round);
  });

  // Convert rounds
  const rounds: Round[] = [];
  for (let roundNum = 1; roundNum <= maxRound; roundNum++) {
    const roundMatches = matchesByRound.get(roundNum) || [];
    const roundInfo = getRoundInfo(oldData.size, roundNum);

    const matches: Match[] = roundMatches.map(oldMatch => {
      const player1 = convertPlayer(oldMatch.player1, currentUserId);
      const player2 = convertPlayer(oldMatch.player2, currentUserId);
      const status = getMatchStatus(oldMatch);

      // Add scores if match is complete
      if (oldMatch.isComplete && oldMatch.score1 !== undefined && oldMatch.score2 !== undefined) {
        if (player1 && oldMatch.player1) {
          player1.score = oldMatch.score1;
          player1.isWinner = oldMatch.winner?.id === oldMatch.player1.id;
        }
        if (player2 && oldMatch.player2) {
          player2.score = oldMatch.score2;
          player2.isWinner = oldMatch.winner?.id === oldMatch.player2.id;
        }
      }

      const isUserMatch = !!(currentUserId && (
        player1?.isYou || player2?.isYou
      ));

      // Determine if it's user's turn (for active/ready matches)
      const isYourTurn = isUserMatch && (status === 'ready' || status === 'active');

      return {
        id: oldMatch.id,
        matchNumber: oldMatch.matchIndex + 1, // Convert 0-indexed to 1-indexed
        round: oldMatch.round,
        roundName: roundInfo.name,
        status,
        player1,
        player2,
        winnerId: oldMatch.winner?.id,
        isUserMatch,
        isYourTurn,
        startedAt: oldMatch.startedAt?.toISOString(),
        completedAt: oldMatch.completedAt?.toISOString()
      };
    });

    // Sort matches by matchIndex
    matches.sort((a, b) => a.matchNumber - b.matchNumber);

    rounds.push({
      round: roundNum,
      name: roundInfo.name,
      emoji: roundInfo.emoji,
      matches
    });
  }

  // Calculate total rounds
  const totalRounds = Math.log2(oldData.size);

  // Build subtitle
  const subtitle = `${oldData.size}-player elimination • Round ${oldData.currentRound} of ${totalRounds}`;

  return {
    id: oldData.tournamentId,
    code: oldData.tournamentId.slice(0, 6).toUpperCase(),
    name: oldData.name,
    subtitle,
    size: oldData.size,
    status: oldData.status,
    currentRound: oldData.currentRound,
    totalRounds,
    playerCount: oldData.players.length,
    maxPlayers: oldData.size,
    spectatorCount: undefined, // Not available in old format
    winnerId: oldData.winner?.id,
    winnerName: oldData.winner?.name,
    createdBy: oldData.createdBy,
    createdAt: oldData.createdAt.toISOString(),
    rounds,
    isSpectator: false // Can be determined from currentUserId if needed
  };
}

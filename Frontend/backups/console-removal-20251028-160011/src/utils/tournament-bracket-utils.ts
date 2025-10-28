/**
 * Tournament Bracket Utilities
 * Helper functions for bracket generation and management
 */

import { Tournament, Round, Match, TournamentSize, MatchPlayer } from '../types/tournament-bracket';

/**
 * Generate round names and emojis based on tournament size
 */
export function getRoundInfo(size: TournamentSize, roundNumber: number): { name: string; emoji: string } {
  if (size === 4) {
    // 4-player: 2 rounds (Semifinals → Final)
    const rounds = [
      { name: 'Semifinals', emoji: '⚔️' },
      { name: 'Final', emoji: '🏆' }
    ];
    return rounds[roundNumber - 1] || { name: 'Unknown', emoji: '❓' };
  } else if (size === 8) {
    // 8-player: 3 rounds (Quarterfinals → Semifinals → Final)
    const rounds = [
      { name: 'Quarterfinals', emoji: '🎮' },
      { name: 'Semifinals', emoji: '⚔️' },
      { name: 'Final', emoji: '🏆' }
    ];
    return rounds[roundNumber - 1] || { name: 'Unknown', emoji: '❓' };
  }
  
  return { name: 'Unknown', emoji: '❓' };
}

/**
 * Calculate total number of rounds for a tournament size
 */
export function getTotalRounds(size: TournamentSize): number {
  return Math.log2(size);
}

/**
 * Calculate number of matches in a specific round
 */
export function getMatchesInRound(size: TournamentSize, roundNumber: number): number {
  return size / Math.pow(2, roundNumber);
}

/**
 * Generate initial bracket structure from players
 */
export function generateBracketStructure(
  tournamentId: string,
  tournamentName: string,
  size: TournamentSize,
  players: MatchPlayer[],
  currentUserId?: string
): Tournament {
  const totalRounds = getTotalRounds(size);
  const rounds: Round[] = [];

  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const roundInfo = getRoundInfo(size, roundNum);
    const matchCount = getMatchesInRound(size, roundNum);
    const matches: Match[] = [];

    for (let matchIdx = 0; matchIdx < matchCount; matchIdx++) {
      const matchNumber = matches.length + 1 + rounds.reduce((acc, r) => acc + r.matches.length, 0);
      
      // First round - assign players
      let player1: MatchPlayer | undefined;
      let player2: MatchPlayer | undefined;
      
      if (roundNum === 1) {
        const player1Idx = matchIdx * 2;
        const player2Idx = matchIdx * 2 + 1;
        
        player1 = players[player1Idx];
        player2 = players[player2Idx];
      }

      const isUserMatch = !!(currentUserId && (
        player1?.id === currentUserId || player2?.id === currentUserId
      ));

      const match: Match = {
        id: `${tournamentId}-r${roundNum}-m${matchIdx}`,
        matchNumber,
        round: roundNum,
        roundName: roundInfo.name,
        status: player1 && player2 ? 'ready' : 'pending',
        player1,
        player2,
        isUserMatch,
        isYourTurn: false
      };

      matches.push(match);
    }

    rounds.push({
      round: roundNum,
      name: roundInfo.name,
      emoji: roundInfo.emoji,
      matches
    });
  }

  const subtitle = `${size}-player elimination • Round 1 of ${totalRounds}`;

  return {
    id: tournamentId,
    code: tournamentId.slice(0, 6).toUpperCase(),
    name: tournamentName,
    subtitle,
    size,
    status: 'waiting',
    currentRound: 1,
    totalRounds,
    playerCount: players.length,
    maxPlayers: size,
    createdBy: 'Host',
    createdAt: new Date().toISOString(),
    rounds
  };
}

/**
 * Update match with winner and propagate to next round
 */
export function updateMatchWinner(
  tournament: Tournament,
  matchId: string,
  winnerId: string,
  player1Score: number,
  player2Score: number
): Tournament {
  const updatedRounds = [...tournament.rounds];
  
  let matchRound = 0;
  let matchIndex = 0;
  let updatedMatch: Match | null = null;

  // Find and update the match
  for (let roundIdx = 0; roundIdx < updatedRounds.length; roundIdx++) {
    const round = updatedRounds[roundIdx];
    const idx = round.matches.findIndex(m => m.id === matchId);
    
    if (idx !== -1) {
      matchRound = roundIdx;
      matchIndex = idx;
      
      const match = { ...round.matches[idx] };
      match.status = 'completed';
      match.winnerId = winnerId;
      match.completedAt = new Date().toISOString();
      
      if (match.player1) {
        match.player1 = { ...match.player1, score: player1Score, isWinner: match.player1.id === winnerId };
      }
      if (match.player2) {
        match.player2 = { ...match.player2, score: player2Score, isWinner: match.player2.id === winnerId };
      }
      
      updatedMatch = match;
      updatedRounds[roundIdx] = {
        ...round,
        matches: [
          ...round.matches.slice(0, idx),
          match,
          ...round.matches.slice(idx + 1)
        ]
      };
      break;
    }
  }

  if (!updatedMatch) {
    return tournament;
  }

  // Propagate winner to next round
  if (matchRound + 1 < updatedRounds.length) {
    const nextRound = updatedRounds[matchRound + 1];
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = { ...nextRound.matches[nextMatchIndex] };
    
    const winner = updatedMatch.player1?.id === winnerId ? updatedMatch.player1 : updatedMatch.player2;
    
    if (matchIndex % 2 === 0) {
      // Even match - winner goes to player1 of next match
      nextMatch.player1 = winner;
    } else {
      // Odd match - winner goes to player2 of next match
      nextMatch.player2 = winner;
    }
    
    // Update status if both players are now present
    if (nextMatch.player1 && nextMatch.player2) {
      nextMatch.status = 'ready';
    }
    
    updatedRounds[matchRound + 1] = {
      ...nextRound,
      matches: [
        ...nextRound.matches.slice(0, nextMatchIndex),
        nextMatch,
        ...nextRound.matches.slice(nextMatchIndex + 1)
      ]
    };
  }

  // Check if tournament is completed
  const lastRound = updatedRounds[updatedRounds.length - 1];
  const finalMatch = lastRound.matches[0];
  const isCompleted = finalMatch.status === 'completed';

  const winnerName = isCompleted && finalMatch.winnerId
    ? (finalMatch.player1?.id === finalMatch.winnerId ? finalMatch.player1?.name : finalMatch.player2?.name)
    : undefined;

  return {
    ...tournament,
    status: isCompleted ? 'completed' : 'active',
    winnerId: isCompleted ? finalMatch.winnerId : undefined,
    winnerName,
    rounds: updatedRounds
  };
}

/**
 * Get player's substatus text
 */
export function getPlayerSubstatus(player: MatchPlayer): string {
  if (player.isAI) {
    return 'Medium bot';
  }
  if (!player.isOnline) {
    return 'Offline';
  }
  return '';
}

/**
 * Create mock tournament data for testing
 */
export function createMockTournament(size: TournamentSize = 8, currentUserId?: string): Tournament {
  const mockPlayers: MatchPlayer[] = [
    { id: '1', name: 'Alice Thunder', isAI: false, isOnline: true, isYou: currentUserId === '1' },
    { id: '2', name: 'Bob Lightning', isAI: false, isOnline: true, isYou: currentUserId === '2' },
    { id: '3', name: 'Carol Storm', isAI: false, isOnline: true, isYou: currentUserId === '3' },
    { id: '4', name: 'Dave Cyclone', isAI: false, isOnline: false, isYou: currentUserId === '4' },
    { id: '5', name: 'Eve Hurricane', isAI: false, isOnline: true, isYou: currentUserId === '5' },
    { id: '6', name: 'Frank Tornado', isAI: true, isOnline: true, isYou: false },
    { id: '7', name: 'Grace Tsunami', isAI: false, isOnline: true, isYou: currentUserId === '7' },
    { id: '8', name: 'Henry Blizzard', isAI: true, isOnline: true, isYou: false }
  ].slice(0, size);

  // Add substatus
  mockPlayers.forEach(player => {
    if (player.isAI) {
      player.substatus = 'Medium bot';
    } else if (!player.isOnline) {
      player.substatus = 'Offline';
    }
  });

  return generateBracketStructure(
    'MOCK-' + Date.now(),
    'Epic Championship',
    size,
    mockPlayers,
    currentUserId
  );
}

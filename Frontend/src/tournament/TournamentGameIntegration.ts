import { TournamentBracketData, TournamentMatch } from './TournamentBracket';
import { tournamentService } from './TournamentService';
import type { GameConfig } from '../types';

export interface TournamentGameConfig extends GameConfig {
  tournamentId: string;
  matchId: string;
  isTournamentMatch: true;
}

export class TournamentGameIntegration {
  private static instance: TournamentGameIntegration;
  private currentTournamentMatch: { tournamentId: string; matchId: string } | null = null;

  public static getInstance(): TournamentGameIntegration {
    if (!TournamentGameIntegration.instance) {
      TournamentGameIntegration.instance = new TournamentGameIntegration();
    }
    return TournamentGameIntegration.instance;
  }

  public async startTournamentMatch(
    tournamentId: string, 
    matchId: string, 
    onGameComplete: (winnerId: string, score1: number, score2: number) => void
  ): Promise<TournamentGameConfig | null> {
    try {
      // Get tournament data
      const tournament = await tournamentService.getTournament(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Find the match
      const match = tournament.matches.find(m => m.id === matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      if (!match.player1 || !match.player2) {
        throw new Error('Match does not have both players assigned');
      }

      if (match.isComplete) {
        throw new Error('Match is already completed');
      }

      // Start the match on the server
      await tournamentService.startMatch(tournamentId, matchId);

      // Set current match
      this.currentTournamentMatch = { tournamentId, matchId };

      // Determine if any players are AI
      const hasAI = match.player1.isAI || match.player2.isAI;
      const connection = hasAI ? 'ai' : 'local';

      // Create game config for tournament match
      const gameConfig: TournamentGameConfig = {
        playerCount: 2,
        connection,
        winScore: 10,
        currentUser: null, // Will be set based on actual player
        displayNames: [match.player1.name, match.player2.name],
        tournamentId,
        matchId,
        isTournamentMatch: true,
        aiDifficulty: hasAI ? 3 : undefined, // Medium difficulty for tournament AI
      };

      // Set up game completion handler
      this.setupGameCompletionHandler(onGameComplete);

      return gameConfig;
    } catch (error) {
      console.error('Failed to start tournament match:', error);
      return null;
    }
  }

  private setupGameCompletionHandler(onGameComplete: (winnerId: string, score1: number, score2: number) => void) {
    // This would integrate with your existing game completion logic
    // For now, we'll simulate the integration point
    
    // You would add this to your game's completion callback:
    /*
    if (gameConfig.isTournamentMatch) {
      const integration = TournamentGameIntegration.getInstance();
      integration.onTournamentGameComplete(finalScore1, finalScore2, winnerId);
    }
    */
  }

  public async onTournamentGameComplete(score1: number, score2: number, winnerId: string): Promise<void> {
    if (!this.currentTournamentMatch) {
      console.warn('Game completed but no current tournament match');
      return;
    }

    try {
      const { tournamentId, matchId } = this.currentTournamentMatch;
      
      // Complete the match on the server
      await tournamentService.completeMatch(tournamentId, matchId, winnerId, score1, score2);
      
      // Clear current match
      this.currentTournamentMatch = null;
      
      console.log(`Tournament match completed: ${score1} - ${score2}, winner: ${winnerId}`);
      
      // You could emit events here for UI updates
      this.emitMatchCompleted(tournamentId, matchId, winnerId, score1, score2);
      
    } catch (error) {
      console.error('Failed to complete tournament match:', error);
    }
  }

  private emitMatchCompleted(tournamentId: string, matchId: string, winnerId: string, score1: number, score2: number) {
    // Emit custom event for tournament match completion
    const event = new CustomEvent('tournamentMatchCompleted', {
      detail: { tournamentId, matchId, winnerId, score1, score2 }
    });
    window.dispatchEvent(event);
  }

  public getCurrentTournamentMatch(): { tournamentId: string; matchId: string } | null {
    return this.currentTournamentMatch;
  }

  public async getNextMatch(tournamentId: string): Promise<TournamentMatch | null> {
    try {
      const tournament = await tournamentService.getTournament(tournamentId);
      if (!tournament) return null;

      // Find the next available match
      return tournament.matches.find(match => 
        !match.isComplete && 
        match.player1 && 
        match.player2 && 
        !match.isActive
      ) || null;
    } catch (error) {
      console.error('Failed to get next match:', error);
      return null;
    }
  }

  public async autoAdvanceTournament(tournamentId: string): Promise<void> {
    try {
      const nextMatch = await this.getNextMatch(tournamentId);
      if (nextMatch) {
        console.log(`Next match available: ${nextMatch.id}`);
        // You could automatically start the next match or notify players
        this.emitNextMatchReady(tournamentId, nextMatch.id);
      } else {
        // Check if tournament is complete
        const tournament = await tournamentService.getTournament(tournamentId);
        if (tournament?.isComplete) {
          console.log(`Tournament ${tournamentId} completed! Winner: ${tournament.winner?.name}`);
          this.emitTournamentCompleted(tournamentId, tournament.winner?.id || '');
        }
      }
    } catch (error) {
      console.error('Failed to auto-advance tournament:', error);
    }
  }

  private emitNextMatchReady(tournamentId: string, matchId: string) {
    const event = new CustomEvent('tournamentNextMatchReady', {
      detail: { tournamentId, matchId }
    });
    window.dispatchEvent(event);
  }

  private emitTournamentCompleted(tournamentId: string, winnerId: string) {
    const event = new CustomEvent('tournamentCompleted', {
      detail: { tournamentId, winnerId }
    });
    window.dispatchEvent(event);
  }
}

// Helper function to integrate with existing game system
export function createTournamentGameConfig(
  tournamentId: string,
  matchId: string,
  player1Name: string,
  player2Name: string,
  hasAI: boolean = false
): TournamentGameConfig {
  return {
    playerCount: 2,
    connection: hasAI ? 'ai' : 'local',
    winScore: 10,
    currentUser: null,
    displayNames: [player1Name, player2Name],
    tournamentId,
    matchId,
    isTournamentMatch: true,
    aiDifficulty: hasAI ? 3 : undefined,
  };
}

// Global tournament game integration instance
export const tournamentGameIntegration = TournamentGameIntegration.getInstance();

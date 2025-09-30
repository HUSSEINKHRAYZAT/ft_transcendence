// Tournament System Exports
export { TournamentBracket, TournamentBracketData, TournamentPlayer, TournamentMatch } from './TournamentBracket';
export { TournamentService, tournamentService, CreateTournamentRequest, TournamentListItem } from './TournamentService';
export { TournamentUI } from './TournamentUI';
export { 
  TournamentGameIntegration, 
  tournamentGameIntegration, 
  createTournamentGameConfig,
  TournamentGameConfig 
} from './TournamentGameIntegration';
export { TournamentDemo, tournamentDemo } from './TournamentDemo';

// Main tournament initialization function
export async function initializeTournamentSystem(): Promise<void> {
  try {
    console.log('🏆 Initializing Tournament System...');
    
    // Connect to tournament service
    await tournamentService.connect();
    
    console.log('✅ Tournament System initialized successfully');
    
    // Show demo UI in development
    if (process.env.NODE_ENV === 'development') {
      const { tournamentDemo } = await import('./TournamentDemo');
      tournamentDemo.showDemoUI();
    }
  } catch (error) {
    console.error('❌ Failed to initialize Tournament System:', error);
  }
}

// Helper function to open tournament hub
export async function openTournamentHub(): Promise<void> {
  const { openTournamentHub } = await import('../menu/MenuActions');
  return openTournamentHub();
}

// Tournament system version
export const TOURNAMENT_VERSION = '1.0.0';

console.log(`🏆 Tournament System v${TOURNAMENT_VERSION} loaded`);

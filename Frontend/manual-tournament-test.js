console.log('🏆 Starting manual tournament test...');

// Test Tournament Creation via Direct API call
async function testDirectTournamentCreation() {
  try {
    console.log('📋 Testing direct tournament creation...');
    
    // Mock user session
    window.authService = {
      getState: () => ({
        user: {
          id: 'test-user-123',
          firstName: 'TestUser',
          userName: 'TestPlayer',
          email: 'test@example.com'
        }
      })
    };
    
    // Try importing tournament service
    const { tournamentService } = await import('./src/tournament/TournamentService.js');
    console.log('✅ Tournament service imported successfully');
    
    // Test creation with different sizes
    for (const size of [4, 8, 16]) {
      console.log(`\n🎯 Testing ${size}-player tournament...`);
      
      const tournament = await tournamentService.createTournament({
        name: `Test ${size}-Player Tournament`,
        size: size,
        isPublic: true,
        allowSpectators: true
      });
      
      console.log(`✅ ${size}-player tournament created:`, {
        id: tournament.tournamentId,
        name: tournament.name,
        size: tournament.size,
        players: tournament.players.length,
        status: tournament.status
      });
      
      // Test joining
      const joinResult = await tournamentService.joinTournament({
        tournamentId: tournament.tournamentId,
        playerId: 'test-player-2',
        playerName: 'Test Player 2'
      });
      
      console.log(`✅ Player joined ${size}-player tournament, now has ${joinResult.players.length} players`);
    }
    
    console.log('\n🎉 All tournament tests passed!');
    
  } catch (error) {
    console.error('❌ Tournament test failed:', error);
  }
}

// Run the test
testDirectTournamentCreation();

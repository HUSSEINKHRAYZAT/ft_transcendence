// Tournament Test Script
// Open browser console at http://localhost:5175 and run this

console.log('🏆 Testing Tournament System...');

// Import the tournament service
import('./src/tournament/TournamentService.ts').then(({ tournamentService }) => {
  console.log('📋 Tournament service loaded:', tournamentService);
  
  // Test tournament creation
  const testTournament = async () => {
    try {
      console.log('🚀 Creating test tournament...');
      
      const tournament = await tournamentService.createTournament({
        name: 'Test Championship',
        size: 4,
        isPublic: true,
        allowSpectators: true
      });
      
      console.log('✅ Tournament created successfully:', tournament);
      console.log('📊 Tournament details:');
      console.log('  - ID:', tournament.tournamentId);
      console.log('  - Name:', tournament.name);
      console.log('  - Size:', tournament.size);
      console.log('  - Players:', tournament.players.length);
      console.log('  - Status:', tournament.status);
      
      return tournament;
    } catch (error) {
      console.error('❌ Tournament creation failed:', error);
      throw error;
    }
  };
  
  // Auto-run the test
  testTournament().then(tournament => {
    console.log('🎉 Tournament test completed successfully!');
    
    // Test joining tournament
    console.log('🔗 Testing tournament joining...');
    
    return tournamentService.joinTournament({
      tournamentId: tournament.tournamentId,
      playerId: 'test-player-2',
      playerName: 'Test Player 2'
    });
  }).then(updatedTournament => {
    console.log('✅ Player joined successfully:', updatedTournament);
    console.log('👥 Player count:', updatedTournament.players.length);
    
    // Test AI filling
    console.log('🤖 Testing AI filling...');
    return tournamentService.fillWithAI(updatedTournament.tournamentId);
  }).then(filledTournament => {
    console.log('✅ AI filled successfully:', filledTournament);
    console.log('🤖 Final player count:', filledTournament.players.length);
    console.log('📋 Players:', filledTournament.players.map(p => `${p.name} ${p.isAI ? '(AI)' : ''}`));
    
    // Test tournament start
    console.log('🏁 Testing tournament start...');
    return tournamentService.startTournament(filledTournament.tournamentId);
  }).then(startedTournament => {
    console.log('✅ Tournament started successfully:', startedTournament);
    console.log('⚡ Status:', startedTournament.status);
    console.log('🎮 Matches:', startedTournament.matches.length);
    console.log('🥇 Tournament test completed successfully!');
  }).catch(error => {
    console.error('❌ Tournament test failed:', error);
  });
}).catch(error => {
  console.error('❌ Failed to load tournament service:', error);
});

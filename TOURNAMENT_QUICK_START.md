# Clean Tournament Bracket System - Quick Start Guide

## 🚀 Quick Implementation (5 Minutes)

### Step 1: Apply Database Schema (1 min)
```bash
cd /sgoinfre/hkhrayza/ft_pongfayadb/Backend/sql-code
sqlite3 ../game-microservice/pong.db < tournament-bracket-schema.sql
```

**Expected Output:**
```
Clean Tournament Bracket Database Schema Created Successfully! ✅
```

### Step 2: Register API Routes (2 min)

Edit `/Backend/game-microservice/src/server.ts`:

```typescript
// Add import at top
import { tournamentBracketRoutes } from './routes/tournament-bracket.routes';

// Add route registration (after other routes)
await tournamentBracketRoutes(app);
```

### Step 3: Restart Backend (1 min)
```bash
cd /sgoinfre/hkhrayza/ft_pongfayadb
make backend-restart
```

### Step 4: Test API (1 min)

```bash
# Create tournament
curl -X POST http://localhost:3000/api/tournaments/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament",
    "size": 4,
    "createdBy": "test-user",
    "createdByName": "Test Player"
  }'

# Should return tournament with code like:
# { "code": "ABC123", "status": "waiting", ... }
```

## ✅ Verification Checklist

### Database Check
```bash
cd /sgoinfre/hkhrayza/ft_pongfayadb/Backend/game-microservice
sqlite3 pong.db

# Run these queries:
.tables                              # Should show: tournaments, tournament_players, tournament_matches
SELECT * FROM tournaments;           # Should show test tournament
SELECT * FROM tournament_players;    # Should show test player
SELECT * FROM tournament_matches;    # Should be empty until tournament starts
.quit
```

### API Endpoints Check
```bash
# 1. Create Tournament
curl -X POST http://localhost:3000/api/tournaments/create \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test","size":4,"createdBy":"user1","createdByName":"Alice"}'

# Save the "code" from response (e.g., "XYZ789")

# 2. Join Tournament (repeat 3 times with different users)
curl -X POST http://localhost:3000/api/tournaments/join \
  -H "Content-Type: application/json" \
  -d '{"code":"XYZ789","userId":"user2","username":"Bob"}'

curl -X POST http://localhost:3000/api/tournaments/join \
  -H "Content-Type: application/json" \
  -d '{"code":"XYZ789","userId":"user3","username":"Carol"}'

curl -X POST http://localhost:3000/api/tournaments/join \
  -H "Content-Type: application/json" \
  -d '{"code":"XYZ789","userId":"user4","username":"Dave"}'

# 3. Start Tournament (generate bracket)
curl -X POST http://localhost:3000/api/tournaments/start \
  -H "Content-Type: application/json" \
  -d '{"code":"XYZ789"}'

# Response should show:
# - status: "active"
# - matches array with 3 items (2 Round 1, 1 Round 2)
# - Round 1 matches have "status": "ready"
# - Round 2 match has "status": "pending"

# 4. Get Tournament
curl http://localhost:3000/api/tournaments/XYZ789

# Should show complete bracket structure
```

## 🎮 Frontend Integration

### Minimal Integration Example

```typescript
// In your tournament UI file
import { CleanTournamentBracket } from './tournament/CleanTournamentBracket';

// Fetch and display bracket
async function showTournament(code: string) {
  const response = await fetch(`/api/tournaments/${code}`);
  const bracket = await response.json();
  
  const container = document.getElementById('tournament-container');
  new CleanTournamentBracket(container, bracket);
}

// Complete a match
async function completeMatch(matchId: number, winnerId: string, scores: [number, number]) {
  await fetch(`/api/tournaments/match/${matchId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      winnerId,
      scorePlayer1: scores[0],
      scorePlayer2: scores[1]
    })
  });
  
  // Bracket updates automatically - fetch and re-render
  const match = await getMatch(matchId);
  const bracket = await fetch(`/api/tournaments/${match.tournament.code}`).then(r => r.json());
  new CleanTournamentBracket(container, bracket);
}
```

## 📋 Complete Test Scenario

### Test: 4-Player Tournament Flow

```bash
#!/bin/bash
# Save as test-tournament.sh

BASE_URL="http://localhost:3000/api/tournaments"

echo "🏆 Testing Clean Tournament Bracket System"
echo ""

# 1. Create Tournament
echo "1️⃣ Creating tournament..."
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Tournament","size":4,"createdBy":"alice","createdByName":"Alice"}')

CODE=$(echo $CREATE_RESPONSE | jq -r '.code')
echo "   Tournament created with code: $CODE"
echo ""

# 2. Join Players
echo "2️⃣ Adding players..."
curl -s -X POST $BASE_URL/join \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"userId\":\"bob\",\"username\":\"Bob\"}" > /dev/null
echo "   Bob joined"

curl -s -X POST $BASE_URL/join \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"userId\":\"carol\",\"username\":\"Carol\"}" > /dev/null
echo "   Carol joined"

curl -s -X POST $BASE_URL/join \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"userId\":\"dave\",\"username\":\"Dave\"}" > /dev/null
echo "   Dave joined"
echo ""

# 3. Start Tournament
echo "3️⃣ Starting tournament..."
START_RESPONSE=$(curl -s -X POST $BASE_URL/start \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\"}")

echo "   Tournament started!"
echo "   Status: $(echo $START_RESPONSE | jq -r '.status')"
echo "   Matches: $(echo $START_RESPONSE | jq -r '.matches | length')"
echo ""

# 4. Get Match IDs
MATCH_0_ID=$(echo $START_RESPONSE | jq -r '.matches[0].id')
MATCH_1_ID=$(echo $START_RESPONSE | jq -r '.matches[1].id')
MATCH_0_P1=$(echo $START_RESPONSE | jq -r '.matches[0].player1Id')
MATCH_1_P1=$(echo $START_RESPONSE | jq -r '.matches[1].player1Id')

echo "   Match 0 (ID: $MATCH_0_ID): Player 1 wins"
echo "   Match 1 (ID: $MATCH_1_ID): Player 1 wins"
echo ""

# 5. Complete Semifinals
echo "4️⃣ Completing semifinals..."
curl -s -X POST $BASE_URL/match/$MATCH_0_ID/complete \
  -H "Content-Type: application/json" \
  -d "{\"winnerId\":\"$MATCH_0_P1\",\"scorePlayer1\":5,\"scorePlayer2\":3}" > /dev/null
echo "   ✅ Match 0 completed"

curl -s -X POST $BASE_URL/match/$MATCH_1_ID/complete \
  -H "Content-Type: application/json" \
  -d "{\"winnerId\":\"$MATCH_1_P1\",\"scorePlayer1\":5,\"scorePlayer2\":2}" > /dev/null
echo "   ✅ Match 1 completed"
echo ""

# 6. Check Final Match
echo "5️⃣ Checking final match..."
BRACKET=$(curl -s $BASE_URL/$CODE)
FINAL_MATCH=$(echo $BRACKET | jq '.matches[] | select(.round == 2)')
FINAL_STATUS=$(echo $FINAL_MATCH | jq -r '.status')
FINAL_P1=$(echo $FINAL_MATCH | jq -r '.player1Id')
FINAL_P2=$(echo $FINAL_MATCH | jq -r '.player2Id')
FINAL_ID=$(echo $FINAL_MATCH | jq -r '.id')

echo "   Final Match (ID: $FINAL_ID)"
echo "   Player 1: $FINAL_P1"
echo "   Player 2: $FINAL_P2"
echo "   Status: $FINAL_STATUS"
echo ""

# 7. Complete Final
echo "6️⃣ Completing final..."
curl -s -X POST $BASE_URL/match/$FINAL_ID/complete \
  -H "Content-Type: application/json" \
  -d "{\"winnerId\":\"$FINAL_P1\",\"scorePlayer1\":5,\"scorePlayer2\":4}" > /dev/null
echo "   ✅ Final completed"
echo ""

# 8. Check Tournament Status
echo "7️⃣ Final tournament status..."
FINAL_BRACKET=$(curl -s $BASE_URL/$CODE)
TOURNAMENT_STATUS=$(echo $FINAL_BRACKET | jq -r '.status')
WINNER=$(echo $FINAL_BRACKET | jq -r '.winnerId')

echo "   Tournament Status: $TOURNAMENT_STATUS"
echo "   🏆 Winner: $WINNER"
echo ""

if [ "$TOURNAMENT_STATUS" = "completed" ]; then
    echo "✅ TEST PASSED! Tournament completed successfully!"
else
    echo "❌ TEST FAILED! Tournament status should be 'completed'"
fi
```

**Run the test:**
```bash
chmod +x test-tournament.sh
./test-tournament.sh
```

**Expected Output:**
```
🏆 Testing Clean Tournament Bracket System

1️⃣ Creating tournament...
   Tournament created with code: ABC123

2️⃣ Adding players...
   Bob joined
   Carol joined
   Dave joined

3️⃣ Starting tournament...
   Tournament started!
   Status: active
   Matches: 3

   Match 0 (ID: 1): Player 1 wins
   Match 1 (ID: 2): Player 1 wins

4️⃣ Completing semifinals...
   ✅ Match 0 completed
   ✅ Match 1 completed

5️⃣ Checking final match...
   Final Match (ID: 3)
   Player 1: alice
   Player 2: carol
   Status: ready

6️⃣ Completing final...
   ✅ Final completed

7️⃣ Final tournament status...
   Tournament Status: completed
   🏆 Winner: alice

✅ TEST PASSED! Tournament completed successfully!
```

## 🐛 Troubleshooting

### Issue: "Table already exists" error
```bash
# Drop and recreate
cd /sgoinfre/hkhrayza/ft_pongfayadb/Backend/game-microservice
sqlite3 pong.db
DROP TABLE IF EXISTS tournament_matches;
DROP TABLE IF EXISTS tournament_players;
DROP TABLE IF EXISTS tournaments;
.quit

# Reapply schema
cd ../sql-code
sqlite3 ../game-microservice/pong.db < tournament-bracket-schema.sql
```

### Issue: API routes not found
**Check:**
1. Routes registered in `server.ts`
2. Backend restarted after changes
3. Correct port (3000 by default)

```bash
# Check server is running
curl http://localhost:3000/health

# Check logs
make backend-logs
```

### Issue: Bracket not updating
**Check:**
1. Match completion returns success
2. Database updated correctly
3. Frontend refetches bracket after completion

```bash
# Check database state
sqlite3 pong.db "SELECT * FROM tournament_matches WHERE tournament_id = 1;"
```

## 📊 Success Criteria

After running the test script, verify:

✅ Tournament created successfully  
✅ All 4 players joined  
✅ Tournament started (status: active)  
✅ 3 matches created (2 Round 1, 1 Round 2)  
✅ Round 1 matches have status 'ready'  
✅ Round 2 match has status 'pending'  
✅ After completing Match 0, Round 2 gets player1  
✅ After completing Match 1, Round 2 gets player2 and status → 'ready'  
✅ After completing Final, tournament status → 'completed'  
✅ Winner recorded in tournament table  
✅ Losers marked as eliminated  

## 🎉 Next Steps

Once basic testing passes:

1. **Integrate with Frontend**
   - Add tournament creation UI
   - Display bracket with `CleanTournamentBracket`
   - Connect game completion to match API

2. **Add Real-Time Updates**
   - WebSocket broadcasting on match completion
   - Auto-refresh bracket for all viewers

3. **Add Player Experience**
   - Victory/elimination screens
   - Next match notifications
   - Tournament leaderboard

4. **Test Edge Cases**
   - 8-player tournament
   - 16-player tournament
   - Simultaneous match completions
   - Player disconnections

---

**You now have a fully functional, clean tournament bracket system! 🚀**

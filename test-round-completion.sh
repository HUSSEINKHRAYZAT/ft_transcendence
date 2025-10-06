#!/bin/bash

# Tournament Round Completion Test Script
# Tests the fix: Bracket updates only after ALL matches in round complete

set -e

API_URL="http://localhost:3001/api/tournaments"
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}🧪 Tournament Round Completion Test${NC}\n"

# 1. Create tournament
echo -e "${BLUE}Step 1: Creating 4-player tournament...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/create" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alice123",
    "username": "Alice",
    "size": 4,
    "name": "Test Tournament"
  }')

TOUR_CODE=$(echo "$CREATE_RESPONSE" | jq -r '.code')
echo -e "${GREEN}✓ Tournament created: $TOUR_CODE${NC}\n"

# 2. Add players
echo -e "${BLUE}Step 2: Adding players...${NC}"
curl -s -X POST "$API_URL/join" \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$TOUR_CODE\", \"userId\": \"bob123\", \"username\": \"Bob\"}" > /dev/null

curl -s -X POST "$API_URL/join" \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$TOUR_CODE\", \"userId\": \"carol123\", \"username\": \"Carol\"}" > /dev/null

curl -s -X POST "$API_URL/join" \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$TOUR_CODE\", \"userId\": \"dave123\", \"username\": \"Dave\"}" > /dev/null

echo -e "${GREEN}✓ 4 players added${NC}\n"

# 3. Start tournament
echo -e "${BLUE}Step 3: Starting tournament...${NC}"
curl -s -X POST "$API_URL/start" \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$TOUR_CODE\", \"userId\": \"alice123\"}" > /dev/null

BRACKET=$(curl -s "$API_URL/$TOUR_CODE")
echo -e "${GREEN}✓ Tournament started${NC}\n"

# Display initial bracket
echo -e "${BOLD}Initial Bracket:${NC}"
echo "$BRACKET" | jq -r '.matches[] | "Round \(.round) Match \(.matchNumber): \(.player1Id // "⏳") vs \(.player2Id // "⏳") [\(.status)]"'
echo ""

# Get match IDs
MATCH1_ID=$(echo "$BRACKET" | jq -r '.matches[] | select(.round == 1 and .matchNumber == 0) | .id')
MATCH2_ID=$(echo "$BRACKET" | jq -r '.matches[] | select(.round == 1 and .matchNumber == 1) | .id')

# Get player IDs for matches
MATCH1_P1=$(echo "$BRACKET" | jq -r '.matches[] | select(.round == 1 and .matchNumber == 0) | .player1Id')
MATCH1_P2=$(echo "$BRACKET" | jq -r '.matches[] | select(.round == 1 and .matchNumber == 0) | .player2Id')
MATCH2_P1=$(echo "$BRACKET" | jq -r '.matches[] | select(.round == 1 and .matchNumber == 1) | .player1Id')
MATCH2_P2=$(echo "$BRACKET" | jq -r '.matches[] | select(.round == 1 and .matchNumber == 1) | .player2Id')

# 4. Complete first match
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Step 4: Completing FIRST match (Match 0)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

curl -s -X POST "$API_URL/match/$MATCH1_ID/complete" \
  -H "Content-Type: application/json" \
  -d "{
    \"winnerId\": \"$MATCH1_P1\",
    \"scorePlayer1\": 5,
    \"scorePlayer2\": 3
  }" > /dev/null

sleep 1
BRACKET_AFTER_1=$(curl -s "$API_URL/$TOUR_CODE")

echo -e "${BOLD}Bracket after first match:${NC}"
echo "$BRACKET_AFTER_1" | jq -r '.matches[] | "Round \(.round) Match \(.matchNumber): \(.player1Id // "⏳") vs \(.player2Id // "⏳") [\(.status)]"'
echo ""

# Check if Round 2 is still pending
ROUND2_STATUS=$(echo "$BRACKET_AFTER_1" | jq -r '.matches[] | select(.round == 2) | .status')
ROUND2_P1=$(echo "$BRACKET_AFTER_1" | jq -r '.matches[] | select(.round == 2) | .player1Id')
ROUND2_P2=$(echo "$BRACKET_AFTER_1" | jq -r '.matches[] | select(.round == 2) | .player2Id')

if [[ "$ROUND2_STATUS" == "pending" && "$ROUND2_P1" == "null" && "$ROUND2_P2" == "null" ]]; then
  echo -e "${GREEN}✓ CORRECT: Round 2 is still pending (⏳ vs ⏳)${NC}"
  echo -e "${GREEN}✓ Winner is waiting for round to complete${NC}\n"
else
  echo -e "${RED}✗ ERROR: Round 2 should still be pending!${NC}\n"
  exit 1
fi

# 5. Complete second match
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Step 5: Completing SECOND match (Match 1)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

curl -s -X POST "$API_URL/match/$MATCH2_ID/complete" \
  -H "Content-Type: application/json" \
  -d "{
    \"winnerId\": \"$MATCH2_P1\",
    \"scorePlayer1\": 5,
    \"scorePlayer2\": 2
  }" > /dev/null

sleep 1
BRACKET_AFTER_2=$(curl -s "$API_URL/$TOUR_CODE")

echo -e "${BOLD}Bracket after second match:${NC}"
echo "$BRACKET_AFTER_2" | jq -r '.matches[] | "Round \(.round) Match \(.matchNumber): \(.player1Id // "⏳") vs \(.player2Id // "⏳") [\(.status)]"'
echo ""

# Check if Round 2 is now ready with both players
ROUND2_STATUS_FINAL=$(echo "$BRACKET_AFTER_2" | jq -r '.matches[] | select(.round == 2) | .status')
ROUND2_P1_FINAL=$(echo "$BRACKET_AFTER_2" | jq -r '.matches[] | select(.round == 2) | .player1Id')
ROUND2_P2_FINAL=$(echo "$BRACKET_AFTER_2" | jq -r '.matches[] | select(.round == 2) | .player2Id')

if [[ "$ROUND2_STATUS_FINAL" == "ready" && "$ROUND2_P1_FINAL" != "null" && "$ROUND2_P2_FINAL" != "null" ]]; then
  echo -e "${GREEN}✓ CORRECT: Round 2 is now ready with both players!${NC}"
  echo -e "${GREEN}✓ All winners advanced simultaneously${NC}\n"
else
  echo -e "${RED}✗ ERROR: Round 2 should be ready with both players!${NC}\n"
  exit 1
fi

# 6. Summary
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📊 Test Summary${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${GREEN}✓ After Match 1 complete: Round 2 stayed pending (⏳ vs ⏳)${NC}"
echo -e "${GREEN}✓ After Match 2 complete: Round 2 updated with both winners${NC}"
echo -e "${GREEN}✓ Winners advanced simultaneously (not one-by-one)${NC}\n"

echo -e "${BOLD}🎉 TEST PASSED!${NC}"
echo -e "${GREEN}The bracket correctly waits for ALL round matches to complete${NC}"
echo -e "${GREEN}before showing next-round matchups.${NC}\n"

echo -e "${BLUE}Tournament Code: $TOUR_CODE${NC}"
echo -e "${BLUE}View bracket: curl $API_URL/$TOUR_CODE | jq${NC}\n"

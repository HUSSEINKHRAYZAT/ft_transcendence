#!/bin/bash
# Mailer HTTPS Configuration Verification Script

echo "🔍 Verifying Mailer HTTPS Configuration..."
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found${NC}"
    exit 1
fi

echo "1️⃣  Checking docker-compose.yml configuration..."

# Check user_management MAILER_URL
if grep -A 15 "user_management:" docker-compose.yml | grep -q "MAILER_URL: https://mailer:3000"; then
    echo -e "${GREEN}✅ user_management has MAILER_URL=https://mailer:3000${NC}"
else
    echo -e "${RED}❌ user_management missing MAILER_URL${NC}"
fi

# Check user_management NODE_EXTRA_CA_CERTS
if grep -A 15 "user_management:" docker-compose.yml | grep -q "NODE_EXTRA_CA_CERTS"; then
    echo -e "${GREEN}✅ user_management has NODE_EXTRA_CA_CERTS${NC}"
else
    echo -e "${RED}❌ user_management missing NODE_EXTRA_CA_CERTS${NC}"
fi

echo ""
echo "2️⃣  Checking if services are running..."

# Check if user_management is running
if docker ps | grep -q "user_management"; then
    echo -e "${GREEN}✅ user_management is running${NC}"

    # Check environment variables in running container
    echo "   Checking runtime environment..."

    MAILER_URL=$(docker exec user_management printenv MAILER_URL 2>/dev/null)
    if [ "$MAILER_URL" = "https://mailer:3000" ]; then
        echo -e "${GREEN}   ✅ MAILER_URL correctly set to: $MAILER_URL${NC}"
    else
        echo -e "${YELLOW}   ⚠️  MAILER_URL is: $MAILER_URL (restart needed?)${NC}"
    fi

    CA_CERTS=$(docker exec user_management printenv NODE_EXTRA_CA_CERTS 2>/dev/null)
    if [ -n "$CA_CERTS" ]; then
        echo -e "${GREEN}   ✅ NODE_EXTRA_CA_CERTS is set${NC}"
    else
        echo -e "${YELLOW}   ⚠️  NODE_EXTRA_CA_CERTS not set (restart needed?)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  user_management is not running${NC}"
    echo "   Run: docker-compose up -d"
fi

# Check if mailer is running
if docker ps | grep -q "mailer"; then
    echo -e "${GREEN}✅ mailer is running${NC}"
else
    echo -e "${YELLOW}⚠️  mailer is not running${NC}"
fi

echo ""
echo "3️⃣  Testing connectivity..."

if docker ps | grep -q "user_management"; then
    echo "   Testing user_management → mailer connection..."

    # Try to reach mailer from user_management
    if docker exec user_management sh -c "command -v curl > /dev/null 2>&1"; then
        RESPONSE=$(docker exec user_management curl -k -s -o /dev/null -w "%{http_code}" https://mailer:3000/health 2>/dev/null)
        if [ "$RESPONSE" = "200" ]; then
            echo -e "${GREEN}   ✅ user_management can reach mailer (HTTP $RESPONSE)${NC}"
        else
            echo -e "${RED}   ❌ Cannot reach mailer (HTTP $RESPONSE)${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  curl not available in container, skipping test${NC}"
    fi
fi

echo ""
echo "=========================================="
echo "4️⃣  Summary & Next Steps"
echo ""

if docker ps | grep -q "user_management" && docker ps | grep -q "mailer"; then
    if docker exec user_management printenv MAILER_URL 2>/dev/null | grep -q "https://mailer:3000"; then
        echo -e "${GREEN}✅ Configuration looks good!${NC}"
        echo ""
        echo "To test email sending:"
        echo "  1. Open https://localhost:5173"
        echo "  2. Register a new user"
        echo "  3. Request verification code"
        echo "  4. Watch logs: docker logs mailer -f"
    else
        echo -e "${YELLOW}⚠️  Configuration updated but services need restart${NC}"
        echo ""
        echo "Run these commands:"
        echo "  cd /sgoinfre/afayad/that/Backend"
        echo "  docker-compose down"
        echo "  docker-compose up -d"
    fi
else
    echo -e "${YELLOW}⚠️  Services are not running${NC}"
    echo ""
    echo "Start the services:"
    echo "  cd /sgoinfre/afayad/that/Backend"
    echo "  docker-compose up -d"
fi

echo ""

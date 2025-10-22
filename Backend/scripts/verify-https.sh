#!/bin/bash

set -e

echo "🔍 HTTPS Verification Script for Transcendence Microservices"
echo "============================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="${BACKEND_DIR}/certs"

SERVICES=(
  "user_management:3001"
  "game_microservice:3004"
  "session_microservice:3003"
  "mailer:3002"
  "google_oauth2:3006"
  "socket_microservice:3005"
  "realtime_microservice:3020"
  "api_gateway:8080"
)

echo "📋 Step 1: Checking Certificates"
echo "---------------------------------"

if [ ! -f "${CERTS_DIR}/ca/ca.crt" ]; then
  echo "❌ CA certificate not found!"
  echo "   Run: cd Backend/certs && ./generate-certs.sh"
  exit 1
fi

echo "✅ CA certificate found"

MISSING_CERTS=0
for SERVICE in "${SERVICES[@]}"; do
  SERVICE_NAME=$(echo "$SERVICE" | cut -d: -f1)
  CERT_DIR="${CERTS_DIR}/services/${SERVICE_NAME}"
  
  if [ ! -f "${CERT_DIR}/server.crt" ] || [ ! -f "${CERT_DIR}/server.key" ]; then
    echo "❌ Certificates missing for ${SERVICE_NAME}"
    MISSING_CERTS=$((MISSING_CERTS + 1))
  else
    echo "✅ Certificates found for ${SERVICE_NAME}"
  fi
done

if [ $MISSING_CERTS -gt 0 ]; then
  echo ""
  echo "❌ ${MISSING_CERTS} service(s) missing certificates"
  echo "   Run: cd Backend/certs && ./generate-certs.sh"
  exit 1
fi

echo ""
echo "📋 Step 2: Checking Docker Containers"
echo "--------------------------------------"

cd "${BACKEND_DIR}"

RUNNING_CONTAINERS=$(docker compose ps --services --filter "status=running" 2>/dev/null | wc -l)

if [ "$RUNNING_CONTAINERS" -eq 0 ]; then
  echo "❌ No containers running!"
  echo "   Run: cd Backend && docker compose up -d"
  exit 1
fi

echo "✅ ${RUNNING_CONTAINERS} container(s) running"

echo ""
echo "📋 Step 3: Testing HTTPS Endpoints"
echo "-----------------------------------"

PASSED=0
FAILED=0

for SERVICE in "${SERVICES[@]}"; do
  SERVICE_NAME=$(echo "$SERVICE" | cut -d: -f1)
  PORT=$(echo "$SERVICE" | cut -d: -f2)
  
  echo -n "Testing ${SERVICE_NAME} (port ${PORT})... "
  
  if curl -s --cacert "${CERTS_DIR}/ca/ca.crt" \
       --connect-timeout 5 \
       --max-time 10 \
       "https://localhost:${PORT}/health" > /dev/null 2>&1; then
    echo "✅ PASSED"
    PASSED=$((PASSED + 1))
  else
    echo "❌ FAILED"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "📋 Step 4: Checking Service Logs"
echo "---------------------------------"

echo "Checking for HTTPS initialization messages..."
echo ""

for SERVICE in "${SERVICES[@]}"; do
  SERVICE_NAME=$(echo "$SERVICE" | cut -d: -f1)
  
  HTTPS_LOG=$(docker compose logs "$SERVICE_NAME" 2>/dev/null | grep -i "HTTPS" | tail -1)
  
  if [ -n "$HTTPS_LOG" ]; then
    echo "✅ ${SERVICE_NAME}: ${HTTPS_LOG}"
  else
    echo "⚠️  ${SERVICE_NAME}: No HTTPS log found (may be using HTTP)"
  fi
done

echo ""
echo "📊 Summary"
echo "=========="
echo "Services tested:  $((PASSED + FAILED))"
echo "✅ Passed:         ${PASSED}"
echo "❌ Failed:         ${FAILED}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All services are running with HTTPS!"
  exit 0
else
  echo "⚠️  Some services failed. Check logs:"
  echo "   docker compose logs"
  exit 1
fi


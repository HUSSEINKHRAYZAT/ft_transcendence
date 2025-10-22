#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CA_DIR="${SCRIPT_DIR}/ca"
SERVICES_DIR="${SCRIPT_DIR}/services"

DAYS_CERT=365

SERVICES=(
  "api-gateway"
  "user-management"
  "game-microservice"
  "session-microservice"
  "mailer-microservice"
  "google-oauth2"
  "socket-microservice"
  "realtime-microservice"
  "frontend"
)

echo "🔄 Renewing Service Certificates"
echo "================================"

if [ ! -f "${CA_DIR}/ca.key" ] || [ ! -f "${CA_DIR}/ca.crt" ]; then
  echo "❌ Error: CA certificate not found!"
  echo "   Run './generate-certs.sh' first to create the CA."
  exit 1
fi

echo "📋 Checking certificate expiration dates..."
echo ""

RENEWED=0
SKIPPED=0

for SERVICE in "${SERVICES[@]}"; do
  SERVICE_DIR="${SERVICES_DIR}/${SERVICE}"
  CERT_FILE="${SERVICE_DIR}/server.crt"
  
  if [ ! -f "${CERT_FILE}" ]; then
    echo "⚠️  Certificate not found for ${SERVICE}, skipping..."
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  EXPIRY_DATE=$(openssl x509 -enddate -noout -in "${CERT_FILE}" | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "${EXPIRY_DATE}" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  
  if [ ${DAYS_LEFT} -gt 30 ]; then
    echo "✅ ${SERVICE}: ${DAYS_LEFT} days remaining, skipping renewal"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  echo "🔄 ${SERVICE}: ${DAYS_LEFT} days remaining, renewing..."
  
  CONTAINER_NAME=$(echo "$SERVICE" | sed 's/-microservice//' | sed 's/-/_/g')
  
  cat > "${SERVICE_DIR}/cert.conf" <<EOF
[ req ]
default_bits       = 2048
distinguished_name = req_distinguished_name
req_extensions     = v3_req
prompt             = no

[ req_distinguished_name ]
C  = LB
ST = Beirut
L  = Beirut
O  = 42 Beirut
OU = Transcendence Microservices
CN = ${SERVICE}

[ v3_req ]
keyUsage               = keyEncipherment, dataEncipherment
extendedKeyUsage       = serverAuth, clientAuth
subjectAltName         = @alt_names

[ alt_names ]
DNS.1 = ${SERVICE}
DNS.2 = ${CONTAINER_NAME}
DNS.3 = localhost
DNS.4 = 127.0.0.1
IP.1  = 127.0.0.1
EOF

  mv "${SERVICE_DIR}/server.key" "${SERVICE_DIR}/server.key.old"
  mv "${SERVICE_DIR}/server.crt" "${SERVICE_DIR}/server.crt.old"
  
  openssl genrsa -out "${SERVICE_DIR}/server.key" 2048
  
  openssl req -new \
    -key "${SERVICE_DIR}/server.key" \
    -out "${SERVICE_DIR}/server.csr" \
    -config "${SERVICE_DIR}/cert.conf"
  
  openssl x509 -req \
    -in "${SERVICE_DIR}/server.csr" \
    -CA "${CA_DIR}/ca.crt" \
    -CAkey "${CA_DIR}/ca.key" \
    -CAcreateserial \
    -out "${SERVICE_DIR}/server.crt" \
    -days ${DAYS_CERT} \
    -extensions v3_req \
    -extfile "${SERVICE_DIR}/cert.conf"
  
  chmod 600 "${SERVICE_DIR}/server.key"
  chmod 644 "${SERVICE_DIR}/server.crt"
  
  rm "${SERVICE_DIR}/server.csr"
  rm "${SERVICE_DIR}/server.key.old"
  rm "${SERVICE_DIR}/server.crt.old"
  
  echo "   ✅ Certificate renewed for ${SERVICE}"
  RENEWED=$((RENEWED + 1))
done

echo ""
echo "🎉 Certificate Renewal Complete!"
echo "================================"
echo "   Renewed: ${RENEWED}"
echo "   Skipped: ${SKIPPED}"
echo ""
echo "⚠️  Remember to restart services to use new certificates:"
echo "   cd Backend && docker compose restart"
echo ""


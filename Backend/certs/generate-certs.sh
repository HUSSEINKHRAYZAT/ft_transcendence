#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CA_DIR="${SCRIPT_DIR}/ca"
SERVICES_DIR="${SCRIPT_DIR}/services"

DAYS_CA=3650  # 10 years for CA
DAYS_CERT=365 # 1 year for service certificates

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

echo "🔐 Starting Certificate Generation for Transcendence Microservices"
echo "=================================================================="

mkdir -p "${CA_DIR}"
mkdir -p "${SERVICES_DIR}"

if [ -f "${CA_DIR}/ca.key" ]; then
  echo "⚠️  CA certificate already exists. Skipping CA generation."
  echo "   Delete ${CA_DIR}/ca.key to regenerate the CA."
else
  echo ""
  echo "📜 Step 1: Creating Certificate Authority (CA)"
  echo "----------------------------------------------"
  
  cat > "${CA_DIR}/ca.conf" <<EOF
[ req ]
default_bits       = 4096
distinguished_name = req_distinguished_name
x509_extensions    = v3_ca
prompt             = no

[ req_distinguished_name ]
C  = LB
ST = Beirut
L  = Beirut
O  = 42 Beirut
OU = Transcendence Project
CN = Transcendence Internal CA

[ v3_ca ]
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints       = critical, CA:true
keyUsage               = critical, digitalSignature, cRLSign, keyCertSign
EOF

  openssl req -x509 -new -nodes \
    -newkey rsa:4096 \
    -keyout "${CA_DIR}/ca.key" \
    -out "${CA_DIR}/ca.crt" \
    -days ${DAYS_CA} \
    -config "${CA_DIR}/ca.conf"
  
  chmod 600 "${CA_DIR}/ca.key"
  chmod 644 "${CA_DIR}/ca.crt"
  
  echo "✅ CA Certificate created successfully!"
  echo "   CA Key:  ${CA_DIR}/ca.key"
  echo "   CA Cert: ${CA_DIR}/ca.crt"
fi

echo ""
echo "🔑 Step 2: Generating Service Certificates"
echo "-------------------------------------------"

for SERVICE in "${SERVICES[@]}"; do
  SERVICE_DIR="${SERVICES_DIR}/${SERVICE}"
  mkdir -p "${SERVICE_DIR}"
  
  echo ""
  echo "📝 Generating certificate for: ${SERVICE}"
  
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
basicConstraints       = CA:FALSE
keyUsage               = critical, digitalSignature, keyEncipherment
extendedKeyUsage       = critical, serverAuth, clientAuth
subjectAltName         = @alt_names

[ alt_names ]
DNS.1 = ${SERVICE}
DNS.2 = ${CONTAINER_NAME}
DNS.3 = localhost
DNS.4 = 127.0.0.1
IP.1  = 127.0.0.1
EOF

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
  
  echo "   ✅ Certificate created for ${SERVICE}"
  echo "      Key:  ${SERVICE_DIR}/server.key"
  echo "      Cert: ${SERVICE_DIR}/server.crt"
done

echo ""
echo "🎉 Certificate Generation Complete!"
echo "==================================="
echo ""
echo "📊 Summary:"
echo "   CA Certificate:  ${CA_DIR}/ca.crt"
echo "   Services:        ${#SERVICES[@]}"
echo ""
echo "🔍 Verify certificates:"
echo "   openssl x509 -in ${CA_DIR}/ca.crt -text -noout"
echo "   openssl x509 -in ${SERVICES_DIR}/api-gateway/server.crt -text -noout"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Keep ${CA_DIR}/ca.key secure and private!"
echo "   - Service certificates expire in ${DAYS_CERT} days"
echo "   - Run './renew-certs.sh' to renew certificates before expiry"
echo ""


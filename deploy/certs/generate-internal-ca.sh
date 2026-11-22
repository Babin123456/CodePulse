#!/usr/bin/env bash
set -euo pipefail

# generate-internal-ca.sh
# Generates self-signed internal Root CA and microservice mutual TLS (mTLS) certificates

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "${DIR}"

echo "Generating internal root CA key and certificate..."
openssl req -x509 -newkey rsa:4096 -days 365 -nodes \
  -keyout "${DIR}/ca-key.pem" \
  -out "${DIR}/ca-cert.pem" \
  -subj "/C=US/ST=Security/L=Cloud/O=CodePulse/OU=Mesh/CN=codepulse-internal-ca"

echo "Generating backend server certificate request..."
openssl req -newkey rsa:2048 -nodes \
  -keyout "${DIR}/server-key.pem" \
  -out "${DIR}/server-req.pem" \
  -subj "/C=US/ST=Security/L=Cloud/O=CodePulse/OU=Backend/CN=api.codepulse.internal"

echo "Signing server certificate with internal CA..."
openssl x509 -req -in "${DIR}/server-req.pem" -days 365 \
  -CA "${DIR}/ca-cert.pem" -CAkey "${DIR}/ca-key.pem" -CAcreateserial \
  -out "${DIR}/server-cert.pem"

echo "Generating runner microservice client certificate..."
openssl req -newkey rsa:2048 -nodes \
  -keyout "${DIR}/runner-client-key.pem" \
  -out "${DIR}/runner-client-req.pem" \
  -subj "/C=US/ST=Security/L=Cloud/O=CodePulse/OU=Runners/CN=runner-worker-1.codepulse.internal"

echo "Signing runner client certificate with internal CA..."
openssl x509 -req -in "${DIR}/runner-client-req.pem" -days 365 \
  -CA "${DIR}/ca-cert.pem" -CAkey "${DIR}/ca-key.pem" -CAcreateserial \
  -out "${DIR}/runner-client-cert.pem"

echo "Mutual TLS internal CA & certificate generation complete!"

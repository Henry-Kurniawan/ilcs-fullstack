#!/usr/bin/env bash
# Membuat sertifikat self-signed untuk uji stack produksi lokal.
# Sertifikat produksi (Let's Encrypt atau dari CA) diletakkan di files yang
# sama: certs/fullchain.pem dan certs/privkey.pem.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="${CERT_DIR:-$ROOT/certs}"
CERT_HOST="${CERT_HOST:-localhost}"
CERT_DAYS="${CERT_DAYS:-365}"
FULLCHAIN="$CERT_DIR/fullchain.pem"
PRIVKEY="$CERT_DIR/privkey.pem"

if [[ -s "$FULLCHAIN" && -s "$PRIVKEY" ]]; then
  echo "Sertifikat sudah ada di $CERT_DIR (tidak ditimpa)."
  exit 0
fi

command -v openssl >/dev/null 2>&1 || {
  echo "GAGAL: openssl tidak ditemukan. Pasang openssl untuk membuat sertifikat self-signed." >&2
  exit 1
}

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$PRIVKEY" \
  -out "$FULLCHAIN" \
  -days "$CERT_DAYS" \
  -subj "/C=ID/O=MusicPedia Demo/CN=$CERT_HOST" \
  -addext "subjectAltName=DNS:$CERT_HOST,DNS:localhost,IP:127.0.0.1"

chmod 600 "$PRIVKEY"
echo "Sertifikat self-signed dibuat:"
echo "  $FULLCHAIN"
echo "  $PRIVKEY"
echo "Berlaku $CERT_DAYS hari untuk CN=$CERT_HOST."
echo "Jangan commit direktori certs/; sudah ada di .gitignore."

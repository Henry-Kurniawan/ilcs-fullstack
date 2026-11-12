#!/usr/bin/env bash
# Memulihkan database dan audio MusicPedia dari hasil scripts/backup.sh.
#
# Pemakaian:
#   KONFIRMASI_RESTORE=ya ./scripts/restore.sh backups/backup-20261112T021700Z
#   KONFIRMASI_RESTORE=ya ./scripts/restore.sh          # backup lokal terbaru
#
# Peringatan: restore menimpa database dan seluruh isi volume audio tujuan.
# Buat backup baru sebelum restore bila data saat ini masih dibutuhkan.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
# Pakai ${ENV_FILE-...} agar ENV_FILE= bisa menonaktifkan pembacaan file.
ENV_FILE="${ENV_FILE-.env.production}"

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-musicpedia}"
POSTGRES_DB="${POSTGRES_DB:-musicpedia}"
DB_SERVICE="${DB_SERVICE:-db}"
BACKEND_SERVICE="${BACKEND_SERVICE:-backend}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
AUDIO_HOST_DIR="${AUDIO_HOST_DIR:-}"

log() { printf '[restore %s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; }
die() { log "GAGAL: $*"; exit 1; }

if [[ "${KONFIRMASI_RESTORE:-}" != "ya" ]]; then
  die "Restore menimpa data. Set KONFIRMASI_RESTORE=ya untuk melanjutkan."
fi

sumber="${1:-}"
if [[ -z "$sumber" ]]; then
  sumber="$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'backup-*' \
    2>/dev/null | sort | tail -n 1)"
fi
[[ -n "$sumber" && -d "$sumber" ]] || die "Direktori backup tidak ditemukan: ${sumber:-<kosong>}"
[[ -s "$sumber/database.sql" ]] || die "$sumber/database.sql tidak ada atau kosong."
[[ -s "$sumber/audio.tar.gz" ]] || die "$sumber/audio.tar.gz tidak ada atau kosong."

command -v docker >/dev/null 2>&1 || die "docker tidak ditemukan."
[[ -f "$COMPOSE_FILE" ]] || die "Compose file $COMPOSE_FILE tidak ditemukan."

compose=(docker compose -f "$COMPOSE_FILE")
if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  compose+=(--env-file "$ENV_FILE")
fi

if ! "${compose[@]}" ps --status running --services 2>/dev/null | grep -qx "$DB_SERVICE"; then
  die "Service database '$DB_SERVICE' tidak berjalan. Jalankan docker compose up -d lebih dulu."
fi

log "Sumber     : $sumber"
log "Database   : $POSTGRES_DB (user $POSTGRES_USER)"
log "Audio      : ${AUDIO_HOST_DIR:-volume Docker /data/audio}"

ada_backend=0
if "${compose[@]}" config --services 2>/dev/null | grep -qx "$BACKEND_SERVICE"; then
  ada_backend=1
fi

backend_dihentikan=0
mulai_kembali_backend() {
  if [[ "$backend_dihentikan" == "1" ]]; then
    log "Menjalankan kembali backend"
    if ! "${compose[@]}" up -d --wait "$BACKEND_SERVICE"; then
      log "Peringatan: backend gagal mencapai status sehat. Periksa docker compose logs $BACKEND_SERVICE."
    fi
    backend_dihentikan=0
  fi
}
trap mulai_kembali_backend EXIT

if [[ "$ada_backend" == "1" ]] \
  && "${compose[@]}" ps --status running --services 2>/dev/null | grep -qx "$BACKEND_SERVICE"; then
  log "Menghentikan backend agar tidak menulis saat restore"
  "${compose[@]}" stop "$BACKEND_SERVICE" >/dev/null
  backend_dihentikan=1
fi

log "Memulihkan database dengan psql"
"${compose[@]}" exec -T "$DB_SERVICE" \
  psql -v ON_ERROR_STOP=1 -1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  <"$sumber/database.sql" \
  || die "psql gagal. Database mungkin setengah pulih; periksa log lalu ulangi dari backup."

log "Memulihkan audio"
if [[ -n "$AUDIO_HOST_DIR" ]]; then
  mkdir -p "$AUDIO_HOST_DIR"
  find "$AUDIO_HOST_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  tar -C "$AUDIO_HOST_DIR" -xzf "$sumber/audio.tar.gz" \
    || die "Gagal mengekstrak audio ke $AUDIO_HOST_DIR."
else
  [[ "$ada_backend" == "1" ]] || die "Butuh service backend atau AUDIO_HOST_DIR untuk restore audio."
  "${compose[@]}" run --rm --no-deps -T --entrypoint sh "$BACKEND_SERVICE" \
    -c 'rm -rf /data/audio/* && tar -C /data/audio -xzf -' \
    <"$sumber/audio.tar.gz" \
    || die "Gagal mengekstrak audio ke volume backend."
fi

if [[ "$ada_backend" == "1" ]]; then
  mulai_kembali_backend
fi

"${compose[@]}" exec -T "$DB_SERVICE" \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1" >/dev/null \
  || die "Verifikasi database setelah restore gagal."

log "Restore selesai. Jalankan pemeriksaan aplikasi: curl -k https://localhost/api/health"

#!/usr/bin/env bash
# Backup harian MusicPedia: pg_dump + seluruh volume audio.
#
# Contoh cron (setiap hari pukul 02:17 WIB):
#   17 2 * * * cd /opt/musicpedia && ./scripts/backup.sh >> /var/log/musicpedia-backup.log 2>&1
#
# Variabel (boleh ditaruh di .env.production):
#   BACKUP_DIR            direktori tujuan lokal (bawaan ./backups)
#   BACKUP_KEEP_DAYS      retensi backup lokal (bawaan 14)
#   BACKUP_RCLONE_REMOTE  remote rclone tujuan, mis. "offsite:musicpedia-backup"
#   BACKUP_OFFSITE_DIR    direktori off-site alternatif (mount NFS/SSHFS host lain)
#   NODE_ENV              "production" mewajibkan salah satu tujuan off-site
#   AUDIO_HOST_DIR        isi bila audio tidak ada di container (uji dev)
#   COMPOSE_FILE          bawaan docker-compose.prod.yml
#   ENV_FILE              bawaan .env.production
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
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"
BACKUP_OFFSITE_DIR="${BACKUP_OFFSITE_DIR:-}"
NODE_ENV="${NODE_ENV:-development}"
AUDIO_HOST_DIR="${AUDIO_HOST_DIR:-}"

log() { printf '[backup %s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; }
die() { log "GAGAL: $*"; exit 1; }

[[ "$BACKUP_KEEP_DAYS" =~ ^[0-9]+$ ]] || die "BACKUP_KEEP_DAYS harus bilangan bulat."

# NFR Security #3: backup produksi harus punya salinan di lokasi yang berbeda
# dengan server. Tanpa tujuan off-site, script berhenti sebelum menyentuh
# database agar tidak diam-diam hanya menumpuk backup di disk server yang sama.
if [[ "$NODE_ENV" == "production" \
  && -z "$BACKUP_RCLONE_REMOTE" \
  && -z "$BACKUP_OFFSITE_DIR" ]]; then
  die "Di produksi, backup wajib disalin ke lokasi berbeda dengan server. Isi BACKUP_RCLONE_REMOTE (misalnya offsite:musicpedia-backup) atau BACKUP_OFFSITE_DIR (direktori NFS/SSHFS di host lain) di .env.production."
fi
command -v docker >/dev/null 2>&1 || die "docker tidak ditemukan."
[[ -f "$COMPOSE_FILE" ]] || die "Compose file $COMPOSE_FILE tidak ditemukan."

compose=(docker compose -f "$COMPOSE_FILE")
if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  compose+=(--env-file "$ENV_FILE")
fi

"${compose[@]}" config --services >/dev/null 2>&1 \
  || die "Compose file $COMPOSE_FILE tidak valid."

if ! "${compose[@]}" ps --status running --services 2>/dev/null | grep -qx "$DB_SERVICE"; then
  die "Service database '$DB_SERVICE' tidak berjalan. Jalankan docker compose up -d lebih dulu."
fi
if [[ -z "$AUDIO_HOST_DIR" ]] \
  && ! "${compose[@]}" ps --status running --services 2>/dev/null | grep -qx "$BACKEND_SERVICE"; then
  die "Service backend '$BACKEND_SERVICE' tidak berjalan dan AUDIO_HOST_DIR kosong."
fi

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="$(mktemp -d "$BACKUP_DIR/.backup-${timestamp}.XXXXXX")"
dest="$BACKUP_DIR/backup-$timestamp"
[[ -e "$dest" ]] && dest="${dest}-$$"

cleanup() {
  if [[ -n "${tmp:-}" && -d "$tmp" ]]; then rm -rf "$tmp"; fi
}
trap cleanup EXIT

log "Membuat dump database $POSTGRES_DB"
"${compose[@]}" exec -T "$DB_SERVICE" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-privileges \
  >"$tmp/database.sql" \
  || die "pg_dump gagal."
[[ -s "$tmp/database.sql" ]] || die "Dump database kosong."
grep -q "PostgreSQL database dump complete" "$tmp/database.sql" \
  || die "Dump database tidak lengkap (penanda akhir tidak ada)."

log "Mengarsipkan audio"
if [[ -n "$AUDIO_HOST_DIR" ]]; then
  [[ -d "$AUDIO_HOST_DIR" ]] || die "AUDIO_HOST_DIR $AUDIO_HOST_DIR tidak ada."
  tar -C "$AUDIO_HOST_DIR" -czf "$tmp/audio.tar.gz" . \
    || die "Gagal mengarsipkan audio dari $AUDIO_HOST_DIR."
else
  "${compose[@]}" exec -T "$BACKEND_SERVICE" \
    tar -C /data/audio -czf - . >"$tmp/audio.tar.gz" \
    || die "Gagal mengarsipkan audio dari volume backend."
fi
[[ -s "$tmp/audio.tar.gz" ]] || die "Arsip audio kosong."

{
  echo "dibuat_pada=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "database=$POSTGRES_DB"
  echo "database_bytes=$(stat -c %s "$tmp/database.sql")"
  echo "audio_bytes=$(stat -c %s "$tmp/audio.tar.gz")"
  echo "host=$(hostname)"
} >"$tmp/manifest.txt"
(
  cd "$tmp"
  sha256sum database.sql audio.tar.gz >SHA256SUMS
)

mv "$tmp" "$dest"
tmp=""
log "Backup tersimpan di $dest"

if [[ -n "$BACKUP_OFFSITE_DIR" ]]; then
  mkdir -p "$BACKUP_OFFSITE_DIR" \
    || die "BACKUP_OFFSITE_DIR $BACKUP_OFFSITE_DIR tidak dapat dibuat."
  cp -a "$dest" "${BACKUP_OFFSITE_DIR%/}/" \
    || die "Gagal menyalin backup ke BACKUP_OFFSITE_DIR $BACKUP_OFFSITE_DIR."
  log "Salinan off-site tersimpan di ${BACKUP_OFFSITE_DIR%/}/$(basename "$dest")"
fi

if [[ -n "$BACKUP_RCLONE_REMOTE" ]]; then
  command -v rclone >/dev/null 2>&1 \
    || die "BACKUP_RCLONE_REMOTE diisi tetapi rclone tidak ditemukan."
  log "Menyalin ke remote $BACKUP_RCLONE_REMOTE"
  rclone copy "$dest" "${BACKUP_RCLONE_REMOTE%/}" \
    || die "rclone copy ke $BACKUP_RCLONE_REMOTE gagal."
  # Retensi remote hanya menyentuh direktori backup-* di tujuan ini.
  rclone delete --min-age "${BACKUP_KEEP_DAYS}d" \
    --include "backup-*/**" "${BACKUP_RCLONE_REMOTE%/}" \
    || log "Peringatan: pembersihan retensi remote gagal (backup tetap tersalin)."
fi

log "Menghapus backup lokal yang lebih tua dari $BACKUP_KEEP_DAYS hari"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'backup-*' \
  -mtime "+$BACKUP_KEEP_DAYS" -print -exec rm -rf {} + 2>/dev/null || true

log "Selesai: database.sql + audio.tar.gz + manifest.txt + SHA256SUMS"

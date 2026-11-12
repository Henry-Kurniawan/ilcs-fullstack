import type { Pool } from "../db.ts";
import { gagalkanPembelianKedaluwarsa } from "./repository.ts";

/**
 * Menjalankan penyapu Pembelian kedaluwarsa. SQL-nya ada di repository agar
 * semua akses tabel `pembelian` tetap lewat satu lapisan.
 *
 * Mengembalikan jumlah baris yang ditandai Gagal, untuk dicatat pemanggil.
 */
export async function sapuPembelianKedaluwarsa(
  pool: Pool,
  now: Date,
): Promise<number> {
  return gagalkanPembelianKedaluwarsa(pool, now);
}

/** Jeda antarjalannya penyapu: lima menit. */
export const INTERVAL_PENYAPU_MS = 5 * 60 * 1000;

export interface OpsiPenyapu {
  intervalMs?: number;
  now?: () => Date;
  log?: Pick<Console, "log" | "error">;
}

/**
 * Menjalankan penyapu berkala di dalam proses backend. Hanya dipanggil dari
 * `server.ts`, sehingga tidak pernah berjalan saat tes. Mengembalikan fungsi
 * untuk menghentikan job (dipakai saat SIGTERM).
 */
export function mulaiPenyapu(pool: Pool, opsi: OpsiPenyapu = {}): () => void {
  const {
    intervalMs = INTERVAL_PENYAPU_MS,
    now = () => new Date(),
    log = console,
  } = opsi;
  let sedangBerjalan = false;

  async function jalankan(): Promise<void> {
    // Lewati putaran baru bila putaran sebelumnya belum selesai.
    if (sedangBerjalan) return;
    sedangBerjalan = true;
    try {
      const jumlah = await sapuPembelianKedaluwarsa(pool, now());
      if (jumlah > 0) {
        log.log(
          `Penyapu Pembelian: ${jumlah} Pembelian Menunggu Pembayaran yang lewat 24 jam ditandai Gagal.`,
        );
      }
    } catch (error) {
      log.error("Penyapu Pembelian gagal berjalan.", error);
    } finally {
      sedangBerjalan = false;
    }
  }

  const timer = setInterval(() => void jalankan(), intervalMs);
  // Job ini tidak boleh menahan proses tetap hidup saat shutdown.
  timer.unref();
  return () => clearInterval(timer);
}

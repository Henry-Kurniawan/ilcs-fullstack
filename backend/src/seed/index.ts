import type { Config } from "../config.ts";
import type { Pool } from "../db.ts";
import { seedAdmin, seedPelanggan } from "./akun.ts";
import { seedAudioLagu } from "./audio.ts";
import { seedKatalog } from "./katalog.ts";
import { seedPembelian } from "./pembelian.ts";

export * from "./akun.ts";
export * from "./audio.ts";
export * from "./katalog.ts";
export * from "./pembelian.ts";

export interface LangkahSeed {
  nama: string;
  jalankan: (pool: Pool, config: Config, now?: Date) => Promise<void>;
}

/** Urutan langkah seed: akun, katalog, audio, lalu Pembelian. */
export const langkahSeed: LangkahSeed[] = [
  {
    nama: "admin",
    jalankan: async (pool, config) => {
      await seedAdmin(pool, {
        email: config.adminEmail,
        password: config.adminPassword,
      });
    },
  },
  { nama: "pelanggan", jalankan: (pool) => seedPelanggan(pool) },
  { nama: "katalog", jalankan: (pool) => seedKatalog(pool) },
  { nama: "audio", jalankan: (pool, config) => seedAudioLagu(pool, config) },
  {
    nama: "pembelian",
    jalankan: (pool, _config, now) => seedPembelian(pool, now),
  },
];

// `now` dipakai tes agar tanggal Pembelian Data Demo deterministik. Pemanggil
// biasa mengosongkannya supaya tanggal dihitung dari waktu seed berjalan.
export async function jalankanSeed(
  pool: Pool,
  config: Config,
  log: (pesan: string) => void = console.log,
  now?: Date,
): Promise<void> {
  for (const langkah of langkahSeed) {
    await langkah.jalankan(pool, config, now);
    log(`Seed ${langkah.nama} selesai`);
  }
}

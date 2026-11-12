import { execFile } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import pg from "pg";
import { loadConfig, type Config } from "./config.ts";
import { withTransaction, type Pool } from "./db.ts";
import type { Akun } from "./domain/akun.ts";
import { buatFileAudio, siapkanDirektoriAudio } from "./media/audio.ts";
import { hashPassword } from "./password.ts";
import { createAkunRepository } from "./repositories/akun-repository.ts";

const execFileAsync = promisify(execFile);

export interface AdminSeed {
  email: string;
  password: string;
}

export async function seedAdmin(
  pool: pg.Pool,
  { email, password }: AdminSeed,
): Promise<Akun> {
  const passwordHash = await hashPassword(password);
  return createAkunRepository(pool).upsertAdmin({ email, passwordHash });
}

export interface DataGenre {
  nama: string;
}

export interface DataLagu {
  judul: string;
  artis: string;
  genre: string;
  pencipta: string;
  labelRekaman: string;
  tanggalRilis: string;
  harga: number;
}

export const GENRE_SEED: DataGenre[] = [
  { nama: "Pop" },
  { nama: "Rock" },
  { nama: "Jazz" },
  { nama: "Dangdut" },
  { nama: "Hip Hop" },
];

export const LAGU_SEED: DataLagu[] = [
  {
    judul: "Cahaya Pagi",
    artis: "Rina Prasetya",
    genre: "Pop",
    pencipta: "Rina Prasetya",
    labelRekaman: "Musika Records",
    tanggalRilis: "2024-09-12",
    harga: 25000,
  },
  {
    judul: "Jalan Pulang",
    artis: "Bara Nusantara",
    genre: "Rock",
    pencipta: "Dimas Saputra",
    labelRekaman: "Nusantara Sound",
    tanggalRilis: "2024-08-30",
    harga: 30000,
  },
  {
    judul: "Rindu Senja",
    artis: "Dewi Anggraini",
    genre: "Jazz",
    pencipta: "Dewi Anggraini",
    labelRekaman: "Senja Musik",
    tanggalRilis: "2024-07-21",
    harga: 35000,
  },
  {
    judul: "Kota Tua",
    artis: "The Kopi Society",
    genre: "Pop",
    pencipta: "Andi Wijaya",
    labelRekaman: "Musika Records",
    tanggalRilis: "2024-06-14",
    harga: 22000,
  },
  {
    judul: "Langit Biru",
    artis: "Mentari",
    genre: "Pop",
    pencipta: "Sari Mentari",
    labelRekaman: "Mentari Music",
    tanggalRilis: "2024-05-02",
    harga: 18000,
  },
  {
    judul: "Berdansa Malam Ini",
    artis: "DJ Sinar",
    genre: "Hip Hop",
    pencipta: "Sinar Ramadhan",
    labelRekaman: "Sinar Digital",
    tanggalRilis: "2024-04-11",
    harga: 20000,
  },
  {
    judul: "Sawah dan Bulan",
    artis: "Ki Ageng",
    genre: "Dangdut",
    pencipta: "Ageng Wibowo",
    labelRekaman: "Nada Nusantara",
    tanggalRilis: "2024-03-17",
    harga: 15000,
  },
  {
    judul: "Hujan di Bandung",
    artis: "Nada Kirana",
    genre: "Jazz",
    pencipta: "Kirana Larasati",
    labelRekaman: "Senja Musik",
    tanggalRilis: "2024-02-09",
    harga: 28000,
  },
  {
    judul: "Api Semangat",
    artis: "Bara Nusantara",
    genre: "Rock",
    pencipta: "Dimas Saputra",
    labelRekaman: "Nusantara Sound",
    tanggalRilis: "2024-01-25",
    harga: 32000,
  },
  {
    judul: "Pelangi Kecil",
    artis: "Mentari",
    genre: "Pop",
    pencipta: "Sari Mentari",
    labelRekaman: "Mentari Music",
    tanggalRilis: "2023-12-01",
    harga: 12000,
  },
];

export interface PelangganSeed {
  email: string;
  password: string;
  nama: string;
  aktif: boolean;
}

/**
 * Akun Pelanggan Data Demo. Kata sandi hanya untuk lingkungan demo dan
 * ditulis di README; seed dipakai ulang setiap kali lingkungan demo disiapkan.
 */
export const PELANGGAN_SEED: PelangganSeed[] = [
  {
    email: "budi@musicpedia.id",
    password: "pelanggan12345",
    nama: "Budi Santoso",
    aktif: true,
  },
  {
    email: "siti@musicpedia.id",
    password: "pelanggan12345",
    nama: "Siti Rahmawati",
    aktif: true,
  },
  {
    email: "andi@musicpedia.id",
    password: "pelanggan12345",
    nama: "Andi Pratama",
    aktif: false,
  },
];

export type StatusPembelianDemo = "MENUNGGU_PEMBAYARAN" | "LUNAS" | "GAGAL";

export interface PembelianSeed {
  kodeOrder: string;
  email: string;
  status: StatusPembelianDemo;
  judulLagu: string[];
  tokenSnap?: string;
}

/**
 * Pembelian Data Demo. Tanggalnya dihitung dari waktu seed supaya Laporan
 * Penjualan bulan berjalan langsung berisi baris. Seed ulang memperbarui
 * Pembelian Menunggu Pembayaran (status dan masa berlakunya) agar demo selalu
 * kembali ke tiga status, tetapi tanggal Pembelian Lunas/Gagal dibiarkan.
 */
export const PEMBELIAN_SEED: PembelianSeed[] = [
  {
    kodeOrder: "MP-DEMO-LUNAS-1",
    email: "budi@musicpedia.id",
    status: "LUNAS",
    judulLagu: ["Cahaya Pagi", "Jalan Pulang"],
  },
  {
    kodeOrder: "MP-DEMO-LUNAS-2",
    email: "budi@musicpedia.id",
    status: "LUNAS",
    judulLagu: ["Rindu Senja", "Kota Tua"],
  },
  {
    kodeOrder: "MP-DEMO-LUNAS-3",
    email: "siti@musicpedia.id",
    status: "LUNAS",
    judulLagu: ["Sawah dan Bulan", "Hujan di Bandung"],
  },
  {
    kodeOrder: "MP-DEMO-MENUNGGU-1",
    email: "siti@musicpedia.id",
    status: "MENUNGGU_PEMBAYARAN",
    judulLagu: ["Langit Biru"],
    tokenSnap: "demo-snap-token-menunggu",
  },
  {
    kodeOrder: "MP-DEMO-GAGAL-1",
    email: "siti@musicpedia.id",
    status: "GAGAL",
    judulLagu: ["Berdansa Malam Ini"],
  },
  {
    kodeOrder: "MP-DEMO-GAGAL-2",
    email: "andi@musicpedia.id",
    status: "GAGAL",
    judulLagu: ["Api Semangat", "Pelangi Kecil"],
  },
];

const FREKUENSI_NADA = [261, 294, 330, 349, 392, 440, 494, 523, 587, 659];

export function slugDemo(nama: string): string {
  return nama
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function seedKatalog(pool: Pool): Promise<void> {
  await withTransaction(pool, async (db) => {
    for (const genre of GENRE_SEED) {
      await db.query(
        "INSERT INTO genre (nama) VALUES ($1) ON CONFLICT (nama) DO NOTHING",
        [genre.nama],
      );
    }

    for (const lagu of LAGU_SEED) {
      await db.query(
        `INSERT INTO lagu
           (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga, tersembunyi)
         SELECT $1, $2, g.id, $3, $4, $5, $6, false
         FROM genre g
         WHERE g.nama = $7
           AND NOT EXISTS (
             SELECT 1 FROM lagu l WHERE l.judul = $1 AND l.artis = $2
           )`,
        [
          lagu.judul,
          lagu.artis,
          lagu.pencipta,
          lagu.labelRekaman,
          lagu.tanggalRilis,
          lagu.harga,
          lagu.genre,
        ],
      );
    }
  });
}

export async function seedPelanggan(pool: Pool): Promise<void> {
  for (const pelanggan of PELANGGAN_SEED) {
    const passwordHash = await hashPassword(pelanggan.password);
    await pool.query(
      `INSERT INTO akun (email, password_hash, peran, aktif, nama)
       VALUES ($1, $2, 'PELANGGAN', $3, $4)
       ON CONFLICT (lower(email)) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             aktif = EXCLUDED.aktif,
             nama = EXCLUDED.nama
         WHERE akun.peran = 'PELANGGAN'`,
      [pelanggan.email, passwordHash, pelanggan.aktif, pelanggan.nama],
    );
  }
}

async function adaBerkas(pathBerkas: string): Promise<boolean> {
  try {
    return (await stat(pathBerkas)).size > 0;
  } catch {
    return false;
  }
}

async function buatNadaSumber(
  ffmpegPath: string,
  pathKeluaran: string,
  frekuensi: number,
): Promise<void> {
  try {
    await execFileAsync(
      ffmpegPath,
      [
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frekuensi}:duration=35`,
        "-ac",
        "1",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        pathKeluaran,
      ],
      { timeout: 120_000 },
    );
  } catch (error) {
    throw new Error(
      `ffmpeg tidak dapat dijalankan (FFMPEG_PATH=${ffmpegPath}). ` +
        "Seed Data Demo membutuhkan ffmpeg untuk membuat audio orisinal dan Trial. " +
        "Pasang ffmpeg atau arahkan FFMPEG_PATH ke biner ffmpeg.",
      { cause: error },
    );
  }
}

/**
 * Membuat audio Data Demo yang orisinal (nada sinus sintetis, bukan rekaman
 * pihak lain) dan Trial lewat pipeline ffmpeg yang sama dengan unggahan Admin.
 * Berkas yang sudah ada dan masih tercatat di database dilewati, sehingga
 * seed berulang tidak menumpuk berkas.
 */
export async function seedAudioLagu(pool: Pool, config: Config): Promise<void> {
  siapkanDirektoriAudio(config.audioDir);
  const tmpDir = path.join(config.audioDir, "tmp");
  await mkdir(tmpDir, { recursive: true });

  for (const [indeks, lagu] of LAGU_SEED.entries()) {
    const { rows } = await pool.query<{
      id: number;
      file_mp3: string | null;
      file_trial: string | null;
    }>(
      `SELECT id, file_mp3, file_trial
       FROM lagu
       WHERE judul = $1 AND artis = $2`,
      [lagu.judul, lagu.artis],
    );
    const baris = rows[0];
    if (!baris) {
      throw new Error(
        `Lagu "${lagu.judul}" tidak ditemukan saat menyiapkan audio Data Demo.`,
      );
    }

    const slug = `seed-${slugDemo(lagu.judul)}`;
    const pathMp3 = path.join(config.audioDir, "mp3", `${slug}.mp3`);
    const pathTrial = path.join(config.audioDir, "trial", `${slug}.mp3`);
    const berkasLengkap =
      baris.file_mp3 &&
      baris.file_trial &&
      (await adaBerkas(path.join(config.audioDir, baris.file_mp3))) &&
      (await adaBerkas(path.join(config.audioDir, baris.file_trial)));
    if (berkasLengkap) continue;

    const sumber = path.join(tmpDir, `${slug}.mp3`);
    try {
      await buatNadaSumber(
        config.ffmpegPath,
        sumber,
        FREKUENSI_NADA[indeks % FREKUENSI_NADA.length]!,
      );

      let audio;
      try {
        audio = await buatFileAudio({
          ffmpegPath: config.ffmpegPath,
          audioDir: config.audioDir,
          sumberPath: sumber,
          namaDasar: slug,
        });
      } catch (error) {
        throw new Error(
          `Gagal membuat audio Data Demo untuk "${lagu.judul}". ` +
            `Pastikan ffmpeg tersedia di FFMPEG_PATH=${config.ffmpegPath}.`,
          { cause: error },
        );
      }

      await pool.query(
        "UPDATE lagu SET file_mp3 = $2, file_trial = $3 WHERE id = $1",
        [baris.id, audio.fileMp3, audio.fileTrial],
      );
    } finally {
      await rm(sumber, { force: true });
    }
  }
}

/**
 * Awal bulan berjalan menurut zona Asia/Jakarta. Dipakai agar Pembelian Lunas
 * Data Demo selalu masuk ke rentang bawaan Laporan Penjualan (bulan ini),
 * termasuk bila seed dijalankan pada tanggal 1 dini hari.
 */
function awalBulanJakarta(now: Date): Date {
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const tahun = Number(bagian.find((item) => item.type === "year")?.value);
  const bulan = Number(bagian.find((item) => item.type === "month")?.value);
  // Jakarta adalah UTC+7 tanpa DST.
  return new Date(Date.UTC(tahun, bulan - 1, 1) - 7 * 60 * 60 * 1000);
}

function waktuDemo(now: Date, menitMundur: number): Date {
  const hasil = new Date(now.getTime() - menitMundur * 60 * 1000);
  const awalBulan = awalBulanJakarta(now);
  return hasil < awalBulan ? now : hasil;
}

export async function seedPembelian(
  pool: Pool,
  now: Date = new Date(),
): Promise<void> {
  const harga = new Map(LAGU_SEED.map((lagu) => [lagu.judul, lagu.harga]));

  await withTransaction(pool, async (db) => {
    for (const [indeks, pembelian] of PEMBELIAN_SEED.entries()) {
      const item = pembelian.judulLagu.map((judul) => {
        const nilai = harga.get(judul);
        if (nilai === undefined) {
          throw new Error(`Harga Lagu "${judul}" tidak ada di Data Demo.`);
        }
        return { judul, harga: nilai };
      });
      const total = item.reduce((jumlah, baris) => jumlah + baris.harga, 0);

      const dibuatPada =
        pembelian.status === "GAGAL"
          ? new Date(now.getTime() - (3 + indeks) * 24 * 60 * 60 * 1000)
          : pembelian.status === "MENUNGGU_PEMBAYARAN"
            ? now
            : waktuDemo(now, (indeks + 1) * 60);
      const kedaluwarsaPada = new Date(
        dibuatPada.getTime() + 24 * 60 * 60 * 1000,
      );
      const dibayarPada =
        pembelian.status === "LUNAS"
          ? new Date(dibuatPada.getTime() + 5 * 60 * 1000)
          : null;

      await db.query(
        `INSERT INTO pembelian
           (pelanggan_id, status, total, kode_order, token_snap,
            dibuat_pada, kedaluwarsa_pada, dibayar_pada)
         SELECT a.id, $2, $3, $4, $5, $6, $7, $8
         FROM akun a
         WHERE a.email = $1 AND a.peran = 'PELANGGAN'
         ON CONFLICT (kode_order) DO UPDATE
           SET status = EXCLUDED.status,
               total = EXCLUDED.total,
               token_snap = EXCLUDED.token_snap,
               dibuat_pada = CASE
                 WHEN EXCLUDED.status = 'MENUNGGU_PEMBAYARAN'
                 THEN EXCLUDED.dibuat_pada
                 ELSE pembelian.dibuat_pada
               END,
               kedaluwarsa_pada = CASE
                 WHEN EXCLUDED.status = 'MENUNGGU_PEMBAYARAN'
                 THEN EXCLUDED.kedaluwarsa_pada
                 ELSE pembelian.kedaluwarsa_pada
               END,
               dibayar_pada = CASE
                 WHEN EXCLUDED.status = 'LUNAS'
                 THEN COALESCE(pembelian.dibayar_pada, EXCLUDED.dibayar_pada)
                 WHEN EXCLUDED.status = 'MENUNGGU_PEMBAYARAN' THEN NULL
                 ELSE pembelian.dibayar_pada
               END`,
        [
          pembelian.email,
          pembelian.status,
          total,
          pembelian.kodeOrder,
          pembelian.tokenSnap ?? null,
          dibuatPada,
          kedaluwarsaPada,
          dibayarPada,
        ],
      );

      const { rows } = await db.query<{ id: number }>(
        "SELECT id FROM pembelian WHERE kode_order = $1",
        [pembelian.kodeOrder],
      );
      const pembelianId = rows[0]?.id;
      if (!pembelianId) {
        throw new Error(
          `Pembelian Data Demo ${pembelian.kodeOrder} tidak dapat disiapkan.`,
        );
      }

      for (const baris of item) {
        await db.query(
          `INSERT INTO item_pembelian (pembelian_id, lagu_id, harga)
           SELECT $1, l.id, $2
           FROM lagu l
           WHERE l.judul = $3
           ON CONFLICT (pembelian_id, lagu_id) DO NOTHING`,
          [pembelianId, baris.harga, baris.judul],
        );
      }

      const { rows: itemTersimpan } = await db.query<{ jumlah: number }>(
        `SELECT count(*)::integer AS jumlah
         FROM item_pembelian
         WHERE pembelian_id = $1`,
        [pembelianId],
      );
      if (itemTersimpan[0]?.jumlah !== item.length) {
        throw new Error(
          `Item Pembelian Data Demo ${pembelian.kodeOrder} tidak lengkap.`,
        );
      }
    }
  });
}

export interface LangkahSeed {
  nama: string;
  jalankan: (pool: Pool, config: Config) => Promise<void>;
}

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
  { nama: "pembelian", jalankan: (pool) => seedPembelian(pool) },
];

export async function jalankanSeed(
  pool: Pool,
  config: Config,
  log: (pesan: string) => void = console.log,
): Promise<void> {
  for (const langkah of langkahSeed) {
    await langkah.jalankan(pool, config);
    log(`Seed ${langkah.nama} selesai`);
  }
}

if (import.meta.main) {
  const { migrate } = await import("./migrate.ts");

  const config = loadConfig();
  if (config.nodeEnv === "production" && !process.env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_PASSWORD wajib diisi saat menjalankan seed di produksi.",
    );
  }

  await migrate(config.databaseUrl, console.log);

  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  pool.on("error", (error) => console.error("Pool error", error));
  try {
    await jalankanSeed(pool, config);
  } finally {
    await pool.end();
  }
}

import pg from "pg";
import { loadConfig, type Config } from "./config.ts";
import { withTransaction, type Pool } from "./db.ts";
import type { Akun } from "./domain/akun.ts";
import { hashPassword } from "./password.ts";
import { createAkunRepository } from "./repositories/akun-repository.ts";

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
  { nama: "katalog", jalankan: (pool) => seedKatalog(pool) },
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

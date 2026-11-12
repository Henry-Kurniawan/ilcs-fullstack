import { withTransaction, type Pool } from "../db.ts";
import { LAGU_SEED } from "./katalog.ts";

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

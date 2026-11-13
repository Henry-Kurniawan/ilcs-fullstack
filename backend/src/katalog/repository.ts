import type { Genre, Lagu, LaguKatalog, UrutanLagu } from "@musicpedia/shared";
import type { Pool } from "../db.ts";

export interface BarisLagu {
  id: number;
  judul: string;
  artis: string;
  genre_id: number;
  genre_nama: string;
  pencipta: string;
  label_rekaman: string;
  tanggal_rilis: string;
  harga: number;
}

export interface FilterLagu {
  cari?: string;
  genre?: number;
  urutan: UrutanLagu;
  limit: number;
  offset: number;
  /** Pelanggan yang sedang masuk, untuk menandai dan mengurutkan Lagu yang sudah dimiliki. */
  pelangganId?: number;
}

export const KOLOM_LAGU = `
  l.id,
  l.judul,
  l.artis,
  g.id AS genre_id,
  g.nama AS genre_nama,
  l.pencipta,
  l.label_rekaman,
  to_char(l.tanggal_rilis, 'YYYY-MM-DD') AS tanggal_rilis,
  l.harga
`;

function polaCari(cari: string): string {
  return `%${cari.replace(/[\\%_]/g, "\\$&")}%`;
}

export function keLagu(baris: BarisLagu): Lagu {
  return {
    id: baris.id,
    judul: baris.judul,
    artis: baris.artis,
    genre: { id: baris.genre_id, nama: baris.genre_nama },
    pencipta: baris.pencipta,
    labelRekaman: baris.label_rekaman,
    tanggalRilis: baris.tanggal_rilis,
    harga: baris.harga,
  };
}

export async function daftarLagu(
  pool: Pool,
  filter: FilterLagu,
): Promise<{ items: LaguKatalog[]; total: number }> {
  const cari = filter.cari ? polaCari(filter.cari) : null;
  const genre = filter.genre ?? null;

  const { rows } = await pool.query<BarisLagu & { dimiliki: boolean }>(
    `SELECT ${KOLOM_LAGU},
       EXISTS (
         SELECT 1
         FROM item_pembelian ipm
         JOIN pembelian pm ON pm.id = ipm.pembelian_id
         WHERE pm.status = 'LUNAS'
           AND pm.pelanggan_id = $6::integer
           AND ipm.lagu_id = l.id
       ) AS dimiliki
     FROM lagu l
     JOIN genre g ON g.id = l.genre_id
     LEFT JOIN (
       SELECT ip.lagu_id, count(*)::integer AS jumlah_lunas
       FROM item_pembelian ip
       JOIN pembelian p ON p.id = ip.pembelian_id
       WHERE p.status = 'LUNAS'
       GROUP BY ip.lagu_id
     ) penjualan ON penjualan.lagu_id = l.id
     WHERE l.tersembunyi = false
       AND ($1::text IS NULL OR l.judul ILIKE $1 ESCAPE '\\' OR l.artis ILIKE $1 ESCAPE '\\')
       AND ($2::integer IS NULL OR l.genre_id = $2)
     ORDER BY
       dimiliki ASC,
       CASE WHEN $5::text = 'terlaris'
            THEN COALESCE(penjualan.jumlah_lunas, 0) END DESC,
       l.tanggal_rilis DESC, l.id DESC
     LIMIT $3 OFFSET $4`,
    [
      cari,
      genre,
      filter.limit,
      filter.offset,
      filter.urutan,
      filter.pelangganId ?? null,
    ],
  );

  const hitung = await pool.query<{ total: number }>(
    `SELECT count(*)::integer AS total
     FROM lagu l
     WHERE l.tersembunyi = false
       AND ($1::text IS NULL OR l.judul ILIKE $1 ESCAPE '\\' OR l.artis ILIKE $1 ESCAPE '\\')
       AND ($2::integer IS NULL OR l.genre_id = $2)`,
    [cari, genre],
  );

  return {
    items: rows.map((baris) => ({ ...keLagu(baris), dimiliki: baris.dimiliki })),
    total: hitung.rows[0]!.total,
  };
}

export async function detailLagu(pool: Pool, id: number): Promise<Lagu | null> {
  const { rows } = await pool.query<BarisLagu>(
    `SELECT ${KOLOM_LAGU}
     FROM lagu l
     JOIN genre g ON g.id = l.genre_id
     WHERE l.id = $1 AND l.tersembunyi = false`,
    [id],
  );
  return rows[0] ? keLagu(rows[0]) : null;
}

export async function daftarGenre(pool: Pool): Promise<Genre[]> {
  const { rows } = await pool.query<Genre>(
    "SELECT id, nama FROM genre ORDER BY nama ASC",
  );
  return rows;
}

export async function trialLagu(
  pool: Pool,
  id: number,
): Promise<{ fileTrial: string } | null> {
  const { rows } = await pool.query<{ fileTrial: string }>(
    `SELECT file_trial AS "fileTrial"
     FROM lagu
     WHERE id = $1 AND tersembunyi = false AND file_trial IS NOT NULL`,
    [id],
  );
  return rows[0] ?? null;
}

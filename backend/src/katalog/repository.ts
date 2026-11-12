import type { Genre, Lagu } from "@musicpedia/shared";
import type { Pool } from "../db.ts";

interface BarisLagu {
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
  limit: number;
  offset: number;
}

const KOLOM_LAGU = `
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

function keLagu(baris: BarisLagu): Lagu {
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
): Promise<{ items: Lagu[]; total: number }> {
  const cari = filter.cari ? polaCari(filter.cari) : null;
  const genre = filter.genre ?? null;

  const { rows } = await pool.query<BarisLagu>(
    `SELECT ${KOLOM_LAGU}
     FROM lagu l
     JOIN genre g ON g.id = l.genre_id
     WHERE l.tersembunyi = false
       AND ($1::text IS NULL OR l.judul ILIKE $1 ESCAPE '\\' OR l.artis ILIKE $1 ESCAPE '\\')
       AND ($2::integer IS NULL OR l.genre_id = $2)
     ORDER BY l.tanggal_rilis DESC, l.id DESC
     LIMIT $3 OFFSET $4`,
    [cari, genre, filter.limit, filter.offset],
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
    items: rows.map(keLagu),
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

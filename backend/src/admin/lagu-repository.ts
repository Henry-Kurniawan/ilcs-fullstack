import type { LaguAdmin } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { isForeignKeyViolation } from "../errors.ts";

interface BarisLaguAdmin {
  id: number;
  judul: string;
  artis: string;
  genre_id: number;
  genre_nama: string;
  pencipta: string;
  label_rekaman: string;
  tanggal_rilis: string;
  harga: number;
  tersembunyi: boolean;
}

export interface FilterLaguAdmin {
  cari?: string;
  genre?: number;
  limit: number;
  offset: number;
}

export interface DataLaguBaru {
  judul: string;
  artis: string;
  genreId: number;
  pencipta: string;
  labelRekaman: string;
  tanggalRilis: string;
  harga: number;
  tersembunyi: boolean;
  fileMp3: string;
  fileTrial: string;
}

export interface PerubahanLagu {
  judul?: string;
  artis?: string;
  genreId?: number;
  pencipta?: string;
  labelRekaman?: string;
  tanggalRilis?: string;
  harga?: number;
  tersembunyi?: boolean;
  fileMp3?: string;
  fileTrial?: string;
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
  l.harga,
  l.tersembunyi
`;

function polaCari(cari: string): string {
  return `%${cari.replace(/[\\%_]/g, "\\$&")}%`;
}

function keLaguAdmin(baris: BarisLaguAdmin): LaguAdmin {
  return {
    id: baris.id,
    judul: baris.judul,
    artis: baris.artis,
    genre: { id: baris.genre_id, nama: baris.genre_nama },
    pencipta: baris.pencipta,
    labelRekaman: baris.label_rekaman,
    tanggalRilis: baris.tanggal_rilis,
    harga: baris.harga,
    tersembunyi: baris.tersembunyi,
  };
}

export async function daftarLaguAdmin(
  pool: Pool,
  filter: FilterLaguAdmin,
): Promise<{ items: LaguAdmin[]; total: number }> {
  const cari = filter.cari ? polaCari(filter.cari) : null;
  const genre = filter.genre ?? null;

  const { rows } = await pool.query<BarisLaguAdmin>(
    `SELECT ${KOLOM_LAGU}
     FROM lagu l
     JOIN genre g ON g.id = l.genre_id
     WHERE ($1::text IS NULL OR l.judul ILIKE $1 ESCAPE '\\' OR l.artis ILIKE $1 ESCAPE '\\')
       AND ($2::integer IS NULL OR l.genre_id = $2)
     ORDER BY l.tanggal_rilis DESC, l.id DESC
     LIMIT $3 OFFSET $4`,
    [cari, genre, filter.limit, filter.offset],
  );

  const hitung = await pool.query<{ total: number }>(
    `SELECT count(*)::integer AS total
     FROM lagu l
     WHERE ($1::text IS NULL OR l.judul ILIKE $1 ESCAPE '\\' OR l.artis ILIKE $1 ESCAPE '\\')
       AND ($2::integer IS NULL OR l.genre_id = $2)`,
    [cari, genre],
  );

  return { items: rows.map(keLaguAdmin), total: hitung.rows[0]!.total };
}

export async function ambilLaguAdmin(
  pool: Pool,
  id: number,
): Promise<LaguAdmin | null> {
  const { rows } = await pool.query<BarisLaguAdmin>(
    `SELECT ${KOLOM_LAGU}
     FROM lagu l
     JOIN genre g ON g.id = l.genre_id
     WHERE l.id = $1`,
    [id],
  );
  return rows[0] ? keLaguAdmin(rows[0]) : null;
}

export async function tambahLagu(
  pool: Pool,
  data: DataLaguBaru,
): Promise<LaguAdmin> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lagu
       (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis,
        harga, tersembunyi, file_mp3, file_trial)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      data.judul,
      data.artis,
      data.genreId,
      data.pencipta,
      data.labelRekaman,
      data.tanggalRilis,
      data.harga,
      data.tersembunyi,
      data.fileMp3,
      data.fileTrial,
    ],
  );

  return (await ambilLaguAdmin(pool, rows[0]!.id))!;
}

export async function ubahLagu(
  pool: Pool,
  id: number,
  data: PerubahanLagu,
): Promise<LaguAdmin | null> {
  const { rowCount } = await pool.query(
    `UPDATE lagu SET
       judul = COALESCE($2::text, judul),
       artis = COALESCE($3::text, artis),
       genre_id = COALESCE($4::integer, genre_id),
       pencipta = COALESCE($5::text, pencipta),
       label_rekaman = COALESCE($6::text, label_rekaman),
       tanggal_rilis = COALESCE($7::date, tanggal_rilis),
       harga = COALESCE($8::integer, harga),
       tersembunyi = COALESCE($9::boolean, tersembunyi),
       file_mp3 = COALESCE($10::text, file_mp3),
       file_trial = COALESCE($11::text, file_trial)
     WHERE id = $1`,
    [
      id,
      data.judul ?? null,
      data.artis ?? null,
      data.genreId ?? null,
      data.pencipta ?? null,
      data.labelRekaman ?? null,
      data.tanggalRilis ?? null,
      data.harga ?? null,
      data.tersembunyi ?? null,
      data.fileMp3 ?? null,
      data.fileTrial ?? null,
    ],
  );

  if (rowCount === 0) return null;
  return ambilLaguAdmin(pool, id);
}

export async function aturTersembunyi(
  pool: Pool,
  id: number,
  tersembunyi: boolean,
): Promise<LaguAdmin | null> {
  const { rowCount } = await pool.query(
    "UPDATE lagu SET tersembunyi = $2 WHERE id = $1",
    [id, tersembunyi],
  );
  if (rowCount === 0) return null;
  return ambilLaguAdmin(pool, id);
}

export interface BerkasLagu {
  fileMp3: string | null;
  fileTrial: string | null;
}

export async function ambilBerkasLagu(
  pool: Pool,
  id: number,
): Promise<BerkasLagu | null> {
  const { rows } = await pool.query<BerkasLagu>(
    "SELECT file_mp3 AS \"fileMp3\", file_trial AS \"fileTrial\" FROM lagu WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export type HasilHapusLagu = "dihapus" | "tidak-ada" | "pernah-terjual";

export async function hapusLagu(
  pool: Pool,
  id: number,
): Promise<HasilHapusLagu> {
  try {
    const { rowCount } = await pool.query("DELETE FROM lagu WHERE id = $1", [id]);
    return rowCount === 0 ? "tidak-ada" : "dihapus";
  } catch (error) {
    // Item Pembelian merujuk Lagu lewat foreign key; Lagu yang pernah terjual
    // tidak boleh dihapus.
    if (isForeignKeyViolation(error)) return "pernah-terjual";
    throw error;
  }
}

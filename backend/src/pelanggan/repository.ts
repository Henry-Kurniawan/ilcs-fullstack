import type { Pelanggan } from "@musicpedia/shared";
import type { Pool } from "../db.ts";

interface BarisPelanggan {
  id: number;
  email: string;
  nama: string;
  aktif: boolean;
}

export interface FilterPelanggan {
  cari?: string;
  limit: number;
  offset: number;
}

export interface PerubahanPelanggan {
  nama?: string;
  email?: string;
}

export interface PelangganRepository {
  daftar(
    filter: FilterPelanggan,
  ): Promise<{ items: Pelanggan[]; total: number }>;
  update(id: number, perubahan: PerubahanPelanggan): Promise<Pelanggan | null>;
  setAktif(id: number, aktif: boolean): Promise<Pelanggan | null>;
}

const KOLOM_PELANGGAN = "id, email, nama, aktif";

function polaCari(cari: string): string {
  return `%${cari.replace(/[\\%_]/g, "\\$&")}%`;
}

function kePelanggan(baris: BarisPelanggan): Pelanggan {
  return {
    id: baris.id,
    email: baris.email,
    nama: baris.nama,
    aktif: baris.aktif,
  };
}

export function createPelangganRepository(pool: Pool): PelangganRepository {
  return {
    async daftar(filter) {
      const cari = filter.cari ? polaCari(filter.cari) : null;

      const { rows } = await pool.query<BarisPelanggan>(
        `SELECT ${KOLOM_PELANGGAN}
         FROM akun
         WHERE peran = 'PELANGGAN'
           AND ($1::text IS NULL
                OR nama ILIKE $1 ESCAPE '\\'
                OR email ILIKE $1 ESCAPE '\\')
         ORDER BY id DESC
         LIMIT $2 OFFSET $3`,
        [cari, filter.limit, filter.offset],
      );

      const hitung = await pool.query<{ total: number }>(
        `SELECT count(*)::integer AS total
         FROM akun
         WHERE peran = 'PELANGGAN'
           AND ($1::text IS NULL
                OR nama ILIKE $1 ESCAPE '\\'
                OR email ILIKE $1 ESCAPE '\\')`,
        [cari],
      );

      return {
        items: rows.map(kePelanggan),
        total: hitung.rows[0]!.total,
      };
    },

    async update(id, perubahan) {
      const bagian: string[] = [];
      const nilai: unknown[] = [];

      if (perubahan.nama !== undefined) {
        nilai.push(perubahan.nama);
        bagian.push(`nama = $${nilai.length}`);
      }
      if (perubahan.email !== undefined) {
        nilai.push(perubahan.email);
        bagian.push(`email = $${nilai.length}`);
      }

      nilai.push(id);
      const { rows } = await pool.query<BarisPelanggan>(
        `UPDATE akun
         SET ${bagian.join(", ")}
         WHERE id = $${nilai.length} AND peran = 'PELANGGAN'
         RETURNING ${KOLOM_PELANGGAN}`,
        nilai,
      );
      const row = rows[0];
      return row ? kePelanggan(row) : null;
    },

    async setAktif(id, aktif) {
      const { rows } = await pool.query<BarisPelanggan>(
        `UPDATE akun
         SET aktif = $2
         WHERE id = $1 AND peran = 'PELANGGAN'
         RETURNING ${KOLOM_PELANGGAN}`,
        [id, aktif],
      );
      const row = rows[0];
      return row ? kePelanggan(row) : null;
    },
  };
}

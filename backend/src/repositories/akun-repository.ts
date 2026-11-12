import type { Peran } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import type { Akun, AkunDenganPassword } from "../domain/akun.ts";

interface AkunRow {
  id: number;
  email: string;
  nama: string;
  peran: Peran;
  aktif: boolean;
  password_hash: string;
}

function toAkun(row: AkunRow): Akun {
  return {
    id: row.id,
    email: row.email,
    nama: row.nama,
    peran: row.peran,
    aktif: row.aktif,
  };
}

export interface AkunRepository {
  createPelanggan(input: { email: string; passwordHash: string }): Promise<Akun>;
  findByEmail(email: string): Promise<AkunDenganPassword | null>;
  findById(id: number): Promise<Akun | null>;
  findByIdWithPassword(id: number): Promise<AkunDenganPassword | null>;
  updateNama(id: number, nama: string): Promise<Akun | null>;
  updatePasswordHash(id: number, passwordHash: string): Promise<void>;
  upsertAdmin(input: { email: string; passwordHash: string }): Promise<Akun>;
}

export function createAkunRepository(pool: Pool): AkunRepository {
  return {
    async createPelanggan({ email, passwordHash }) {
      const { rows } = await pool.query<AkunRow>(
        `INSERT INTO akun (email, password_hash, peran, aktif)
         VALUES ($1, $2, 'PELANGGAN', true)
         RETURNING id, email, nama, peran, aktif, password_hash`,
        [email, passwordHash],
      );
      const row = rows[0];
      if (!row) throw new Error("Gagal membuat Pelanggan");
      return toAkun(row);
    },

    async findByEmail(email) {
      const { rows } = await pool.query<AkunRow>(
        `SELECT id, email, nama, peran, aktif, password_hash
         FROM akun
         WHERE email = $1`,
        [email],
      );
      const row = rows[0];
      return row ? { ...toAkun(row), passwordHash: row.password_hash } : null;
    },

    async findById(id) {
      const { rows } = await pool.query<AkunRow>(
        `SELECT id, email, nama, peran, aktif, password_hash
         FROM akun
         WHERE id = $1`,
        [id],
      );
      const row = rows[0];
      return row ? toAkun(row) : null;
    },

    async updateNama(id, nama) {
      const { rows } = await pool.query<AkunRow>(
        `UPDATE akun
         SET nama = $2
         WHERE id = $1
         RETURNING id, email, nama, peran, aktif, password_hash`,
        [id, nama],
      );
      const row = rows[0];
      return row ? toAkun(row) : null;
    },

    async findByIdWithPassword(id) {
      const { rows } = await pool.query<AkunRow>(
        `SELECT id, email, nama, peran, aktif, password_hash
         FROM akun
         WHERE id = $1`,
        [id],
      );
      const row = rows[0];
      return row ? { ...toAkun(row), passwordHash: row.password_hash } : null;
    },

    async updatePasswordHash(id, passwordHash) {
      await pool.query(
        `UPDATE akun SET password_hash = $2 WHERE id = $1`,
        [id, passwordHash],
      );
    },

    async upsertAdmin({ email, passwordHash }) {
      const { rows } = await pool.query<AkunRow>(
        `INSERT INTO akun (email, password_hash, peran, aktif)
         VALUES ($1, $2, 'ADMIN', true)
         ON CONFLICT (lower(email)) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               peran = 'ADMIN',
               aktif = true
         RETURNING id, email, nama, peran, aktif, password_hash`,
        [email, passwordHash],
      );
      const row = rows[0];
      if (!row) throw new Error("Gagal menyiapkan Admin");
      return toAkun(row);
    },
  };
}

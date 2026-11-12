import type { Peran } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import type { Akun, AkunDenganPassword } from "../domain/akun.ts";

interface AkunRow {
  id: number;
  email: string;
  peran: Peran;
  aktif: boolean;
  password_hash: string;
}

function toAkun(row: AkunRow): Akun {
  return {
    id: row.id,
    email: row.email,
    peran: row.peran,
    aktif: row.aktif,
  };
}

export interface AkunRepository {
  createPelanggan(input: { email: string; passwordHash: string }): Promise<Akun>;
  findByEmail(email: string): Promise<AkunDenganPassword | null>;
  findById(id: number): Promise<Akun | null>;
  upsertAdmin(input: { email: string; passwordHash: string }): Promise<Akun>;
}

export function createAkunRepository(pool: Pool): AkunRepository {
  return {
    async createPelanggan({ email, passwordHash }) {
      const { rows } = await pool.query<AkunRow>(
        `INSERT INTO akun (email, password_hash, peran, aktif)
         VALUES ($1, $2, 'PELANGGAN', true)
         RETURNING id, email, peran, aktif, password_hash`,
        [email, passwordHash],
      );
      const row = rows[0];
      if (!row) throw new Error("Gagal membuat Pelanggan");
      return toAkun(row);
    },

    async findByEmail(email) {
      const { rows } = await pool.query<AkunRow>(
        `SELECT id, email, peran, aktif, password_hash
         FROM akun
         WHERE email = $1`,
        [email],
      );
      const row = rows[0];
      return row ? { ...toAkun(row), passwordHash: row.password_hash } : null;
    },

    async findById(id) {
      const { rows } = await pool.query<AkunRow>(
        `SELECT id, email, peran, aktif, password_hash
         FROM akun
         WHERE id = $1`,
        [id],
      );
      const row = rows[0];
      return row ? toAkun(row) : null;
    },

    async upsertAdmin({ email, passwordHash }) {
      const { rows } = await pool.query<AkunRow>(
        `INSERT INTO akun (email, password_hash, peran, aktif)
         VALUES ($1, $2, 'ADMIN', true)
         ON CONFLICT (lower(email)) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               peran = 'ADMIN',
               aktif = true
         RETURNING id, email, peran, aktif, password_hash`,
        [email, passwordHash],
      );
      const row = rows[0];
      if (!row) throw new Error("Gagal menyiapkan Admin");
      return toAkun(row);
    },
  };
}

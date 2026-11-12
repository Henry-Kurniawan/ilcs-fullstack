import type { Pool } from "../db.ts";
import type { Akun } from "../domain/akun.ts";
import { hashPassword } from "../password.ts";
import { createAkunRepository } from "../repositories/akun-repository.ts";

export interface AdminSeed {
  email: string;
  password: string;
}

export async function seedAdmin(
  pool: Pool,
  { email, password }: AdminSeed,
): Promise<Akun> {
  const passwordHash = await hashPassword(password);
  return createAkunRepository(pool).upsertAdmin({ email, passwordHash });
}

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

import type { Genre } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { isForeignKeyViolation, isUniqueViolation } from "../errors.ts";

export type HasilTambahGenre = Genre | "duplikat";
export type HasilUbahGenre = Genre | "duplikat" | "tidak-ada";
export type HasilHapusGenre = "dihapus" | "tidak-ada" | "dipakai";

export async function tambahGenre(
  pool: Pool,
  nama: string,
): Promise<HasilTambahGenre> {
  try {
    const { rows } = await pool.query<Genre>(
      "INSERT INTO genre (nama) VALUES ($1) RETURNING id, nama",
      [nama],
    );
    return rows[0]!;
  } catch (error) {
    if (isUniqueViolation(error)) return "duplikat";
    throw error;
  }
}

export async function ubahGenre(
  pool: Pool,
  id: number,
  nama: string,
): Promise<HasilUbahGenre> {
  try {
    const { rows } = await pool.query<Genre>(
      "UPDATE genre SET nama = $2 WHERE id = $1 RETURNING id, nama",
      [id, nama],
    );
    return rows[0] ?? "tidak-ada";
  } catch (error) {
    if (isUniqueViolation(error)) return "duplikat";
    throw error;
  }
}

export async function hapusGenre(
  pool: Pool,
  id: number,
): Promise<HasilHapusGenre> {
  try {
    const { rowCount } = await pool.query("DELETE FROM genre WHERE id = $1", [
      id,
    ]);
    return rowCount === 0 ? "tidak-ada" : "dihapus";
  } catch (error) {
    if (isForeignKeyViolation(error)) return "dipakai";
    throw error;
  }
}

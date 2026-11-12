import type { Genre } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { AppError } from "../errors.ts";
import { hapusGenre, tambahGenre, ubahGenre } from "./genre-repository.ts";

export function createGenreAdminService(pool: Pool) {
  return {
    async tambah(nama: string): Promise<Genre> {
      const hasil = await tambahGenre(pool, nama);
      if (hasil === "duplikat") {
        throw new AppError(409, "KONFLIK", "Genre dengan nama itu sudah ada.");
      }
      return hasil;
    },

    async ubah(id: number, nama: string): Promise<Genre> {
      const hasil = await ubahGenre(pool, id, nama);
      if (hasil === "duplikat") {
        throw new AppError(409, "KONFLIK", "Genre dengan nama itu sudah ada.");
      }
      if (hasil === "tidak-ada") {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Genre tidak ditemukan.");
      }
      return hasil;
    },

    async hapus(id: number): Promise<void> {
      const hasil = await hapusGenre(pool, id);
      if (hasil === "tidak-ada") {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Genre tidak ditemukan.");
      }
      if (hasil === "dipakai") {
        throw new AppError(
          409,
          "KONFLIK",
          "Genre tidak bisa dihapus karena masih dipakai oleh Lagu.",
        );
      }
    },
  };
}

export type GenreAdminService = ReturnType<typeof createGenreAdminService>;

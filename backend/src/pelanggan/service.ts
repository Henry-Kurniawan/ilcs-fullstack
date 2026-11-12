import type {
  DaftarPelangganQuery,
  DaftarPelangganResponse,
  Pelanggan,
  UpdatePelangganRequest,
} from "@musicpedia/shared";
import { AppError, isUniqueViolation } from "../errors.ts";
import { buatMetaHalaman } from "../pagination.ts";
import type { PelangganRepository } from "./repository.ts";

export interface PelangganService {
  daftar(query: DaftarPelangganQuery): Promise<DaftarPelangganResponse>;
  ubah(id: number, input: UpdatePelangganRequest): Promise<Pelanggan>;
  ubahStatus(adminId: number, id: number, aktif: boolean): Promise<Pelanggan>;
}

const TIDAK_DITEMUKAN = new AppError(
  404,
  "PELANGGAN_TIDAK_DITEMUKAN",
  "Pelanggan tidak ditemukan.",
);

export function createPelangganService(
  repo: PelangganRepository,
): PelangganService {
  return {
    async daftar(query) {
      const offset = (query.halaman - 1) * query.ukuran;
      const { items, total } = await repo.daftar({
        cari: query.cari === "" ? undefined : query.cari,
        limit: query.ukuran,
        offset,
      });

      return {
        data: items,
        meta: buatMetaHalaman(total, query.halaman, query.ukuran),
      };
    },

    async ubah(id, input) {
      try {
        const pelanggan = await repo.update(id, input);
        if (!pelanggan) throw TIDAK_DITEMUKAN;
        return pelanggan;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(
            409,
            "EMAIL_TERDAFTAR",
            "Email sudah terdaftar. Gunakan email lain.",
          );
        }
        throw error;
      }
    },

    async ubahStatus(adminId, id, aktif) {
      // Admin tidak boleh menonaktifkan akunnya sendiri lewat area Pelanggan.
      if (!aktif && id === adminId) {
        throw new AppError(
          400,
          "AKSI_TIDAK_DIIZINKAN",
          "Admin tidak dapat menonaktifkan akunnya sendiri.",
        );
      }

      const pelanggan = await repo.setAktif(id, aktif);
      if (!pelanggan) throw TIDAK_DITEMUKAN;
      return pelanggan;
    },
  };
}

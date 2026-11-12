import type { Keranjang, Lagu } from "@musicpedia/shared";
import { AppError, isUniqueViolation } from "../errors.ts";
import type { KeranjangRepository } from "./repository.ts";

export interface KeranjangService {
  lihat(pelangganId: number): Promise<Keranjang>;
  tambah(pelangganId: number, laguId: number): Promise<Keranjang>;
  hapus(pelangganId: number, laguId: number): Promise<Keranjang>;
}

export interface KeranjangDeps {
  repo: KeranjangRepository;
  /** Port ke konteks Katalog; Keranjang tidak membaca repository-nya langsung. */
  detailLagu: (id: number) => Promise<Lagu | null>;
}

export function createKeranjangService({
  repo,
  detailLagu,
}: KeranjangDeps): KeranjangService {
  async function lihat(pelangganId: number): Promise<Keranjang> {
    // Bersihkan sisa Lagu yang disembunyikan Admin agar Keranjang tidak
    // menyimpan baris yang tidak bisa dilihat maupun dihapus Pelanggan.
    await repo.buangLaguTersembunyi(pelangganId);
    const items = await repo.daftar(pelangganId);
    return {
      items,
      jumlah: items.length,
      total: items.reduce((jumlah, lagu) => jumlah + lagu.harga, 0),
    };
  }

  return {
    lihat,

    async tambah(pelangganId, laguId) {
      const lagu = await detailLagu(laguId);
      if (!lagu) {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
      }

      const status = await repo.statusPembelian(pelangganId, laguId);
      if (status.dimiliki) {
        throw new AppError(
          409,
          "LAGU_SUDAH_DIMILIKI",
          "Lagu ini sudah Anda miliki.",
        );
      }
      if (status.menungguPembayaran) {
        throw new AppError(
          409,
          "LAGU_MENUNGGU_PEMBAYARAN",
          "Lagu ini sedang menunggu pembayaran.",
        );
      }

      try {
        await repo.tambah(pelangganId, laguId);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(
            409,
            "SUDAH_DI_KERANJANG",
            "Lagu ini sudah ada di Keranjang.",
          );
        }
        throw error;
      }
      return lihat(pelangganId);
    },

    async hapus(pelangganId, laguId) {
      await repo.hapus(pelangganId, laguId);
      return lihat(pelangganId);
    },
  };
}

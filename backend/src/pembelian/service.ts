import { randomUUID } from "node:crypto";
import type { Pembelian, PembelianCheckout } from "@musicpedia/shared";
import { withTransaction, type Pool } from "../db.ts";
import { AppError } from "../errors.ts";
import type { PaymentGateway } from "../payment-gateway/client.ts";
import {
  ambilPembelianMilik,
  buangLaguTersembunyiDariKeranjang,
  buatPembelian,
  daftarPembelian,
  kosongkanKeranjang,
  kunciPelanggan,
  laguDiKeranjang,
  pembelianDenganKodeOrder,
  simpanTokenSnap,
  statusKepemilikan,
  tambahItemPembelian,
  transisiPembelian,
} from "./repository.ts";
import type {
  PembelianDikenal,
  StatusAkhirPembelian,
} from "./repository.ts";

export type { StatusAkhirPembelian } from "./repository.ts";

export const MASA_BERLAKU_PEMBELIAN_JAM = 24;

export interface PembelianService {
  checkout(pelangganId: number): Promise<PembelianCheckout>;
  daftar(pelangganId: number): Promise<Pembelian[]>;
  lanjutkan(pelangganId: number, id: number): Promise<PembelianCheckout>;
}

function kodeOrderBaru(): string {
  return `MP-${randomUUID()}`;
}

export function createPembelianService(
  pool: Pool,
  gateway: PaymentGateway,
): PembelianService {
  return {
    async checkout(pelangganId) {
      const pembelianId = await withTransaction(pool, async (db) => {
        // Kunci baris Pelanggan: checkout kedua untuk Pelanggan yang sama
        // menunggu sampai yang pertama selesai, lalu melihat Keranjang kosong.
        const pelanggan = await kunciPelanggan(db, pelangganId);
        if (!pelanggan) {
          throw new AppError(401, "BELUM_MASUK", "Silakan masuk terlebih dahulu.");
        }

        // Lagu yang disembunyikan Admin dibersihkan dari Keranjang lebih dulu,
        // sehingga checkout hanya memproses Lagu yang masih terlihat.
        await buangLaguTersembunyiDariKeranjang(db, pelangganId);
        const lagu = await laguDiKeranjang(db, pelangganId);
        if (lagu.length === 0) {
          throw new AppError(
            409,
            "KERANJANG_KOSONG",
            "Keranjang Anda masih kosong.",
          );
        }

        const status = await statusKepemilikan(
          db,
          pelangganId,
          lagu.map((item) => item.laguId),
        );
        if (status.some((item) => item.lunas)) {
          throw new AppError(
            409,
            "LAGU_SUDAH_DIMILIKI",
            "Ada Lagu di Keranjang yang sudah Anda miliki.",
          );
        }
        if (status.some((item) => item.menunggu)) {
          throw new AppError(
            409,
            "LAGU_MENUNGGU_PEMBAYARAN",
            "Ada Lagu di Keranjang yang sedang menunggu pembayaran.",
          );
        }

        const total = lagu.reduce((jumlah, item) => jumlah + item.harga, 0);
        const kodeOrder = kodeOrderBaru();
        const id = await buatPembelian(db, {
          pelangganId,
          total,
          kodeOrder,
        });
        await tambahItemPembelian(
          db,
          id,
          lagu.map((item) => ({ laguId: item.laguId, harga: item.harga })),
        );
        await kosongkanKeranjang(db, pelangganId);

        // Permintaan token Snap ada di dalam transaksi: bila gateway gagal,
        // Pembelian dan Item Pembelian ikut di-rollback sehingga tidak ada
        // Pembelian yatim.
        let token: string;
        try {
          const transaksi = await gateway.buatTransaksiSnap({
            kodeOrder,
            total,
            item: lagu.map((item) => ({
              id: String(item.laguId),
              nama: item.judul,
              harga: item.harga,
              jumlah: 1,
            })),
            pelanggan: { nama: pelanggan.nama, email: pelanggan.email },
            kedaluwarsaJam: MASA_BERLAKU_PEMBELIAN_JAM,
          });
          token = transaksi.token;
        } catch {
          throw new AppError(
            502,
            "PAYMENT_GATEWAY_GAGAL",
            "Gagal memulai pembayaran. Silakan coba lagi.",
          );
        }

        await simpanTokenSnap(db, id, token);
        return id;
      });

      const tersimpan = await ambilPembelianMilik(pool, pelangganId, pembelianId);
      if (!tersimpan?.tokenSnap) {
        throw new AppError(
          500,
          "KESALAHAN_SERVER",
          "Pembelian tidak dapat dimuat setelah checkout.",
        );
      }
      return { ...tersimpan.pembelian, tokenSnap: tersimpan.tokenSnap };
    },

    async daftar(pelangganId) {
      return daftarPembelian(pool, pelangganId);
    },

    async lanjutkan(pelangganId, id) {
      const tersimpan = await ambilPembelianMilik(pool, pelangganId, id);
      if (!tersimpan) {
        throw new AppError(
          404,
          "TIDAK_DITEMUKAN",
          "Pembelian tidak ditemukan.",
        );
      }
      if (
        tersimpan.pembelian.status !== "MENUNGGU_PEMBAYARAN" ||
        !tersimpan.tokenSnap
      ) {
        throw new AppError(
          409,
          "PEMBELIAN_TIDAK_BISA_DILANJUTKAN",
          "Pembelian ini tidak bisa dilanjutkan.",
        );
      }
      // Token yang tersimpan dipakai ulang; tidak ada transaksi gateway baru.
      return { ...tersimpan.pembelian, tokenSnap: tersimpan.tokenSnap };
    },
  };
}

/**
 * Port Pembelian untuk konteks Webhook. Webhook memetakan kode order Midtrans
 * lalu meminta transisi status; ia tidak menulis SQL Pembelian sendiri.
 */
export interface PembelianWebhook {
  denganKodeOrder(kodeOrder: string): Promise<PembelianDikenal | null>;
  transisi(
    pembelianId: number,
    status: StatusAkhirPembelian,
  ): Promise<boolean>;
}

export function createPembelianWebhookService(
  pool: Pool,
): PembelianWebhook {
  return {
    denganKodeOrder(kodeOrder) {
      return pembelianDenganKodeOrder(pool, kodeOrder);
    },

    transisi(pembelianId, status) {
      // Transisi dan pencarian memakai primitive yang sama dengan checkout.
      return withTransaction(pool, (db) =>
        transisiPembelian(db, pembelianId, status),
      );
    },
  };
}

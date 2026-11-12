import { AppError } from "../errors.ts";

export interface KepemilikanLagu {
  lunas: boolean;
  menunggu: boolean;
}

/**
 * Aturan tunggal Keranjang dan checkout: Lagu yang sudah Lunas tidak boleh
 * dibeli lagi, dan Lagu yang sedang Menunggu Pembayaran harus diselesaikan
 * dulu. Pesan dan kode kesalahannya sama di kedua jalur.
 */
export function pastikanLaguBelumDimiliki(
  status: readonly KepemilikanLagu[],
): void {
  if (status.some((item) => item.lunas)) {
    throw new AppError(
      409,
      "LAGU_SUDAH_DIMILIKI",
      "Lagu ini sudah Anda miliki.",
    );
  }
  if (status.some((item) => item.menunggu)) {
    throw new AppError(
      409,
      "LAGU_MENUNGGU_PEMBAYARAN",
      "Lagu ini sedang menunggu pembayaran.",
    );
  }
}

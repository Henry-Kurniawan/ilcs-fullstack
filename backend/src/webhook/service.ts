import { createHash, timingSafeEqual } from "node:crypto";
import type { MidtransNotification, StatusPembelian } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { AppError } from "../errors.ts";
import type {
  PaymentGateway,
  StatusTransaksiGateway,
} from "../payment-gateway/client.ts";
import {
  pembelianDenganKodeOrder,
  tandaiPembelianGagal,
  tandaiPembelianLunas,
} from "../pembelian/repository.ts";

export interface WebhookService {
  terima(notifikasi: MidtransNotification): Promise<void>;
}

/**
 * Signature Midtrans adalah SHA-512 dari
 * order_id + status_code + gross_amount + server key.
 */
function tandaTanganSah(
  notifikasi: MidtransNotification,
  serverKey: string,
): boolean {
  // Tanpa server key, signature apa pun tidak bisa dianggap sah.
  if (serverKey === "") return false;
  const diharapkan = createHash("sha512")
    .update(
      `${notifikasi.order_id}${notifikasi.status_code}${notifikasi.gross_amount}${serverKey}`,
    )
    .digest("hex");
  const diterima = Buffer.from(notifikasi.signature_key, "utf8");
  const harapan = Buffer.from(diharapkan, "utf8");
  return (
    diterima.length === harapan.length && timingSafeEqual(diterima, harapan)
  );
}

/**
 * Pemetaan status Midtrans ke status Pembelian. Status yang tidak dikenal
 * (pending, capture yang masih ditinjau, dan seterusnya) tidak mengubah apa pun.
 */
export function petakanStatusTransaksi(
  status: StatusTransaksiGateway,
): StatusPembelian | null {
  if (status.status === "settlement") return "LUNAS";
  if (status.status === "capture") {
    if (status.fraudStatus === "accept") return "LUNAS";
    if (status.fraudStatus === "deny") return "GAGAL";
    return null;
  }
  if (
    status.status === "deny" ||
    status.status === "cancel" ||
    status.status === "expire"
  ) {
    return "GAGAL";
  }
  return null;
}

export function createWebhookService(
  pool: Pool,
  gateway: PaymentGateway,
  serverKey: string,
): WebhookService {
  return {
    async terima(notifikasi) {
      // Signature diperiksa sebelum menyentuh database.
      if (!tandaTanganSah(notifikasi, serverKey)) {
        throw new AppError(
          401,
          "SIGNATURE_TIDAK_VALID",
          "Signature notifikasi Midtrans tidak valid.",
        );
      }

      // Notifikasi untuk kode order yang tidak kita kenal diabaikan.
      if (!(await pembelianDenganKodeOrder(pool, notifikasi.order_id))) {
        return;
      }

      // Status dicek ulang ke Status API; isi notifikasi tidak dipercaya sendiri.
      let status: StatusTransaksiGateway;
      try {
        status = await gateway.ambilStatusTransaksi(notifikasi.order_id);
      } catch {
        throw new AppError(
          502,
          "PAYMENT_GATEWAY_GAGAL",
          "Gagal memeriksa status pembayaran.",
        );
      }
      if (status.kodeOrder !== notifikasi.order_id) return;

      const hasil = petakanStatusTransaksi(status);
      if (hasil === "LUNAS") {
        await tandaiPembelianLunas(pool, notifikasi.order_id);
      } else if (hasil === "GAGAL") {
        await tandaiPembelianGagal(pool, notifikasi.order_id);
      }
    },
  };
}

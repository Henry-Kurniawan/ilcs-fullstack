import { createHash, timingSafeEqual } from "node:crypto";
import type { MidtransNotification } from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import type {
  PaymentGateway,
  StatusTransaksiGateway,
} from "../payment-gateway/client.ts";
import type {
  PembelianWebhook,
  StatusAkhirPembelian,
} from "../pembelian/service.ts";

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
): StatusAkhirPembelian | null {
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
  gateway: PaymentGateway,
  serverKey: string,
  pembelianRepo: PembelianWebhook,
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
      const pembelian = await pembelianRepo.denganKodeOrder(
        notifikasi.order_id,
      );
      if (!pembelian) return;

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
      if (hasil === null) return;
      // Primitive transisi yang sama dengan Penyapu: hanya dari Menunggu
      // Pembayaran, sehingga notifikasi ganda atau terlambat tidak berefek.
      await pembelianRepo.transisi(pembelian.id, hasil);
    },
  };
}

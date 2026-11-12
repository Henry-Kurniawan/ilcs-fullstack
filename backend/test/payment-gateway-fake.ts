import type {
  PaymentGateway,
  PermintaanTransaksiSnap,
  StatusTransaksiGateway,
} from "../src/payment-gateway/client.ts";

export interface GatewayPalsu {
  gateway: PaymentGateway;
  permintaan: PermintaanTransaksiSnap[];
  aturStatus(status: string): void;
  aturFraudStatus(fraudStatus: string | null): void;
  aturGagal(gagal: boolean): void;
  aturToken(token: string | null): void;
}

/**
 * Fake Payment Gateway untuk tes. Mencatat permintaan Snap yang dibuat dan
 * mengembalikan status tetap yang bisa diatur tes (dipakai juga oleh tes
 * webhook). Token palsu diturunkan dari kode order agar mudah ditelusuri.
 */
export function buatGatewayPalsu(): GatewayPalsu {
  const permintaan: PermintaanTransaksiSnap[] = [];
  let status = "pending";
  let fraudStatus: string | null = null;
  let gagal = false;
  let token: string | null = null;

  return {
    permintaan,
    aturStatus(nilai) {
      status = nilai;
    },
    aturFraudStatus(nilai) {
      fraudStatus = nilai;
    },
    aturGagal(nilai) {
      gagal = nilai;
    },
    aturToken(nilai) {
      token = nilai;
    },
    gateway: {
      async buatTransaksiSnap(input) {
        if (gagal) {
          throw new Error("Payment Gateway tidak dapat dihubungi");
        }
        permintaan.push(input);
        return {
          token: token ?? `snap-${input.kodeOrder}`,
          redirectUrl: null,
        };
      },
      async ambilStatusTransaksi(kodeOrder): Promise<StatusTransaksiGateway> {
        if (gagal) {
          throw new Error("Payment Gateway tidak dapat dihubungi");
        }
        return { kodeOrder, status, fraudStatus, statusCode: "200" };
      },
    },
  };
}

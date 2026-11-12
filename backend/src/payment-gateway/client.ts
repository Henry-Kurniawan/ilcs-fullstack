export interface ItemSnap {
  id: string;
  nama: string;
  harga: number;
  jumlah: number;
}

export interface PermintaanTransaksiSnap {
  kodeOrder: string;
  total: number;
  item: ItemSnap[];
  pelanggan: { nama: string; email: string };
  kedaluwarsaJam: number;
}

export interface TransaksiSnap {
  token: string;
  redirectUrl: string | null;
}

export interface StatusTransaksiGateway {
  kodeOrder: string;
  /** Nilai `transaction_status` Midtrans: pending, settlement, capture, deny, cancel, expire, dan seterusnya. */
  status: string;
  /** Nilai `fraud_status` Midtrans bila ada. */
  fraudStatus: string | null;
  statusCode: string;
}

/**
 * Batas sistem ke Midtrans. Dua operasi saja: membuat transaksi Snap dan
 * mengambil status transaksi lewat Status API. Tes menyuntikkan fake lewat
 * `createApp`, sedangkan implementasi asli memakai `fetch`.
 */
export interface PaymentGateway {
  buatTransaksiSnap(
    permintaan: PermintaanTransaksiSnap,
  ): Promise<TransaksiSnap>;
  ambilStatusTransaksi(kodeOrder: string): Promise<StatusTransaksiGateway>;
}

export const SNAP_URL_SANDBOX = "https://app.sandbox.midtrans.com/snap/snap.js";
export const SNAP_URL_PRODUCTION = "https://app.midtrans.com/snap/snap.js";

export function snapUrl(isProduction: boolean): string {
  return isProduction ? SNAP_URL_PRODUCTION : SNAP_URL_SANDBOX;
}

const API_BASE_SANDBOX = "https://api.sandbox.midtrans.com";
const API_BASE_PRODUCTION = "https://api.midtrans.com";

interface ResponsSnap {
  token?: unknown;
  redirect_url?: unknown;
}

interface ResponsStatus {
  order_id?: unknown;
  transaction_status?: unknown;
  fraud_status?: unknown;
  status_code?: unknown;
}

export interface DependensiMidtrans {
  serverKey: string;
  isProduction: boolean;
}

async function ambilJson(
  url: string,
  init: RequestInit,
  operasi: string,
): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Midtrans ${operasi} gagal dengan status ${res.status}`);
  }
  return res.json();
}

export function createMidtransGateway({
  serverKey,
  isProduction,
}: DependensiMidtrans): PaymentGateway {
  if (!serverKey && isProduction) {
    throw new Error("MIDTRANS_SERVER_KEY wajib diisi di produksi.");
  }

  const apiBase = isProduction ? API_BASE_PRODUCTION : API_BASE_SANDBOX;
  const otorisasi = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
  const kepala = {
    Authorization: otorisasi,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  return {
    async buatTransaksiSnap(permintaan) {
      const body = {
        transaction_details: {
          order_id: permintaan.kodeOrder,
          gross_amount: permintaan.total,
        },
        item_details: permintaan.item.map((item) => ({
          id: item.id,
          name: item.nama.slice(0, 50),
          price: item.harga,
          quantity: item.jumlah,
        })),
        customer_details: {
          first_name: permintaan.pelanggan.nama || undefined,
          email: permintaan.pelanggan.email,
        },
        expiry: {
          unit: "hours",
          duration: permintaan.kedaluwarsaJam,
        },
      };

      const hasil = (await ambilJson(
        `${apiBase}/snap/v1/transactions`,
        { method: "POST", headers: kepala, body: JSON.stringify(body) },
        "Snap",
      )) as ResponsSnap;

      if (typeof hasil.token !== "string") {
        throw new Error("Respons Snap tidak memuat token.");
      }
      return {
        token: hasil.token,
        redirectUrl:
          typeof hasil.redirect_url === "string" ? hasil.redirect_url : null,
      };
    },

    async ambilStatusTransaksi(kodeOrder) {
      const hasil = (await ambilJson(
        `${apiBase}/v2/${encodeURIComponent(kodeOrder)}/status`,
        { method: "GET", headers: kepala },
        "Status",
      )) as ResponsStatus;

      return {
        kodeOrder:
          typeof hasil.order_id === "string" ? hasil.order_id : kodeOrder,
        status:
          typeof hasil.transaction_status === "string"
            ? hasil.transaction_status
            : "unknown",
        fraudStatus:
          typeof hasil.fraud_status === "string" ? hasil.fraud_status : null,
        statusCode:
          typeof hasil.status_code === "string" ? hasil.status_code : "200",
      };
    },
  };
}

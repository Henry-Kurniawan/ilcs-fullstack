import { konfigurasiResponseSchema } from "@musicpedia/shared";
import { apiJson } from "../api.ts";

export interface OpsiSnap {
  onSuccess?: (hasil?: unknown) => void;
  onPending?: (hasil?: unknown) => void;
  onError?: (hasil?: unknown) => void;
  onClose?: () => void;
}

interface SnapGlobal {
  pay(token: string, opsi: OpsiSnap): void;
}

declare global {
  interface Window {
    snap?: SnapGlobal;
  }
}

let snapSiap: Promise<SnapGlobal> | null = null;

async function ambilKonfigurasi() {
  try {
    return await apiJson("/api/konfigurasi", konfigurasiResponseSchema);
  } catch {
    throw new Error("Konfigurasi pembayaran tidak tersedia.");
  }
}

function muatSkrip(url: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const skrip = document.createElement("script");
    skrip.src = url;
    skrip.async = true;
    skrip.dataset.clientKey = clientKey;
    skrip.onload = () => resolve();
    skrip.onerror = () => {
      skrip.remove();
      reject(new Error("Halaman pembayaran gagal dimuat."));
    };
    document.body.appendChild(skrip);
  });
}

/**
 * Memuat snap.js sekali saja memakai client key publik dari server. Server key
 * Midtrans tidak pernah ikut ke browser.
 */
export function muatSnap(): Promise<SnapGlobal> {
  if (snapSiap) return snapSiap;

  snapSiap = (async () => {
    const konfigurasi = await ambilKonfigurasi();
    if (!konfigurasi.midtransClientKey) {
      throw new Error("Pembayaran belum dikonfigurasi.");
    }
    await muatSkrip(konfigurasi.midtransSnapUrl, konfigurasi.midtransClientKey);
    if (!window.snap) {
      throw new Error("Halaman pembayaran gagal dimuat.");
    }
    return window.snap;
  })().catch((error: unknown) => {
    snapSiap = null;
    throw error;
  });

  return snapSiap;
}

export async function bukaSnap(token: string, opsi: OpsiSnap): Promise<void> {
  const snap = await muatSnap();
  snap.pay(token, opsi);
}

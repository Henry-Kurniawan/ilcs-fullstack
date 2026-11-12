import type { DaftarLaguSayaResponse } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { AppError } from "../errors.ts";
import {
  ambilBerkasDimiliki,
  daftarLaguDimiliki,
  type BerkasUnduhan,
} from "./repository.ts";

export async function ambilLaguSaya(
  pool: Pool,
  pelangganId: number,
): Promise<DaftarLaguSayaResponse> {
  return { data: await daftarLaguDimiliki(pool, pelangganId) };
}

export async function ambilUnduhan(
  pool: Pool,
  pelangganId: number,
  laguId: number,
): Promise<BerkasUnduhan> {
  const berkas = await ambilBerkasDimiliki(pool, pelangganId, laguId);
  if (!berkas) {
    // Jawaban yang sama untuk Lagu yang tidak ada, bukan milik Pelanggan, atau
    // belum Lunas; menebak id tidak membocorkan kepemilikan.
    throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
  }
  return berkas;
}

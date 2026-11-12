import type { Request } from "express";
import { AppError } from "./errors.ts";

/** Id Pelanggan yang sedang masuk; menolak permintaan tanpa sesi. */
export function pelangganId(req: Request): number {
  const akun = req.currentAkun;
  if (!akun) {
    throw new AppError(401, "BELUM_MASUK", "Silakan masuk terlebih dahulu.");
  }
  return akun.id;
}

/**
 * Membaca satu parameter rute sebagai id bilangan bulat positif. Nama
 * parameter dan pesan kesalahan disesuaikan konteks pemanggil.
 */
export function ambilId(
  req: Request,
  pesan = "Id tidak valid.",
  nama = "id",
): number {
  const id = Number(req.params[nama]);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "VALIDASI", pesan);
  }
  return id;
}

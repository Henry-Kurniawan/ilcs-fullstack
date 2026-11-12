import type {
  DaftarGenreResponse,
  DaftarLaguResponse,
  Lagu,
  UrutanLagu,
} from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { daftarGenre, daftarLagu, detailLagu, trialLagu } from "./repository.ts";

export interface PermintaanDaftarLagu {
  cari?: string;
  genre?: number;
  urutan: UrutanLagu;
  halaman: number;
  ukuran: number;
}

export async function ambilDaftarLagu(
  pool: Pool,
  permintaan: PermintaanDaftarLagu,
): Promise<DaftarLaguResponse> {
  const offset = (permintaan.halaman - 1) * permintaan.ukuran;
  const { items, total } = await daftarLagu(pool, {
    cari: permintaan.cari,
    genre: permintaan.genre,
    urutan: permintaan.urutan,
    limit: permintaan.ukuran,
    offset,
  });

  return {
    data: items,
    meta: {
      halaman: permintaan.halaman,
      ukuran: permintaan.ukuran,
      total,
      totalHalaman: Math.ceil(total / permintaan.ukuran),
    },
  };
}

export async function ambilDetailLagu(
  pool: Pool,
  id: number,
): Promise<Lagu | null> {
  return detailLagu(pool, id);
}

export async function ambilDaftarGenre(pool: Pool): Promise<DaftarGenreResponse> {
  return { data: await daftarGenre(pool) };
}

export async function ambilTrialLagu(
  pool: Pool,
  id: number,
): Promise<string | null> {
  const hasil = await trialLagu(pool, id);
  return hasil?.fileTrial ?? null;
}

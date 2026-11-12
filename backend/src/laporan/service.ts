import type { LaporanQuery, LaporanResponse } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { laporanPenjualan } from "./repository.ts";
import { batasHariJakarta } from "./tanggal.ts";

export interface LaporanService {
  laporan(query: LaporanQuery): Promise<LaporanResponse>;
}

export function createLaporanService(pool: Pool): LaporanService {
  return {
    async laporan(query) {
      const { awal, akhir } = batasHariJakarta(query.dari, query.sampai);
      const data = await laporanPenjualan(pool, awal, akhir);
      return {
        dari: query.dari,
        sampai: query.sampai,
        total: data.reduce((jumlah, baris) => jumlah + baris.harga, 0),
        data,
      };
    },
  };
}

import type {
  DaftarGenreResponse,
  DaftarLaguQuery,
  DaftarLaguResponse,
  Lagu,
} from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { buatMetaHalaman } from "../pagination.ts";
import { daftarGenre, daftarLagu, detailLagu, trialLagu } from "./repository.ts";

export interface KatalogService {
  daftarLagu(
    query: DaftarLaguQuery,
    pelangganId?: number,
  ): Promise<DaftarLaguResponse>;
  detailLagu(id: number): Promise<Lagu | null>;
  daftarGenre(): Promise<DaftarGenreResponse>;
  fileTrial(id: number): Promise<string | null>;
}

export function createKatalogService(pool: Pool): KatalogService {
  return {
    async daftarLagu(query, pelangganId) {
      const offset = (query.halaman - 1) * query.ukuran;
      const { items, total } = await daftarLagu(pool, {
        // Parameter pencarian kosong dari query string sama dengan tanpa
        // pencarian, bukan mencari string kosong.
        cari: query.cari === "" ? undefined : query.cari,
        genre: query.genre,
        urutan: query.urutan,
        limit: query.ukuran,
        offset,
        pelangganId,
      });

      return {
        data: items,
        meta: buatMetaHalaman(total, query.halaman, query.ukuran),
      };
    },

    detailLagu(id) {
      return detailLagu(pool, id);
    },

    async daftarGenre() {
      return { data: await daftarGenre(pool) };
    },

    async fileTrial(id) {
      const hasil = await trialLagu(pool, id);
      return hasil?.fileTrial ?? null;
    },
  };
}

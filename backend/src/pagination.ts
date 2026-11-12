import type { MetaHalaman } from "@musicpedia/shared";

/** Metadata paginasi yang sama untuk semua daftar berhalaman di API. */
export function buatMetaHalaman(
  total: number,
  halaman: number,
  ukuran: number,
): MetaHalaman {
  return {
    halaman,
    ukuran,
    total,
    totalHalaman: Math.ceil(total / ukuran),
  };
}

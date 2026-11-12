import type { Lagu } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import {
  KOLOM_LAGU,
  keLagu,
  type BarisLagu,
} from "../katalog/repository.ts";

/**
 * Lagu yang dimiliki Pelanggan: seluruh Lagu pada Item Pembelian dari
 * Pembelian Lunas miliknya. Lagu yang disembunyikan tetap termasuk karena
 * kepemilikan tidak bergantung pada katalog. Satu Lagu hanya muncul sekali
 * meski pernah dibeli lebih dari sekali.
 */
export async function daftarLaguDimiliki(
  pool: Pool,
  pelangganId: number,
): Promise<Lagu[]> {
  const { rows } = await pool.query<BarisLagu>(
    `SELECT ${KOLOM_LAGU}
     FROM lagu l
     JOIN genre g ON g.id = l.genre_id
     JOIN (
       SELECT ip.lagu_id, max(p.dibayar_pada) AS terakhir_dibayar
       FROM item_pembelian ip
       JOIN pembelian p ON p.id = ip.pembelian_id
       WHERE p.status = 'LUNAS' AND p.pelanggan_id = $1
       GROUP BY ip.lagu_id
     ) milik ON milik.lagu_id = l.id
     ORDER BY milik.terakhir_dibayar DESC NULLS LAST, l.judul ASC, l.id ASC`,
    [pelangganId],
  );
  return rows.map(keLagu);
}

export interface BerkasUnduhan {
  judul: string;
  artis: string;
  fileMp3: string;
}

/**
 * Berkas mp3 penuh sebuah Lagu, hanya bila Pelanggan memiliki Lagu itu lewat
 * Pembelian Lunas. Lagu tersembunyi tetap boleh diunduh. Null bila tidak ada
 * kepemilikan atau berkas mp3 belum tercatat.
 */
export async function ambilBerkasDimiliki(
  pool: Pool,
  pelangganId: number,
  laguId: number,
): Promise<BerkasUnduhan | null> {
  const { rows } = await pool.query<{
    judul: string;
    artis: string;
    fileMp3: string | null;
  }>(
    `SELECT l.judul, l.artis, l.file_mp3 AS "fileMp3"
     FROM item_pembelian ip
     JOIN pembelian p ON p.id = ip.pembelian_id
     JOIN lagu l ON l.id = ip.lagu_id
     WHERE p.status = 'LUNAS' AND p.pelanggan_id = $1 AND ip.lagu_id = $2
     LIMIT 1`,
    [pelangganId, laguId],
  );

  const baris = rows[0];
  if (!baris || !baris.fileMp3) return null;
  return { judul: baris.judul, artis: baris.artis, fileMp3: baris.fileMp3 };
}

import type { Lagu } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import type { KepemilikanLagu } from "../domain/kepemilikan.ts";
import {
  KOLOM_LAGU,
  keLagu,
  type BarisLagu,
} from "../katalog/repository.ts";

export interface KeranjangRepository {
  daftar(pelangganId: number): Promise<Lagu[]>;
  tambah(pelangganId: number, laguId: number): Promise<void>;
  hapus(pelangganId: number, laguId: number): Promise<void>;
  buangLaguTersembunyi(pelangganId: number): Promise<void>;
  statusPembelian(
    pelangganId: number,
    laguId: number,
  ): Promise<KepemilikanLagu>;
}

export function createKeranjangRepository(pool: Pool): KeranjangRepository {
  return {
    async daftar(pelangganId) {
      // Lagu yang disembunyikan Admin tidak lagi bisa dibeli, jadi tidak
      // ditampilkan sebagai bagian Keranjang.
      const { rows } = await pool.query<BarisLagu>(
        `SELECT ${KOLOM_LAGU}
         FROM keranjang k
         JOIN lagu l ON l.id = k.lagu_id
         JOIN genre g ON g.id = l.genre_id
         WHERE k.pelanggan_id = $1 AND l.tersembunyi = false
         ORDER BY k.dibuat_pada ASC, l.id ASC`,
        [pelangganId],
      );
      return rows.map(keLagu);
    },

    async tambah(pelangganId, laguId) {
      await pool.query(
        `INSERT INTO keranjang (pelanggan_id, lagu_id)
         VALUES ($1, $2)`,
        [pelangganId, laguId],
      );
    },

    async hapus(pelangganId, laguId) {
      await pool.query(
        `DELETE FROM keranjang
         WHERE pelanggan_id = $1 AND lagu_id = $2`,
        [pelangganId, laguId],
      );
    },

    async buangLaguTersembunyi(pelangganId) {
      // Baris Keranjang untuk Lagu tersembunyi tidak boleh menggantung: ia
      // tidak tampil di UI sehingga Pelanggan tidak bisa menghapusnya sendiri.
      await pool.query(
        `DELETE FROM keranjang k
         USING lagu l
         WHERE l.id = k.lagu_id
           AND k.pelanggan_id = $1
           AND l.tersembunyi = true`,
        [pelangganId],
      );
    },

    async statusPembelian(pelangganId, laguId) {
      const { rows } = await pool.query<{
        lunas: boolean | null;
        menunggu: boolean | null;
      }>(
        `SELECT bool_or(p.status = 'LUNAS') AS lunas,
                bool_or(p.status = 'MENUNGGU_PEMBAYARAN') AS menunggu
         FROM item_pembelian ip
         JOIN pembelian p ON p.id = ip.pembelian_id
         WHERE p.pelanggan_id = $1 AND ip.lagu_id = $2`,
        [pelangganId, laguId],
      );

      return {
        lunas: rows[0]?.lunas === true,
        menunggu: rows[0]?.menunggu === true,
      };
    },
  };
}

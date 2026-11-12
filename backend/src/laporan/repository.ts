import type { BarisLaporan } from "@musicpedia/shared";
import type { Pool } from "../db.ts";

interface BarisLaporanDb {
  pembelian_id: number;
  dibayar_pada: Date;
  judul: string;
  artis: string;
  pelanggan_nama: string;
  pelanggan_email: string;
  harga: number;
}

export async function laporanPenjualan(
  pool: Pool,
  awal: Date,
  akhir: Date,
): Promise<BarisLaporan[]> {
  const { rows } = await pool.query<BarisLaporanDb>(
    `SELECT p.id AS pembelian_id,
            p.dibayar_pada,
            l.judul,
            l.artis,
            a.nama AS pelanggan_nama,
            a.email AS pelanggan_email,
            ip.harga
     FROM item_pembelian ip
     JOIN pembelian p ON p.id = ip.pembelian_id
     JOIN lagu l ON l.id = ip.lagu_id
     JOIN akun a ON a.id = p.pelanggan_id
     WHERE p.status = 'LUNAS'
       AND p.dibayar_pada >= $1
       AND p.dibayar_pada < $2
     ORDER BY p.dibayar_pada ASC, p.id ASC, ip.lagu_id ASC`,
    [awal, akhir],
  );

  return rows.map((baris) => ({
    pembelianId: baris.pembelian_id,
    // Waktu bayar disimpan sebagai timestamptz; kirim ISO agar klien yang
    // memformat ke Asia/Jakarta tidak bergantung pada zona waktu server.
    tanggalBayar: baris.dibayar_pada.toISOString(),
    judul: baris.judul,
    artis: baris.artis,
    pelanggan: baris.pelanggan_nama || baris.pelanggan_email,
    harga: baris.harga,
    // Satu Item Pembelian memuat tepat satu Lagu, sehingga total baris
    // sama dengan harga Lagu itu saat checkout.
    total: baris.harga,
  }));
}

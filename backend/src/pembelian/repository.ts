import type {
  ItemPembelian,
  Pembelian,
  StatusPembelian,
} from "@musicpedia/shared";
import type { Db, Pool } from "../db.ts";

export interface PelangganTerkunci {
  id: number;
  nama: string;
  email: string;
}

export interface LaguCheckout {
  laguId: number;
  judul: string;
  artis: string;
  harga: number;
  tersembunyi: boolean;
}

export interface StatusKepemilikan {
  laguId: number;
  lunas: boolean;
  menunggu: boolean;
}

/** Mengunci baris Pelanggan sehingga dua checkout tidak berjalan bersamaan. */
export async function kunciPelanggan(
  db: Db,
  pelangganId: number,
): Promise<PelangganTerkunci | null> {
  const { rows } = await db.query<PelangganTerkunci>(
    "SELECT id, nama, email FROM akun WHERE id = $1 FOR UPDATE",
    [pelangganId],
  );
  return rows[0] ?? null;
}

export async function laguDiKeranjang(
  db: Db,
  pelangganId: number,
): Promise<LaguCheckout[]> {
  const { rows } = await db.query<{
    lagu_id: number;
    judul: string;
    artis: string;
    harga: number;
    tersembunyi: boolean;
  }>(
    `SELECT l.id AS lagu_id, l.judul, l.artis, l.harga, l.tersembunyi
     FROM keranjang k
     JOIN lagu l ON l.id = k.lagu_id
     WHERE k.pelanggan_id = $1
     ORDER BY k.dibuat_pada ASC, l.id ASC`,
    [pelangganId],
  );

  return rows.map((baris) => ({
    laguId: baris.lagu_id,
    judul: baris.judul,
    artis: baris.artis,
    harga: baris.harga,
    tersembunyi: baris.tersembunyi,
  }));
}

export async function statusKepemilikan(
  db: Db,
  pelangganId: number,
  laguIds: number[],
): Promise<StatusKepemilikan[]> {
  if (laguIds.length === 0) return [];
  const { rows } = await db.query<{
    lagu_id: number;
    lunas: boolean;
    menunggu: boolean;
  }>(
    `SELECT ip.lagu_id,
            bool_or(p.status = 'LUNAS') AS lunas,
            bool_or(p.status = 'MENUNGGU_PEMBAYARAN') AS menunggu
     FROM item_pembelian ip
     JOIN pembelian p ON p.id = ip.pembelian_id
     WHERE p.pelanggan_id = $1 AND ip.lagu_id = ANY($2::integer[])
     GROUP BY ip.lagu_id`,
    [pelangganId, laguIds],
  );

  return rows.map((baris) => ({
    laguId: baris.lagu_id,
    lunas: baris.lunas,
    menunggu: baris.menunggu,
  }));
}

export interface DataPembelianBaru {
  pelangganId: number;
  total: number;
  kodeOrder: string;
}

export async function buatPembelian(
  db: Db,
  data: DataPembelianBaru,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO pembelian (pelanggan_id, status, total, kode_order)
     VALUES ($1, 'MENUNGGU_PEMBAYARAN', $2, $3)
     RETURNING id`,
    [data.pelangganId, data.total, data.kodeOrder],
  );
  return rows[0]!.id;
}

export async function tambahItemPembelian(
  db: Db,
  pembelianId: number,
  item: Array<{ laguId: number; harga: number }>,
): Promise<void> {
  for (const { laguId, harga } of item) {
    await db.query(
      `INSERT INTO item_pembelian (pembelian_id, lagu_id, harga)
       VALUES ($1, $2, $3)`,
      [pembelianId, laguId, harga],
    );
  }
}

export async function kosongkanKeranjang(
  db: Db,
  pelangganId: number,
): Promise<void> {
  await db.query("DELETE FROM keranjang WHERE pelanggan_id = $1", [
    pelangganId,
  ]);
}

export async function simpanTokenSnap(
  db: Db,
  pembelianId: number,
  token: string,
): Promise<void> {
  await db.query("UPDATE pembelian SET token_snap = $2 WHERE id = $1", [
    pembelianId,
    token,
  ]);
}

interface BarisRiwayat {
  id: number;
  kode_order: string;
  status: StatusPembelian;
  total: number;
  dibuat_pada: Date;
  dibayar_pada: Date | null;
  kedaluwarsa_pada: Date;
  token_snap: string | null;
  lagu_id: number;
  judul: string;
  artis: string;
  harga: number;
}

const KOLOM_RIWAYAT = `
  p.id,
  p.kode_order,
  p.status,
  p.total,
  p.dibuat_pada,
  p.dibayar_pada,
  p.kedaluwarsa_pada,
  p.token_snap,
  ip.lagu_id,
  l.judul,
  l.artis,
  ip.harga
`;

function kePembelian(baris: BarisRiwayat[]): Pembelian {
  const pertama = baris[0]!;
  const itemPembelian: ItemPembelian[] = baris.map((item) => ({
    laguId: item.lagu_id,
    judul: item.judul,
    artis: item.artis,
    harga: item.harga,
  }));

  return {
    id: pertama.id,
    kodeOrder: pertama.kode_order,
    status: pertama.status,
    total: pertama.total,
    dibuatPada: pertama.dibuat_pada.toISOString(),
    dibayarPada: pertama.dibayar_pada?.toISOString() ?? null,
    kedaluwarsaPada: pertama.kedaluwarsa_pada.toISOString(),
    itemPembelian,
  };
}

export async function daftarPembelian(
  pool: Pool,
  pelangganId: number,
): Promise<Pembelian[]> {
  const { rows } = await pool.query<BarisRiwayat>(
    `SELECT ${KOLOM_RIWAYAT}
     FROM pembelian p
     JOIN item_pembelian ip ON ip.pembelian_id = p.id
     JOIN lagu l ON l.id = ip.lagu_id
     WHERE p.pelanggan_id = $1
     ORDER BY p.dibuat_pada DESC, p.id DESC, ip.lagu_id ASC`,
    [pelangganId],
  );

  const perPembelian = new Map<number, BarisRiwayat[]>();
  for (const baris of rows) {
    const kumpulan = perPembelian.get(baris.id);
    if (kumpulan) {
      kumpulan.push(baris);
    } else {
      perPembelian.set(baris.id, [baris]);
    }
  }

  return [...perPembelian.values()].map(kePembelian);
}

export interface PembelianDenganToken {
  pembelian: Pembelian;
  tokenSnap: string | null;
}

export async function ambilPembelianMilik(
  pool: Pool,
  pelangganId: number,
  id: number,
): Promise<PembelianDenganToken | null> {
  const { rows } = await pool.query<BarisRiwayat>(
    `SELECT ${KOLOM_RIWAYAT}
     FROM pembelian p
     JOIN item_pembelian ip ON ip.pembelian_id = p.id
     JOIN lagu l ON l.id = ip.lagu_id
     WHERE p.pelanggan_id = $1 AND p.id = $2
     ORDER BY ip.lagu_id ASC`,
    [pelangganId, id],
  );

  if (rows.length === 0) return null;
  return {
    pembelian: kePembelian(rows),
    tokenSnap: rows[0]!.token_snap,
  };
}

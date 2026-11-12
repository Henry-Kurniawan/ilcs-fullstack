import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Agent } from "supertest";
import { errorResponseSchema, keranjangResponseSchema } from "@musicpedia/shared";
import type { StatusPembelian } from "@musicpedia/shared";
import { sapuPembelianKedaluwarsa } from "../src/pembelian/penyapu.ts";
import { transisiPembelian } from "../src/pembelian/repository.ts";
import { withTransaction } from "../src/db.ts";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

afterAll(() => ctx.close());

const kredensial = { email: "siti@example.com", password: "rahasia123" };
const WAKTU_CHECKOUT = new Date("2026-01-01T00:00:00.000Z");

beforeEach(async () => {
  await ctx.reset();
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
});

async function buatPelanggan(email = kredensial.email): Promise<void> {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: kredensial.password })
    .expect(201);
}

async function masuk(email = kredensial.email): Promise<Agent> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email, password: kredensial.password })
    .expect(200);
  return agent;
}

async function buatGenre(nama = "Pop"): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO genre (nama) VALUES ($1) RETURNING id",
    [nama],
  );
  return rows[0]!.id;
}

async function buatLagu(genreId: number, judul = "Cahaya Pagi"): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lagu
       (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga)
     VALUES ($1, 'Artis Uji', $2, 'Pencipta Uji', 'Label Uji', '2024-01-01', 25000)
     RETURNING id`,
    [judul, genreId],
  );
  return rows[0]!.id;
}

/**
 * Mencatat Pembelian yang checkout-nya terjadi pada `dibuatPada`, dengan masa
 * berlaku 24 jam seperti yang dibuat service checkout.
 */
async function catatPembelian(input: {
  email?: string;
  laguId: number;
  status: StatusPembelian;
  dibuatPada: Date;
}): Promise<number> {
  const { rows: akun } = await pool.query<{ id: number }>(
    "SELECT id FROM akun WHERE email = $1",
    [input.email ?? kredensial.email],
  );
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO pembelian (pelanggan_id, status, total, dibuat_pada, kedaluwarsa_pada)
     VALUES ($1, $2, 25000, $3, $3::timestamptz + interval '24 hours')
     RETURNING id`,
    [akun[0]!.id, input.status, input.dibuatPada],
  );
  const pembelianId = rows[0]!.id;
  await pool.query(
    `INSERT INTO item_pembelian (pembelian_id, lagu_id, harga)
     VALUES ($1, $2, 25000)`,
    [pembelianId, input.laguId],
  );
  return pembelianId;
}

async function statusPembelian(pembelianId: number): Promise<StatusPembelian> {
  const { rows } = await pool.query<{ status: StatusPembelian }>(
    "SELECT status FROM pembelian WHERE id = $1",
    [pembelianId],
  );
  return rows[0]!.status;
}

async function dibayarPada(pembelianId: number): Promise<Date | null> {
  const { rows } = await pool.query<{ dibayar_pada: Date | null }>(
    "SELECT dibayar_pada FROM pembelian WHERE id = $1",
    [pembelianId],
  );
  return rows[0]!.dibayar_pada;
}

function setelah(jam: number, menit = 0): Date {
  return new Date(
    WAKTU_CHECKOUT.getTime() + jam * 60 * 60 * 1000 + menit * 60 * 1000,
  );
}

describe("Penyapu Pembelian kedaluwarsa", () => {
  it("membiarkan Pembelian Menunggu Pembayaran yang belum 24 jam", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu(genreId);
    const pembelianId = await catatPembelian({
      laguId,
      status: "MENUNGGU_PEMBAYARAN",
      dibuatPada: WAKTU_CHECKOUT,
    });

    const jumlah = await sapuPembelianKedaluwarsa(pool, setelah(23, 59));

    expect(jumlah).toBe(0);
    expect(await statusPembelian(pembelianId)).toBe("MENUNGGU_PEMBAYARAN");
  });

  it("menandai Gagal Pembelian Menunggu Pembayaran yang sudah 24 jam", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu(genreId);
    const pembelianId = await catatPembelian({
      laguId,
      status: "MENUNGGU_PEMBAYARAN",
      dibuatPada: WAKTU_CHECKOUT,
    });

    const jumlah = await sapuPembelianKedaluwarsa(pool, setelah(24));

    expect(jumlah).toBe(1);
    expect(await statusPembelian(pembelianId)).toBe("GAGAL");
  });

  it("tidak menyentuh Pembelian Lunas maupun yang sudah Gagal", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguLunas = await buatLagu(genreId, "Sudah Lunas");
    const laguGagal = await buatLagu(genreId, "Sudah Gagal");
    const lunasId = await catatPembelian({
      laguId: laguLunas,
      status: "LUNAS",
      dibuatPada: WAKTU_CHECKOUT,
    });
    const gagalId = await catatPembelian({
      laguId: laguGagal,
      status: "GAGAL",
      dibuatPada: WAKTU_CHECKOUT,
    });

    const jumlah = await sapuPembelianKedaluwarsa(pool, setelah(48));

    expect(jumlah).toBe(0);
    expect(await statusPembelian(lunasId)).toBe("LUNAS");
    expect(await statusPembelian(gagalId)).toBe("GAGAL");
  });
});

describe("Lagu dari Pembelian Gagal", () => {
  it("bisa dimasukkan lagi ke Keranjang setelah Pembelian menjadi Gagal", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu(genreId);
    await catatPembelian({
      laguId,
      status: "MENUNGGU_PEMBAYARAN",
      dibuatPada: WAKTU_CHECKOUT,
    });
    const agent = await masuk();

    const sebelum = await agent
      .post("/api/keranjang")
      .send({ laguId })
      .expect(409);
    expect(errorResponseSchema.parse(sebelum.body).code).toBe(
      "LAGU_MENUNGGU_PEMBAYARAN",
    );

    expect(await sapuPembelianKedaluwarsa(pool, setelah(24))).toBe(1);

    const sesudah = await agent
      .post("/api/keranjang")
      .send({ laguId })
      .expect(201);
    const keranjang = keranjangResponseSchema.parse(sesudah.body).data;
    expect(keranjang.items.map((lagu) => lagu.id)).toEqual([laguId]);
  });
});

describe("Notifikasi Midtrans terlambat", () => {
  it("tidak membuka lagi Pembelian yang sudah Gagal", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu(genreId);
    const pembelianId = await catatPembelian({
      laguId,
      status: "MENUNGGU_PEMBAYARAN",
      dibuatPada: WAKTU_CHECKOUT,
    });
    await sapuPembelianKedaluwarsa(pool, setelah(24));
    expect(await statusPembelian(pembelianId)).toBe("GAGAL");

    // Notifikasi settlement yang datang terlambat tetap mencoba transisi,
    // tetapi hanya berlaku dari Menunggu Pembayaran.
    const berubah = await withTransaction(pool, (db) =>
      transisiPembelian(db, pembelianId, "LUNAS", setelah(25)),
    );

    expect(berubah).toBe(false);
    expect(await statusPembelian(pembelianId)).toBe("GAGAL");
    expect(await dibayarPada(pembelianId)).toBeNull();
  });
});

import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { errorResponseSchema, keranjangResponseSchema } from "@musicpedia/shared";
import type { Agent } from "supertest";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

afterAll(() => ctx.close());

const kredensial = { email: "siti@example.com", password: "rahasia123" };

beforeEach(async () => {
  await ctx.reset();
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
});

async function buatGenre(nama: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO genre (nama) VALUES ($1) RETURNING id",
    [nama],
  );
  return rows[0]!.id;
}

async function buatLagu(input: {
  judul: string;
  genreId: number;
  artis?: string;
  harga?: number;
  tersembunyi?: boolean;
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lagu
       (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga, tersembunyi)
     VALUES ($1, $2, $3, 'Pencipta Uji', 'Label Uji', '2024-01-01', $4, $5)
     RETURNING id`,
    [
      input.judul,
      input.artis ?? "Artis Uji",
      input.genreId,
      input.harga ?? 15000,
      input.tersembunyi ?? false,
    ],
  );
  return rows[0]!.id;
}

async function masuk(email = kredensial.email): Promise<Agent> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email, password: kredensial.password })
    .expect(200);
  return agent;
}

async function buatPelanggan(email = kredensial.email): Promise<void> {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: kredensial.password })
    .expect(201);
}

// Tabel pembelian dan item_pembelian berasal dari migrasi; helper ini mencatat
// Pembelian langsung agar aturan Keranjang bisa diuji tanpa alur checkout.
async function catatPembelian(
  email: string,
  laguId: number,
  status: "MENUNGGU_PEMBAYARAN" | "LUNAS" | "GAGAL",
): Promise<void> {
  const { rows: akun } = await pool.query<{ id: number }>(
    "SELECT id FROM akun WHERE email = $1",
    [email],
  );
  const { rows: pembelian } = await pool.query<{ id: number }>(
    `INSERT INTO pembelian (pelanggan_id, status, total)
     VALUES ($1, $2, 0)
     RETURNING id`,
    [akun[0]!.id, status],
  );
  await pool.query(
    `INSERT INTO item_pembelian (pembelian_id, lagu_id, harga)
     VALUES ($1, $2, 0)`,
    [pembelian[0]!.id, laguId],
  );
}

describe("Keranjang Pengunjung", () => {
  it("menolak Pengunjung tanpa sesi pada lihat, tambah, dan hapus", async () => {
    const lihat = await request(app).get("/api/keranjang").expect(401);
    expect(errorResponseSchema.parse(lihat.body).code).toBe("BELUM_MASUK");

    const tambah = await request(app)
      .post("/api/keranjang")
      .send({ laguId: 1 })
      .expect(401);
    expect(errorResponseSchema.parse(tambah.body).code).toBe("BELUM_MASUK");

    const hapus = await request(app).delete("/api/keranjang/1").expect(401);
    expect(errorResponseSchema.parse(hapus.body).code).toBe("BELUM_MASUK");
  });
});

describe("Menambah Lagu ke Keranjang", () => {
  it("menyimpan Lagu dan menghitung total dari harga saat ini", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const laguId = await buatLagu({
      judul: "Cahaya Pagi",
      genreId: pop,
      harga: 25000,
    });
    const agent = await masuk();

    const tambah = await agent
      .post("/api/keranjang")
      .send({ laguId })
      .expect(201);
    const setelahTambah = keranjangResponseSchema.parse(tambah.body).data;
    expect(setelahTambah.items.map((lagu) => lagu.id)).toEqual([laguId]);
    expect(setelahTambah.items[0]!.judul).toBe("Cahaya Pagi");
    expect(setelahTambah.total).toBe(25000);
    expect(setelahTambah.jumlah).toBe(1);

    const lihat = await agent.get("/api/keranjang").expect(200);
    expect(keranjangResponseSchema.parse(lihat.body).data).toEqual(
      setelahTambah,
    );
  });

  it("menolak Lagu yang sama masuk ke Keranjang dua kali", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const laguId = await buatLagu({ judul: "Cahaya Pagi", genreId: pop });
    const agent = await masuk();
    await agent.post("/api/keranjang").send({ laguId }).expect(201);

    const ulang = await agent
      .post("/api/keranjang")
      .send({ laguId })
      .expect(409);
    expect(errorResponseSchema.parse(ulang.body).code).toBe(
      "SUDAH_DI_KERANJANG",
    );

    const lihat = await agent.get("/api/keranjang").expect(200);
    expect(keranjangResponseSchema.parse(lihat.body).data.jumlah).toBe(1);
  });

  it("menolak Lagu tersembunyi dan Lagu yang tidak ada", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const tersembunyi = await buatLagu({
      judul: "Lagu Rahasia",
      genreId: pop,
      tersembunyi: true,
    });
    const agent = await masuk();

    const resTersembunyi = await agent
      .post("/api/keranjang")
      .send({ laguId: tersembunyi })
      .expect(404);
    expect(errorResponseSchema.parse(resTersembunyi.body).code).toBe(
      "TIDAK_DITEMUKAN",
    );

    const resTidakAda = await agent
      .post("/api/keranjang")
      .send({ laguId: 999999 })
      .expect(404);
    expect(errorResponseSchema.parse(resTidakAda.body).code).toBe(
      "TIDAK_DITEMUKAN",
    );

    const lihat = await agent.get("/api/keranjang").expect(200);
    expect(keranjangResponseSchema.parse(lihat.body).data.jumlah).toBe(0);
  });
});

describe("Menghapus Lagu dari Keranjang", () => {
  it("menghapus Lagu dan menghitung ulang total", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const pertama = await buatLagu({
      judul: "Lagu Pertama",
      genreId: pop,
      harga: 10000,
    });
    const kedua = await buatLagu({
      judul: "Lagu Kedua",
      genreId: pop,
      harga: 15000,
    });
    const agent = await masuk();
    await agent.post("/api/keranjang").send({ laguId: pertama }).expect(201);
    const dua = await agent
      .post("/api/keranjang")
      .send({ laguId: kedua })
      .expect(201);
    expect(keranjangResponseSchema.parse(dua.body).data.total).toBe(25000);

    const hapus = await agent.delete(`/api/keranjang/${pertama}`).expect(200);
    const data = keranjangResponseSchema.parse(hapus.body).data;
    expect(data.items.map((lagu) => lagu.id)).toEqual([kedua]);
    expect(data.total).toBe(15000);
    expect(data.jumlah).toBe(1);

    const ulang = await agent.delete(`/api/keranjang/${pertama}`).expect(200);
    expect(keranjangResponseSchema.parse(ulang.body).data.jumlah).toBe(1);
  });
});

describe("Total Keranjang", () => {
  it("memakai harga Lagu saat ini, bukan harga saat ditambahkan", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const laguId = await buatLagu({
      judul: "Harga Berubah",
      genreId: pop,
      harga: 25000,
    });
    const agent = await masuk();
    await agent.post("/api/keranjang").send({ laguId }).expect(201);

    await pool.query("UPDATE lagu SET harga = $1 WHERE id = $2", [
      31000,
      laguId,
    ]);

    const res = await agent.get("/api/keranjang").expect(200);
    const data = keranjangResponseSchema.parse(res.body).data;
    expect(data.items[0]!.harga).toBe(31000);
    expect(data.total).toBe(31000);
  });
});

describe("Keranjang lintas sesi dan perangkat", () => {
  it("menampilkan Keranjang yang sama setelah masuk dari sesi lain", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const laguId = await buatLagu({
      judul: "Cahaya Pagi",
      genreId: pop,
      harga: 25000,
    });

    const perangkatPertama = await masuk();
    await perangkatPertama
      .post("/api/keranjang")
      .send({ laguId })
      .expect(201);

    const perangkatKedua = await masuk();
    const res = await perangkatKedua.get("/api/keranjang").expect(200);
    const data = keranjangResponseSchema.parse(res.body).data;

    expect(data.items.map((lagu) => lagu.id)).toEqual([laguId]);
    expect(data.total).toBe(25000);
  });

  it("tidak mencampur Keranjang antar Pelanggan", async () => {
    await buatPelanggan("siti@example.com");
    await buatPelanggan("budi@example.com");
    const pop = await buatGenre("Pop");
    const laguId = await buatLagu({ judul: "Cahaya Pagi", genreId: pop });

    const siti = await masuk("siti@example.com");
    await siti.post("/api/keranjang").send({ laguId }).expect(201);

    const budi = await masuk("budi@example.com");
    const res = await budi.get("/api/keranjang").expect(200);
    expect(keranjangResponseSchema.parse(res.body).data.jumlah).toBe(0);
  });
});

describe("Aturan kepemilikan Lagu di Keranjang", () => {
  it("menolak Lagu yang sudah dimiliki lewat Pembelian Lunas", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const laguId = await buatLagu({ judul: "Sudah Dibeli", genreId: pop });
    await catatPembelian(kredensial.email, laguId, "LUNAS");
    const agent = await masuk();

    const res = await agent
      .post("/api/keranjang")
      .send({ laguId })
      .expect(409);
    expect(errorResponseSchema.parse(res.body).code).toBe("LAGU_SUDAH_DIMILIKI");

    const lihat = await agent.get("/api/keranjang").expect(200);
    expect(keranjangResponseSchema.parse(lihat.body).data.jumlah).toBe(0);
  });

  it("menolak Lagu yang sedang Menunggu Pembayaran", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const laguId = await buatLagu({ judul: "Sedang Dibayar", genreId: pop });
    await catatPembelian(kredensial.email, laguId, "MENUNGGU_PEMBAYARAN");
    const agent = await masuk();

    const res = await agent
      .post("/api/keranjang")
      .send({ laguId })
      .expect(409);
    expect(errorResponseSchema.parse(res.body).code).toBe(
      "LAGU_MENUNGGU_PEMBAYARAN",
    );
  });

  it("mengizinkan Lagu dari Pembelian Gagal dimasukkan lagi", async () => {
    await buatPelanggan();
    const pop = await buatGenre("Pop");
    const laguId = await buatLagu({ judul: "Pembelian Gagal", genreId: pop });
    await catatPembelian(kredensial.email, laguId, "GAGAL");
    const agent = await masuk();

    const res = await agent
      .post("/api/keranjang")
      .send({ laguId })
      .expect(201);
    expect(keranjangResponseSchema.parse(res.body).data.jumlah).toBe(1);
  });
});

describe("Batasan akses dan validasi Keranjang", () => {
  it("menolak Admin memakai Keranjang", async () => {
    await buatPelanggan();
    await pool.query("UPDATE akun SET peran = 'ADMIN' WHERE email = $1", [
      kredensial.email,
    ]);
    const agent = await masuk();

    const res = await agent.get("/api/keranjang").expect(403);
    expect(errorResponseSchema.parse(res.body).code).toBe("AKSES_DITOLAK");
  });

  it("menolak badan tambah Keranjang yang tidak valid", async () => {
    await buatPelanggan();
    const agent = await masuk();

    const tanpaLagu = await agent.post("/api/keranjang").send({}).expect(400);
    expect(errorResponseSchema.parse(tanpaLagu.body).code).toBe("VALIDASI");

    const idSalah = await agent
      .post("/api/keranjang")
      .send({ laguId: "bukan-angka" })
      .expect(400);
    expect(errorResponseSchema.parse(idSalah.body).code).toBe("VALIDASI");
  });

  it("menolak id Lagu yang tidak valid saat menghapus", async () => {
    await buatPelanggan();
    const agent = await masuk();

    const res = await agent.delete("/api/keranjang/bukan-angka").expect(400);
    expect(errorResponseSchema.parse(res.body).code).toBe("VALIDASI");
  });
});

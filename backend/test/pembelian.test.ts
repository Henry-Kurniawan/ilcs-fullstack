import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarPembelianResponseSchema,
  errorResponseSchema,
  keranjangResponseSchema,
  konfigurasiResponseSchema,
  pembelianCheckoutResponseSchema,
} from "@musicpedia/shared";
import type { Agent } from "supertest";
import { seedAdmin } from "../src/seed.ts";
import { buatGatewayPalsu } from "./payment-gateway-fake.ts";
import { createTestContext } from "./support.ts";

process.env.MIDTRANS_SERVER_KEY = "server-rahasia-tes";
process.env.MIDTRANS_CLIENT_KEY = "client-publik-tes";

const gatewayPalsu = buatGatewayPalsu();
const ctx = createTestContext({ paymentGateway: gatewayPalsu.gateway });
const { app, pool } = ctx;

afterAll(() => ctx.close());

const kredensial = { email: "siti@example.com", password: "rahasia123" };
const admin = { email: "admin@musikapedia.id", password: "rahasia-admin" };

beforeEach(async () => {
  await ctx.reset();
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
  await seedAdmin(pool, admin);
  gatewayPalsu.permintaan.length = 0;
  gatewayPalsu.aturGagal(false);
  gatewayPalsu.aturStatus("pending");
});

async function buatGenre(nama = "Pop"): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO genre (nama) VALUES ($1) RETURNING id",
    [nama],
  );
  return rows[0]!.id;
}

async function buatLagu(input: {
  judul?: string;
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
      input.judul ?? "Cahaya Pagi",
      input.artis ?? "Artis Uji",
      input.genreId,
      input.harga ?? 25000,
      input.tersembunyi ?? false,
    ],
  );
  return rows[0]!.id;
}

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

async function isiKeranjang(agent: Agent, laguId: number): Promise<void> {
  await agent.post("/api/keranjang").send({ laguId }).expect(201);
}

async function catatPembelian(
  email: string,
  laguId: number,
  status: "MENUNGGU_PEMBAYARAN" | "LUNAS" | "GAGAL",
): Promise<number> {
  const { rows: akun } = await pool.query<{ id: number }>(
    "SELECT id FROM akun WHERE email = $1",
    [email],
  );
  const { rows: pembelian } = await pool.query<{ id: number }>(
    `INSERT INTO pembelian (pelanggan_id, status, total)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [akun[0]!.id, status, 25000],
  );
  await pool.query(
    `INSERT INTO item_pembelian (pembelian_id, lagu_id, harga)
     VALUES ($1, $2, 25000)`,
    [pembelian[0]!.id, laguId],
  );
  return pembelian[0]!.id;
}

async function masukAdmin(): Promise<Agent> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(admin).expect(200);
  return agent;
}

async function tambahKeKeranjangLangsung(
  email: string,
  laguId: number,
): Promise<void> {
  const { rows } = await pool.query<{ id: number }>(
    "SELECT id FROM akun WHERE email = $1",
    [email],
  );
  await pool.query(
    "INSERT INTO keranjang (pelanggan_id, lagu_id) VALUES ($1, $2)",
    [rows[0]!.id, laguId],
  );
}

describe("Checkout Keranjang", () => {
  it("membuat satu Pembelian Menunggu Pembayaran dan mengosongkan Keranjang", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu({ genreId, harga: 25000 });
    const agent = await masuk();
    await isiKeranjang(agent, laguId);

    const res = await agent.post("/api/pembelian").expect(201);
    const data = pembelianCheckoutResponseSchema.parse(res.body).data;

    expect(data.status).toBe("MENUNGGU_PEMBAYARAN");
    expect(data.total).toBe(25000);
    expect(data.kodeOrder).toMatch(/^MP-/);
    expect(data.dibayarPada).toBeNull();
    expect(data.tokenSnap).toBe(`snap-${data.kodeOrder}`);
    expect(data.itemPembelian).toEqual([
      {
        laguId,
        judul: "Cahaya Pagi",
        artis: "Artis Uji",
        harga: 25000,
      },
    ]);

    const keranjang = keranjangResponseSchema.parse(
      (await agent.get("/api/keranjang").expect(200)).body,
    ).data;
    expect(keranjang.jumlah).toBe(0);

    const riwayat = daftarPembelianResponseSchema.parse(
      (await agent.get("/api/pembelian").expect(200)).body,
    ).data;
    expect(riwayat.map((pembelian) => pembelian.id)).toEqual([data.id]);
  });
});

describe("Aturan checkout", () => {
  it("menolak checkout Keranjang yang kosong", async () => {
    await buatPelanggan();
    const agent = await masuk();

    const res = await agent.post("/api/pembelian").expect(409);
    expect(errorResponseSchema.parse(res.body).code).toBe("KERANJANG_KOSONG");
    expect(gatewayPalsu.permintaan).toHaveLength(0);
  });

  it("menolak Lagu yang sudah dimiliki atau sedang Menunggu Pembayaran", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const dimiliki = await buatLagu({ genreId, judul: "Sudah Dibeli" });
    const menunggu = await buatLagu({ genreId, judul: "Sedang Dibayar" });
    await catatPembelian(kredensial.email, dimiliki, "LUNAS");
    await catatPembelian(kredensial.email, menunggu, "MENUNGGU_PEMBAYARAN");
    const agent = await masuk();

    await tambahKeKeranjangLangsung(kredensial.email, dimiliki);
    const resDimiliki = await agent.post("/api/pembelian").expect(409);
    expect(errorResponseSchema.parse(resDimiliki.body).code).toBe(
      "LAGU_SUDAH_DIMILIKI",
    );

    await pool.query("DELETE FROM keranjang");
    await tambahKeKeranjangLangsung(kredensial.email, menunggu);
    const resMenunggu = await agent.post("/api/pembelian").expect(409);
    expect(errorResponseSchema.parse(resMenunggu.body).code).toBe(
      "LAGU_MENUNGGU_PEMBAYARAN",
    );
  });

  it("membuang Lagu tersembunyi dari Keranjang lalu checkout sisanya", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const disembunyikan = await buatLagu({
      genreId,
      judul: "Lagu Disembunyikan",
      harga: 25000,
    });
    const tersisa = await buatLagu({
      genreId,
      judul: "Lagu Tersisa",
      harga: 30000,
    });
    const agent = await masuk();
    await isiKeranjang(agent, disembunyikan);
    await isiKeranjang(agent, tersisa);

    const adminAgent = await masukAdmin();
    await adminAgent
      .patch(`/api/admin/lagu/${disembunyikan}/tersembunyi`)
      .send({ tersembunyi: true })
      .expect(200);

    const keranjang = keranjangResponseSchema.parse(
      (await agent.get("/api/keranjang").expect(200)).body,
    ).data;
    expect(keranjang.items.map((lagu) => lagu.id)).toEqual([tersisa]);
    expect(keranjang.total).toBe(30000);

    const res = await agent.post("/api/pembelian").expect(201);
    const data = pembelianCheckoutResponseSchema.parse(res.body).data;
    expect(data.itemPembelian.map((item) => item.laguId)).toEqual([tersisa]);
    expect(data.total).toBe(30000);
  });

  it("menjawab Keranjang kosong bila semua Lagu disembunyikan Admin", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu({ genreId });
    const agent = await masuk();
    await isiKeranjang(agent, laguId);
    await pool.query("UPDATE lagu SET tersembunyi = true WHERE id = $1", [
      laguId,
    ]);

    // Checkout langsung tanpa membaca Keranjang lebih dulu: pembersihan juga
    // terjadi di dalam checkout, bukan hanya saat Keranjang dibaca.
    const res = await agent.post("/api/pembelian").expect(409);
    expect(errorResponseSchema.parse(res.body).code).toBe("KERANJANG_KOSONG");
    expect(gatewayPalsu.permintaan).toHaveLength(0);

    const keranjang = keranjangResponseSchema.parse(
      (await agent.get("/api/keranjang").expect(200)).body,
    ).data;
    expect(keranjang.jumlah).toBe(0);
  });

  it("membatalkan Pembelian bila Payment Gateway gagal", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu({ genreId });
    const agent = await masuk();
    await isiKeranjang(agent, laguId);
    gatewayPalsu.aturGagal(true);

    const res = await agent.post("/api/pembelian").expect(502);
    expect(errorResponseSchema.parse(res.body).code).toBe(
      "PAYMENT_GATEWAY_GAGAL",
    );

    const keranjang = keranjangResponseSchema.parse(
      (await agent.get("/api/keranjang").expect(200)).body,
    ).data;
    expect(keranjang.items.map((lagu) => lagu.id)).toEqual([laguId]);

    const riwayat = daftarPembelianResponseSchema.parse(
      (await agent.get("/api/pembelian").expect(200)).body,
    ).data;
    expect(riwayat).toEqual([]);
  });
});

describe("Checkout bersamaan", () => {
  it("menghasilkan paling banyak satu Pembelian Menunggu Pembayaran", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu({ genreId });
    const tabPertama = await masuk();
    const tabKedua = await masuk();
    await isiKeranjang(tabPertama, laguId);

    const [hasilPertama, hasilKedua] = await Promise.all([
      tabPertama.post("/api/pembelian"),
      tabKedua.post("/api/pembelian"),
    ]);

    expect([hasilPertama.status, hasilKedua.status].sort()).toEqual([
      201, 409,
    ]);

    const riwayat = daftarPembelianResponseSchema.parse(
      (await tabPertama.get("/api/pembelian").expect(200)).body,
    ).data;
    expect(
      riwayat.filter((pembelian) => pembelian.status === "MENUNGGU_PEMBAYARAN"),
    ).toHaveLength(1);
    expect(gatewayPalsu.permintaan).toHaveLength(1);
  });
});

describe("Harga Item Pembelian", () => {
  it("tidak ikut berubah saat Admin mengubah harga Lagu", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu({ genreId, harga: 25000 });
    const agent = await masuk();
    await isiKeranjang(agent, laguId);
    const checkout = pembelianCheckoutResponseSchema.parse(
      (await agent.post("/api/pembelian").expect(201)).body,
    ).data;

    const adminAgent = await masukAdmin();
    await adminAgent
      .patch(`/api/admin/lagu/${laguId}`)
      .field("harga", "99000")
      .expect(200);

    const riwayat = daftarPembelianResponseSchema.parse(
      (await agent.get("/api/pembelian").expect(200)).body,
    ).data;
    const pembelian = riwayat.find((item) => item.id === checkout.id)!;
    expect(pembelian.total).toBe(25000);
    expect(pembelian.itemPembelian).toEqual([
      { laguId, judul: "Cahaya Pagi", artis: "Artis Uji", harga: 25000 },
    ]);
  });
});

describe("Riwayat Pembelian", () => {
  it("hanya menampilkan Pembelian milik Pelanggan yang masuk", async () => {
    await buatPelanggan("siti@example.com");
    await buatPelanggan("budi@example.com");
    const genreId = await buatGenre();
    const laguId = await buatLagu({ genreId });

    const siti = await masuk("siti@example.com");
    await isiKeranjang(siti, laguId);
    const milikSiti = pembelianCheckoutResponseSchema.parse(
      (await siti.post("/api/pembelian").expect(201)).body,
    ).data;

    const budi = await masuk("budi@example.com");
    const riwayatBudi = daftarPembelianResponseSchema.parse(
      (await budi.get("/api/pembelian").expect(200)).body,
    ).data;
    expect(riwayatBudi).toEqual([]);

    const curi = await budi
      .post(`/api/pembelian/${milikSiti.id}/lanjutkan`)
      .expect(404);
    expect(errorResponseSchema.parse(curi.body).code).toBe("TIDAK_DITEMUKAN");
  });
});

describe("Melanjutkan Pembelian", () => {
  it("memakai ulang token Snap yang tersimpan tanpa membuat transaksi baru", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu({ genreId });
    const agent = await masuk();
    await isiKeranjang(agent, laguId);
    const checkout = pembelianCheckoutResponseSchema.parse(
      (await agent.post("/api/pembelian").expect(201)).body,
    ).data;

    const res = await agent
      .post(`/api/pembelian/${checkout.id}/lanjutkan`)
      .expect(200);
    const lanjut = pembelianCheckoutResponseSchema.parse(res.body).data;

    expect(lanjut.tokenSnap).toBe(checkout.tokenSnap);
    expect(lanjut.status).toBe("MENUNGGU_PEMBAYARAN");
    expect(gatewayPalsu.permintaan).toHaveLength(1);
  });

  it("menolak melanjutkan Pembelian yang sudah Lunas", async () => {
    await buatPelanggan();
    const genreId = await buatGenre();
    const laguId = await buatLagu({ genreId });
    const lunasId = await catatPembelian(
      kredensial.email,
      laguId,
      "LUNAS",
    );
    const agent = await masuk();

    const res = await agent
      .post(`/api/pembelian/${lunasId}/lanjutkan`)
      .expect(409);
    expect(errorResponseSchema.parse(res.body).code).toBe(
      "PEMBELIAN_TIDAK_BISA_DILANJUTKAN",
    );
  });
});

describe("Akses Pembelian", () => {
  it("hanya untuk Pelanggan yang sudah masuk", async () => {
    const tanpaSesi = await request(app).get("/api/pembelian").expect(401);
    expect(errorResponseSchema.parse(tanpaSesi.body).code).toBe("BELUM_MASUK");

    await request(app)
      .post("/api/pembelian")
      .send({})
      .expect(401);
    await request(app)
      .post("/api/pembelian/1/lanjutkan")
      .expect(401);

    const adminAgent = await masukAdmin();
    const adminRiwayat = await adminAgent.get("/api/pembelian").expect(403);
    expect(errorResponseSchema.parse(adminRiwayat.body).code).toBe(
      "AKSES_DITOLAK",
    );
    await adminAgent.post("/api/pembelian").expect(403);
  });
});

describe("Konfigurasi Midtrans", () => {
  it("hanya membagikan client key dan URL Snap, bukan server key", async () => {
    const res = await request(app).get("/api/konfigurasi").expect(200);
    const konfigurasi = konfigurasiResponseSchema.parse(res.body);

    expect(konfigurasi.midtransClientKey).toBe("client-publik-tes");
    expect(konfigurasi.midtransSnapUrl).toContain("snap.js");
    expect(JSON.stringify(res.body)).not.toContain("server-rahasia-tes");
    expect(Object.keys(res.body).sort()).toEqual([
      "midtransClientKey",
      "midtransSnapUrl",
    ]);
  });
});

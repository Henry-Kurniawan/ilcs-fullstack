import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { daftarPelangganResponseSchema } from "@musicpedia/shared";
import { seedAdmin } from "../src/seed.ts";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

afterAll(() => ctx.close());
beforeEach(async () => {
  await ctx.reset();
});

const admin = { email: "admin@musikapedia.id", password: "rahasia-admin" };
const siti = { email: "siti@example.com", password: "rahasia123" };
const budi = { email: "budi@example.com", password: "rahasia456" };

async function masukAdmin() {
  await seedAdmin(pool, admin);
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(admin).expect(200);
  return agent;
}

async function daftarSebagaiPelanggan(kredensial: {
  email: string;
  password: string;
}) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(kredensial).expect(201);
  return agent;
}

describe("GET /api/admin/pelanggan", () => {
  it("menampilkan daftar Pelanggan tanpa akun Admin", async () => {
    await daftarSebagaiPelanggan(siti);
    await daftarSebagaiPelanggan(budi);
    const agent = await masukAdmin();

    const res = await agent.get("/api/admin/pelanggan").expect(200);
    const body = daftarPelangganResponseSchema.parse(res.body);

    expect(body.data.map((pelanggan) => pelanggan.email)).toEqual([
      budi.email,
      siti.email,
    ]);
    expect(body.data[0]).toEqual({
      id: expect.any(Number),
      email: budi.email,
      nama: "",
      aktif: true,
    });
    expect(body.meta).toEqual({
      halaman: 1,
      ukuran: 20,
      total: 2,
      totalHalaman: 1,
    });
  });

  it("membagi daftar Pelanggan per halaman dengan meta yang benar", async () => {
    for (let i = 1; i <= 5; i += 1) {
      await daftarSebagaiPelanggan({
        email: `pelanggan${i}@example.com`,
        password: "rahasia123",
      });
    }
    const agent = await masukAdmin();

    const res = await agent
      .get("/api/admin/pelanggan")
      .query({ halaman: 2, ukuran: 2 })
      .expect(200);
    const body = daftarPelangganResponseSchema.parse(res.body);

    expect(body.data.map((pelanggan) => pelanggan.email)).toEqual([
      "pelanggan3@example.com",
      "pelanggan2@example.com",
    ]);
    expect(body.meta).toEqual({
      halaman: 2,
      ukuran: 2,
      total: 5,
      totalHalaman: 3,
    });
  });

  it("mencari Pelanggan berdasarkan email tanpa peka huruf besar-kecil", async () => {
    await daftarSebagaiPelanggan(siti);
    await daftarSebagaiPelanggan(budi);
    const agent = await masukAdmin();

    const res = await agent
      .get("/api/admin/pelanggan")
      .query({ cari: "BUDI@EXAMPLE" })
      .expect(200);
    const body = daftarPelangganResponseSchema.parse(res.body);

    expect(body.data.map((pelanggan) => pelanggan.email)).toEqual([budi.email]);
    expect(body.meta.total).toBe(1);
  });

  it("menolak Pengunjung tanpa sesi", async () => {
    const res = await request(app).get("/api/admin/pelanggan").expect(401);

    expect(res.body.code).toBe("BELUM_MASUK");
  });

  it("menolak Pelanggan yang sudah masuk", async () => {
    const agent = await daftarSebagaiPelanggan(siti);

    const res = await agent.get("/api/admin/pelanggan").expect(403);

    expect(res.body.code).toBe("AKSES_DITOLAK");
  });
});

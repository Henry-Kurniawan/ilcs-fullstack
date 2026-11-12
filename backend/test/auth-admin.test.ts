import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedAdmin } from "../src/seed.ts";
import { createTestContext } from "./support.ts";

const { app, pool, reset, close } = createTestContext();
afterAll(close);
beforeEach(reset);

const admin = { email: "admin@musikapedia.id", password: "rahasia-admin" };
const pelanggan = { email: "siti@example.com", password: "rahasia123" };

describe("Seed Admin", () => {
  it("membuat satu Admin secara idempoten dan bisa login", async () => {
    await seedAdmin(pool, admin);
    await seedAdmin(pool, admin);

    const { rows } = await pool.query<{ peran: string; aktif: boolean }>(
      "SELECT peran, aktif FROM akun WHERE peran = 'ADMIN'",
    );
    expect(rows).toEqual([{ peran: "ADMIN", aktif: true }]);

    const res = await request(app)
      .post("/api/auth/login")
      .send(admin)
      .expect(200);
    expect(res.body.akun).toMatchObject({
      email: admin.email,
      peran: "ADMIN",
    });
  });

  it("tidak bisa didaftarkan lewat jalur registrasi Pelanggan", async () => {
    await seedAdmin(pool, admin);

    await request(app).post("/api/auth/register").send(admin).expect(409);
  });
});

describe("Otorisasi area Admin", () => {
  it("menolak Pengunjung tanpa sesi", async () => {
    const res = await request(app).get("/api/admin/ping").expect(401);
    expect(res.body.code).toBe("BELUM_MASUK");
  });

  it("menolak Pelanggan yang sudah masuk", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(pelanggan).expect(201);

    const res = await agent.get("/api/admin/ping").expect(403);
    expect(res.body.code).toBe("AKSES_DITOLAK");
  });

  it("mengizinkan Admin", async () => {
    await seedAdmin(pool, admin);
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(admin).expect(200);

    const res = await agent.get("/api/admin/ping").expect(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

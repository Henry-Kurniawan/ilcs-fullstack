import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedAdmin } from "../src/seed.ts";
import { createTestContext } from "./support.ts";

const { app, pool, reset, close } = createTestContext();
afterAll(close);
beforeEach(reset);

const siti = { email: "siti@example.com", password: "rahasia123" };
const budi = { email: "budi@example.com", password: "rahasia456" };

async function daftarDanMasuk(kredensial: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(kredensial).expect(201);
  return agent;
}

describe("GET /api/profil", () => {
  it("menolak Pengunjung tanpa sesi", async () => {
    const res = await request(app).get("/api/profil").expect(401);

    expect(res.body.code).toBe("BELUM_MASUK");
  });

  it("menampilkan profil Pelanggan yang sedang masuk", async () => {
    const agent = await daftarDanMasuk(siti);

    const res = await agent.get("/api/profil").expect(200);

    expect(res.body.profil).toEqual({
      id: expect.any(Number),
      email: siti.email,
      nama: "",
      telepon: null,
    });
  });

  it("hanya menampilkan profil Pelanggan yang meminta", async () => {
    const agentSiti = await daftarDanMasuk(siti);
    const agentBudi = await daftarDanMasuk(budi);

    const profilSiti = await agentSiti.get("/api/profil").expect(200);
    const profilBudi = await agentBudi.get("/api/profil").expect(200);

    expect(profilSiti.body.profil.email).toBe(siti.email);
    expect(profilBudi.body.profil.email).toBe(budi.email);
    expect(profilSiti.body.profil.id).not.toBe(profilBudi.body.profil.id);
  });
});

describe("PATCH /api/profil", () => {
  it("mengubah nama Pelanggan sendiri", async () => {
    const agent = await daftarDanMasuk(siti);

    const res = await agent
      .patch("/api/profil")
      .send({ nama: "Siti Rahma" })
      .expect(200);

    expect(res.body.profil).toMatchObject({
      email: siti.email,
      nama: "Siti Rahma",
    });

    const sesudah = await agent.get("/api/profil").expect(200);
    expect(sesudah.body.profil.nama).toBe("Siti Rahma");

    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.akun.nama).toBe("Siti Rahma");
  });

  it("memangkas spasi di awal dan akhir nama", async () => {
    const agent = await daftarDanMasuk(siti);

    const res = await agent
      .patch("/api/profil")
      .send({ nama: "  Siti Rahma  " })
      .expect(200);

    expect(res.body.profil.nama).toBe("Siti Rahma");
  });

  it("menyimpan dan mengosongkan telepon Pelanggan", async () => {
    const agent = await daftarDanMasuk(siti);

    const tersimpan = await agent
      .patch("/api/profil")
      .send({ telepon: "  0812-3456-7890 " })
      .expect(200);
    expect(tersimpan.body.profil.telepon).toBe("0812-3456-7890");
    // Nama tidak ikut berubah saat hanya telepon yang dikirim.
    expect(tersimpan.body.profil.nama).toBe("");

    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.akun.telepon).toBe("0812-3456-7890");

    const dikosongkan = await agent
      .patch("/api/profil")
      .send({ telepon: "" })
      .expect(200);
    expect(dikosongkan.body.profil.telepon).toBeNull();

    const sesudah = await agent.get("/api/profil").expect(200);
    expect(sesudah.body.profil.telepon).toBeNull();
  });

  it("menolak nomor telepon yang tidak valid", async () => {
    const agent = await daftarDanMasuk(siti);

    const res = await agent
      .patch("/api/profil")
      .send({ telepon: "bukan nomor" })
      .expect(400);

    expect(res.body.code).toBe("VALIDASI");
    expect(res.body.error).toBe("Nomor telepon tidak valid.");
  });

  it("menolak nama kosong dengan pesan berbahasa Indonesia", async () => {
    const agent = await daftarDanMasuk(siti);

    const res = await agent
      .patch("/api/profil")
      .send({ nama: "   " })
      .expect(400);

    expect(res.body.code).toBe("VALIDASI");
    expect(res.body.error).toBe("Nama wajib diisi.");

    const sesudah = await agent.get("/api/profil").expect(200);
    expect(sesudah.body.profil.nama).toBe("");
  });

  it("tidak bisa mengubah data Pelanggan lain lewat badan permintaan", async () => {
    const agentSiti = await daftarDanMasuk(siti);
    const agentBudi = await daftarDanMasuk(budi);
    const profilSiti = await agentSiti.get("/api/profil").expect(200);

    await agentBudi
      .patch("/api/profil")
      .send({ nama: "Bukan Budi", id: profilSiti.body.profil.id })
      .expect(400);

    const sesudah = await agentSiti.get("/api/profil").expect(200);
    expect(sesudah.body.profil.nama).toBe("");
  });
});

describe("PATCH /api/profil/password", () => {
  const passwordBaru = "rahasia-baru-123";

  it("mewajibkan password lama yang benar", async () => {
    const agent = await daftarDanMasuk(siti);

    const res = await agent
      .patch("/api/profil/password")
      .send({ passwordLama: "salah-sekali", passwordBaru })
      .expect(400);

    expect(res.body.code).toBe("PASSWORD_LAMA_SALAH");
    expect(res.body.error).toBe("Kata sandi lama tidak sesuai.");

    await request(app).post("/api/auth/login").send(siti).expect(200);
    await request(app)
      .post("/api/auth/login")
      .send({ ...siti, password: passwordBaru })
      .expect(401);
  });

  it("menolak password baru yang kurang dari 8 karakter", async () => {
    const agent = await daftarDanMasuk(siti);

    const res = await agent
      .patch("/api/profil/password")
      .send({ passwordLama: siti.password, passwordBaru: "pendek" })
      .expect(400);

    expect(res.body.code).toBe("VALIDASI");
    expect(res.body.error).toBe("Kata sandi minimal 8 karakter.");

    await request(app).post("/api/auth/login").send(siti).expect(200);
  });

  it("mengganti password setelah password lama benar", async () => {
    const agent = await daftarDanMasuk(siti);

    await agent
      .patch("/api/profil/password")
      .send({ passwordLama: siti.password, passwordBaru })
      .expect(204);

    await request(app).post("/api/auth/login").send(siti).expect(401);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ ...siti, password: passwordBaru })
      .expect(200);
    expect(res.body.akun.email).toBe(siti.email);
  });

  it("hanya mengganti password Pelanggan yang meminta", async () => {
    const agentSiti = await daftarDanMasuk(siti);
    const agentBudi = await daftarDanMasuk(budi);
    const profilSiti = await agentSiti.get("/api/profil").expect(200);

    await agentBudi
      .patch("/api/profil/password")
      .send({
        passwordLama: budi.password,
        passwordBaru,
        id: profilSiti.body.profil.id,
      })
      .expect(400);

    await agentSiti
      .patch("/api/profil/password")
      .send({ passwordLama: siti.password, passwordBaru })
      .expect(204);

    await request(app).post("/api/auth/login").send(budi).expect(200);
    await request(app)
      .post("/api/auth/login")
      .send({ ...siti, password: passwordBaru })
      .expect(200);
  });
});

describe("Otorisasi profil", () => {
  it("menolak Admin karena profil hanya untuk Pelanggan", async () => {
    const admin = { email: "admin@musikapedia.id", password: "rahasia-admin" };
    await seedAdmin(pool, admin);
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(admin).expect(200);

    const res = await agent.get("/api/profil").expect(403);
    expect(res.body.code).toBe("AKSES_DITOLAK");
  });
});



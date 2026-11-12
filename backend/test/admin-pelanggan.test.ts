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

async function cariIdPelanggan(
  agent: request.Agent,
  email: string,
): Promise<number> {
  const res = await agent
    .get("/api/admin/pelanggan")
    .query({ cari: email })
    .expect(200);
  return daftarPelangganResponseSchema.parse(res.body).data[0]!.id;
}

describe("PATCH /api/admin/pelanggan/:id", () => {
  it("mengubah nama dan email Pelanggan", async () => {
    const agentSiti = await daftarSebagaiPelanggan(siti);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, siti.email);

    const res = await agentAdmin
      .patch(`/api/admin/pelanggan/${id}`)
      .send({ nama: "Siti Rahma", email: "siti.rahma@example.com" })
      .expect(200);

    expect(res.body.data).toEqual({
      id,
      email: "siti.rahma@example.com",
      nama: "Siti Rahma",
      aktif: true,
    });

    const profil = await agentSiti.get("/api/profil").expect(200);
    expect(profil.body.profil).toEqual({
      id,
      email: "siti.rahma@example.com",
      nama: "Siti Rahma",
      telepon: null,
    });
  });

  it("mencari Pelanggan berdasarkan nama tanpa peka huruf besar-kecil", async () => {
    await daftarSebagaiPelanggan(siti);
    await daftarSebagaiPelanggan(budi);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, budi.email);
    await agentAdmin
      .patch(`/api/admin/pelanggan/${id}`)
      .send({ nama: "Budi Santoso" })
      .expect(200);

    const res = await agentAdmin
      .get("/api/admin/pelanggan")
      .query({ cari: "BUDI SAN" })
      .expect(200);

    expect(
      daftarPelangganResponseSchema.parse(res.body).data.map(
        (pelanggan) => pelanggan.nama,
      ),
    ).toEqual(["Budi Santoso"]);
  });

  it("menolak email yang sudah dipakai Pelanggan lain", async () => {
    await daftarSebagaiPelanggan(siti);
    await daftarSebagaiPelanggan(budi);
    const agentAdmin = await masukAdmin();
    const idBudi = await cariIdPelanggan(agentAdmin, budi.email);

    const res = await agentAdmin
      .patch(`/api/admin/pelanggan/${idBudi}`)
      .send({ email: siti.email })
      .expect(409);

    expect(res.body).toEqual({
      error: "Email sudah terdaftar. Gunakan email lain.",
      code: "EMAIL_TERDAFTAR",
    });
  });

  it("menolak email milik akun Admin", async () => {
    await daftarSebagaiPelanggan(siti);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, siti.email);

    const res = await agentAdmin
      .patch(`/api/admin/pelanggan/${id}`)
      .send({ email: admin.email })
      .expect(409);

    expect(res.body.code).toBe("EMAIL_TERDAFTAR");
  });

  it("tidak pernah mengubah password Pelanggan", async () => {
    await daftarSebagaiPelanggan(siti);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, siti.email);

    const res = await agentAdmin
      .patch(`/api/admin/pelanggan/${id}`)
      .send({ nama: "Siti Rahma", password: "kata-sandi-baru" })
      .expect(400);

    expect(res.body.code).toBe("VALIDASI");

    await request(app).post("/api/auth/login").send(siti).expect(200);
    await request(app)
      .post("/api/auth/login")
      .send({ ...siti, password: "kata-sandi-baru" })
      .expect(401);
  });

  it("menolak data yang tidak valid dengan pesan berbahasa Indonesia", async () => {
    await daftarSebagaiPelanggan(siti);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, siti.email);

    const namaKosong = await agentAdmin
      .patch(`/api/admin/pelanggan/${id}`)
      .send({ nama: "   " })
      .expect(400);
    expect(namaKosong.body).toEqual({
      error: "Nama wajib diisi.",
      code: "VALIDASI",
    });

    const emailSalah = await agentAdmin
      .patch(`/api/admin/pelanggan/${id}`)
      .send({ email: "bukan-email" })
      .expect(400);
    expect(emailSalah.body).toEqual({
      error: "Email tidak valid.",
      code: "VALIDASI",
    });

    const kosong = await agentAdmin
      .patch(`/api/admin/pelanggan/${id}`)
      .send({})
      .expect(400);
    expect(kosong.body).toEqual({
      error: "Isi minimal nama atau email Pelanggan.",
      code: "VALIDASI",
    });
  });

  it("menjawab 404 untuk akun Admin dan Pelanggan yang tidak ada", async () => {
    const agentAdmin = await masukAdmin();
    const me = await agentAdmin.get("/api/auth/me").expect(200);

    const akunAdmin = await agentAdmin
      .patch(`/api/admin/pelanggan/${me.body.akun.id}`)
      .send({ nama: "Admin Lain" })
      .expect(404);
    expect(akunAdmin.body.code).toBe("PELANGGAN_TIDAK_DITEMUKAN");

    const tidakAda = await agentAdmin
      .patch("/api/admin/pelanggan/999999")
      .send({ nama: "Tidak Ada" })
      .expect(404);
    expect(tidakAda.body.code).toBe("PELANGGAN_TIDAK_DITEMUKAN");
  });

  it("menolak Pengunjung dan Pelanggan", async () => {
    const agentSiti = await daftarSebagaiPelanggan(siti);
    const me = await agentSiti.get("/api/profil").expect(200);

    const pengunjung = await request(app)
      .patch(`/api/admin/pelanggan/${me.body.profil.id}`)
      .send({ nama: "Siti Rahma" })
      .expect(401);
    expect(pengunjung.body.code).toBe("BELUM_MASUK");

    const pelanggan = await agentSiti
      .patch(`/api/admin/pelanggan/${me.body.profil.id}`)
      .send({ nama: "Siti Rahma" })
      .expect(403);
    expect(pelanggan.body.code).toBe("AKSES_DITOLAK");
  });
});

describe("PATCH /api/admin/pelanggan/:id/aktif", () => {
  it("menonaktifkan Pelanggan langsung memutus sesi aktifnya dan menolak login", async () => {
    const agentSiti = await daftarSebagaiPelanggan(siti);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, siti.email);

    const res = await agentAdmin
      .patch(`/api/admin/pelanggan/${id}/aktif`)
      .send({ aktif: false })
      .expect(200);
    expect(res.body.data).toEqual({
      id,
      email: siti.email,
      nama: "",
      aktif: false,
    });

    const sesudah = await agentSiti.get("/api/profil").expect(401);
    expect(sesudah.body.code).toBe("BELUM_MASUK");

    const login = await request(app)
      .post("/api/auth/login")
      .send(siti)
      .expect(403);
    expect(login.body).toEqual({
      error: "Akun Anda dinonaktifkan. Hubungi Admin.",
      code: "AKUN_NONAKTIF",
    });
  });

  it("mengaktifkan kembali Pelanggan membuatnya bisa login lagi", async () => {
    await daftarSebagaiPelanggan(siti);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, siti.email);

    await agentAdmin
      .patch(`/api/admin/pelanggan/${id}/aktif`)
      .send({ aktif: false })
      .expect(200);
    await agentAdmin
      .patch(`/api/admin/pelanggan/${id}/aktif`)
      .send({ aktif: true })
      .expect(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send(siti)
      .expect(200);
    expect(login.body.akun).toMatchObject({ email: siti.email, aktif: true });
  });

  it("menolak Admin menonaktifkan akunnya sendiri", async () => {
    const agentAdmin = await masukAdmin();
    const me = await agentAdmin.get("/api/auth/me").expect(200);

    const res = await agentAdmin
      .patch(`/api/admin/pelanggan/${me.body.akun.id}/aktif`)
      .send({ aktif: false })
      .expect(400);

    expect(res.body).toEqual({
      error: "Admin tidak dapat menonaktifkan akunnya sendiri.",
      code: "AKSI_TIDAK_DIIZINKAN",
    });

    const meLagi = await agentAdmin.get("/api/auth/me").expect(200);
    expect(meLagi.body.akun.aktif).toBe(true);
  });

  it("menolak badan permintaan yang tidak valid", async () => {
    await daftarSebagaiPelanggan(siti);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, siti.email);

    const res = await agentAdmin
      .patch(`/api/admin/pelanggan/${id}/aktif`)
      .send({ aktif: "tidak" })
      .expect(400);

    expect(res.body.code).toBe("VALIDASI");
  });

  it("menolak Pengunjung dan Pelanggan", async () => {
    const agentSiti = await daftarSebagaiPelanggan(siti);
    const me = await agentSiti.get("/api/profil").expect(200);
    const jalur = `/api/admin/pelanggan/${me.body.profil.id}/aktif`;

    const pengunjung = await request(app)
      .patch(jalur)
      .send({ aktif: false })
      .expect(401);
    expect(pengunjung.body.code).toBe("BELUM_MASUK");

    const pelanggan = await agentSiti
      .patch(jalur)
      .send({ aktif: false })
      .expect(403);
    expect(pelanggan.body.code).toBe("AKSES_DITOLAK");

    const masihAktif = await agentSiti.get("/api/profil").expect(200);
    expect(masihAktif.body.profil.email).toBe(siti.email);
  });
});

describe("Penghapusan Pelanggan", () => {
  it("tidak menyediakan endpoint hapus", async () => {
    await daftarSebagaiPelanggan(siti);
    const agentAdmin = await masukAdmin();
    const id = await cariIdPelanggan(agentAdmin, siti.email);

    await agentAdmin.delete(`/api/admin/pelanggan/${id}`).expect(404);

    const res = await agentAdmin.get("/api/admin/pelanggan").expect(200);
    expect(
      daftarPelangganResponseSchema.parse(res.body).data.map(
        (pelanggan) => pelanggan.email,
      ),
    ).toEqual([siti.email]);
  });
});



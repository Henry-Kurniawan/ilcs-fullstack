import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarLaguSayaResponseSchema,
  errorResponseSchema,
} from "@musicpedia/shared";
import type { Agent } from "supertest";
import { buatNadaMp3 } from "./audio-helper.ts";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

afterAll(() => ctx.close());

const pelanggan = { email: "siti@example.com", password: "rahasia123" };
const pelangganLain = { email: "budi@example.com", password: "rahasia123" };

let nadaMp3: string;

beforeAll(async () => {
  nadaMp3 = await buatNadaMp3(40);
});

beforeEach(async () => {
  await ctx.reset();
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
});

async function buatGenre(nama = "Pop"): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO genre (nama) VALUES ($1) RETURNING id",
    [nama],
  );
  return rows[0]!.id;
}

interface FixtureLagu {
  judul: string;
  artis?: string;
  genreId: number;
  harga?: number;
  tersembunyi?: boolean;
  denganMp3?: boolean;
}

async function buatLagu(lagu: FixtureLagu): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lagu
       (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga, tersembunyi)
     VALUES ($1, $2, $3, 'Pencipta Uji', 'Label Uji', '2024-01-01', $4, $5)
     RETURNING id`,
    [
      lagu.judul,
      lagu.artis ?? "Artis Uji",
      lagu.genreId,
      lagu.harga ?? 15000,
      lagu.tersembunyi ?? false,
    ],
  );
  const id = rows[0]!.id;
  if (lagu.denganMp3 ?? true) {
    const fileMp3 = `mp3/${id}.mp3`;
    await mkdir(path.join(ctx.audioDir, "mp3"), { recursive: true });
    await copyFile(nadaMp3, path.join(ctx.audioDir, fileMp3));
    await pool.query("UPDATE lagu SET file_mp3 = $2 WHERE id = $1", [
      id,
      fileMp3,
    ]);
  }
  return id;
}

async function catatPembelian(
  pelangganId: number,
  laguId: number,
  status: "MENUNGGU_PEMBAYARAN" | "LUNAS" | "GAGAL",
): Promise<void> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO pembelian (pelanggan_id, status, total, dibayar_pada)
     VALUES ($1, $2, 15000, CASE WHEN $2 = 'LUNAS' THEN now() ELSE NULL END)
     RETURNING id`,
    [pelangganId, status],
  );
  await pool.query(
    `INSERT INTO item_pembelian (pembelian_id, lagu_id, harga)
     VALUES ($1, $2, 15000)`,
    [rows[0]!.id, laguId],
  );
}

async function daftarDanMasuk(
  email = pelanggan.email,
): Promise<{ id: number; agent: Agent }> {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: pelanggan.password })
    .expect(201);
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email, password: pelanggan.password })
    .expect(200);
  const { rows } = await pool.query<{ id: number }>(
    "SELECT id FROM akun WHERE email = $1",
    [email],
  );
  return { id: rows[0]!.id, agent };
}

function ambilBiner() {
  return (
    res: request.Response,
    callback: (error: Error | null, body: Buffer) => void,
  ) => {
    const potongan: Buffer[] = [];
    res.on("data", (bagian: Buffer) => potongan.push(bagian));
    res.on("end", () => callback(null, Buffer.concat(potongan)));
  };
}

describe("GET /api/lagu-saya", () => {
  it("menampilkan Lagu dari Pembelian Lunas milik Pelanggan, termasuk yang disembunyikan", async () => {
    const genreId = await buatGenre();
    const milik = await buatLagu({
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genreId,
      harga: 25000,
    });
    const disembunyikan = await buatLagu({
      judul: "Lagu Lama",
      artis: "Artis Lama",
      genreId,
      tersembunyi: true,
    });
    const menunggu = await buatLagu({ judul: "Belum Dibayar", genreId });
    const gagal = await buatLagu({ judul: "Gagal Bayar", genreId });
    const milikOrangLain = await buatLagu({
      judul: "Punya Orang Lain",
      genreId,
    });

    const siti = await daftarDanMasuk(pelanggan.email);
    const budi = await daftarDanMasuk(pelangganLain.email);
    await catatPembelian(siti.id, milik, "LUNAS");
    await catatPembelian(siti.id, disembunyikan, "LUNAS");
    await catatPembelian(siti.id, menunggu, "MENUNGGU_PEMBAYARAN");
    await catatPembelian(siti.id, gagal, "GAGAL");
    await catatPembelian(budi.id, milikOrangLain, "LUNAS");

    const agent = siti.agent;
    const res = await agent.get("/api/lagu-saya").expect(200);
    const body = daftarLaguSayaResponseSchema.parse(res.body);

    expect(body.data.map((lagu) => lagu.judul).sort()).toEqual([
      "Cahaya Pagi",
      "Lagu Lama",
    ]);
    expect(body.data.find((lagu) => lagu.judul === "Cahaya Pagi")).toEqual({
      id: milik,
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genre: { id: genreId, nama: "Pop" },
      pencipta: "Pencipta Uji",
      labelRekaman: "Label Uji",
      tanggalRilis: "2024-01-01",
      harga: 25000,
    });
  });
  it("mengembalikan daftar kosong bila Pelanggan belum punya Pembelian Lunas", async () => {
    const siti = await daftarDanMasuk();
    const genreId = await buatGenre();
    const laguId = await buatLagu({ judul: "Belum Dibeli", genreId });
    await catatPembelian(siti.id, laguId, "MENUNGGU_PEMBAYARAN");

    const res = await siti.agent.get("/api/lagu-saya").expect(200);
    expect(daftarLaguSayaResponseSchema.parse(res.body).data).toEqual([]);
  });

  it("hanya bisa dibuka Pelanggan", async () => {
    const pengunjung = await request(app).get("/api/lagu-saya").expect(401);
    expect(errorResponseSchema.parse(pengunjung.body).code).toBe("BELUM_MASUK");

    const { seedAdmin } = await import("../src/seed.ts");
    await seedAdmin(pool, {
      email: "admin@musicpedia.id",
      password: "rahasia-admin",
    });
    const admin = request.agent(app);
    await admin
      .post("/api/auth/login")
      .send({ email: "admin@musicpedia.id", password: "rahasia-admin" })
      .expect(200);

    const res = await admin.get("/api/lagu-saya").expect(403);
    expect(errorResponseSchema.parse(res.body).code).toBe("AKSES_DITOLAK");
  });
});

describe("GET /api/lagu/:id/unduh", () => {
  it("mengirim mp3 penuh dengan nama berkas Artis - judul.mp3 untuk pemiliknya", async () => {
    const genreId = await buatGenre();
    const laguId = await buatLagu({
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genreId,
    });
    const siti = await daftarDanMasuk();
    await catatPembelian(siti.id, laguId, "LUNAS");

    const res = await siti.agent
      .get(`/api/lagu/${laguId}/unduh`)
      .buffer(true)
      .parse(ambilBiner())
      .expect(200);

    const isi = res.body as Buffer;
    const berkasAsli = await readFile(
      path.join(ctx.audioDir, "mp3", `${laguId}.mp3`),
    );

    expect(res.headers["content-type"]).toContain("audio/mpeg");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="Rina Prasetya - Cahaya Pagi.mp3"',
    );
    expect(res.headers["content-length"]).toBe(String(berkasAsli.length));
    expect(isi.equals(berkasAsli)).toBe(true);
    expect(isi.subarray(0, 3).toString("latin1")).toBe("ID3");
  });
});

describe("Unduhan berulang dan Lagu tersembunyi", () => {
  it("bisa diunduh berulang kali dan tetap bisa setelah Lagu disembunyikan", async () => {
    const genreId = await buatGenre();
    const laguId = await buatLagu({
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genreId,
    });
    const siti = await daftarDanMasuk();
    await catatPembelian(siti.id, laguId, "LUNAS");

    const pertama = await siti.agent
      .get(`/api/lagu/${laguId}/unduh`)
      .buffer(true)
      .parse(ambilBiner())
      .expect(200);
    const kedua = await siti.agent
      .get(`/api/lagu/${laguId}/unduh`)
      .buffer(true)
      .parse(ambilBiner())
      .expect(200);
    expect((kedua.body as Buffer).equals(pertama.body as Buffer)).toBe(true);

    await pool.query("UPDATE lagu SET tersembunyi = true WHERE id = $1", [
      laguId,
    ]);
    await request(app).get(`/api/lagu/${laguId}`).expect(404);
    await siti.agent
      .get(`/api/lagu/${laguId}/unduh`)
      .buffer(true)
      .parse(ambilBiner())
      .expect(200);
  });
});

describe("Pembatasan Unduhan", () => {
  it("menolak Pengunjung, Pelanggan lain, dan Pembelian yang belum Lunas", async () => {
    const genreId = await buatGenre();
    const laguLunas = await buatLagu({ judul: "Lunas", genreId });
    const laguMenunggu = await buatLagu({ judul: "Menunggu", genreId });
    const laguGagal = await buatLagu({ judul: "Gagal", genreId });

    const siti = await daftarDanMasuk();
    const budi = await daftarDanMasuk(pelangganLain.email);
    await catatPembelian(siti.id, laguLunas, "LUNAS");
    await catatPembelian(siti.id, laguMenunggu, "MENUNGGU_PEMBAYARAN");
    await catatPembelian(siti.id, laguGagal, "GAGAL");

    const pengunjung = await request(app)
      .get(`/api/lagu/${laguLunas}/unduh`)
      .expect(401);
    expect(errorResponseSchema.parse(pengunjung.body).code).toBe("BELUM_MASUK");

    for (const laguId of [laguMenunggu, laguGagal]) {
      const res = await siti.agent
        .get(`/api/lagu/${laguId}/unduh`)
        .expect(404);
      expect(errorResponseSchema.parse(res.body).code).toBe("TIDAK_DITEMUKAN");
    }

    const bukanMilik = await budi.agent
      .get(`/api/lagu/${laguLunas}/unduh`)
      .expect(404);
    expect(errorResponseSchema.parse(bukanMilik.body).code).toBe(
      "TIDAK_DITEMUKAN",
    );

    await siti.agent.get(`/api/lagu/999999/unduh`).expect(404);
  });

  it("menjawab 404 bila berkas mp3 Lagu tidak ada di disk", async () => {
    const genreId = await buatGenre();
    const laguId = await buatLagu({
      judul: "Tanpa Berkas",
      genreId,
      denganMp3: false,
    });
    const siti = await daftarDanMasuk();
    await catatPembelian(siti.id, laguId, "LUNAS");

    await siti.agent.get(`/api/lagu/${laguId}/unduh`).expect(404);
  });
});

describe("Nama berkas Unduhan", () => {
  it("menjaga nama berkas tetap aman dan judul non-ASCII tetap terbaca", async () => {
    const genreId = await buatGenre();
    const laguId = await buatLagu({
      judul: "Café Senja",
      artis: 'Rina "R" Prasetya',
      genreId,
    });
    const siti = await daftarDanMasuk();
    await catatPembelian(siti.id, laguId, "LUNAS");

    const res = await siti.agent
      .get(`/api/lagu/${laguId}/unduh`)
      .buffer(true)
      .parse(ambilBiner())
      .expect(200);

    const header = String(res.headers["content-disposition"]);
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.startsWith("attachment; ")).toBe(true);

    const fallback = /filename="([^"]*)"/.exec(header)?.[1];
    expect(fallback).toBe("Rina -R- Prasetya - Caf_ Senja.mp3");
    expect(fallback).toMatch(/^[\x20-\x7e]*$/);

    const utf8 = /filename\*=UTF-8''([^;]+)$/.exec(header)?.[1];
    expect(decodeURIComponent(utf8!)).toBe(
      "Rina -R- Prasetya - Café Senja.mp3",
    );
  });
});

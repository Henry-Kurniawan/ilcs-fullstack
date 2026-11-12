import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarGenreResponseSchema,
  daftarLaguResponseSchema,
  daftarLaguSayaResponseSchema,
  laporanResponseSchema,
} from "@musicpedia/shared";
import { pathAudio } from "../src/media/audio.ts";
import {
  jalankanSeed,
  PELANGGAN_SEED,
  seedKatalog,
} from "../src/seed.ts";
import { durasiAudio } from "./audio-helper.ts";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

afterAll(() => ctx.close());

beforeEach(async () => {
  await ctx.reset();
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
});

function tanggalHariIni(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function masuk(email: string, password: string) {
  const agen = request.agent(app);
  await agen.post("/api/auth/login").send({ email, password }).expect(200);
  return agen;
}

describe("seed katalog", () => {
  it("mengisi Genre dan Lagu secara idempoten", async () => {
    await seedKatalog(pool);
    await seedKatalog(pool);

    const laguRes = await request(app)
      .get("/api/lagu")
      .query({ ukuran: 100 })
      .expect(200);
    const daftarLagu = daftarLaguResponseSchema.parse(laguRes.body);
    const genreRes = await request(app).get("/api/genre").expect(200);
    const daftarGenre = daftarGenreResponseSchema.parse(genreRes.body);

    expect(daftarLagu.meta.total).toBe(10);
    expect(new Set(daftarLagu.data.map((lagu) => lagu.judul)).size).toBe(10);
    expect(daftarGenre.data.map((genre) => genre.nama)).toEqual([
      "Dangdut",
      "Hip Hop",
      "Jazz",
      "Pop",
      "Rock",
    ]);

    const cahayaPagi = daftarLagu.data.find(
      (lagu) => lagu.judul === "Cahaya Pagi",
    );
    expect(cahayaPagi).toEqual({
      id: expect.any(Number),
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genre: { id: expect.any(Number), nama: "Pop" },
      pencipta: "Rina Prasetya",
      labelRekaman: "Musika Records",
      tanggalRilis: "2024-09-12",
      harga: 25000,
    });
  });
});

describe("seed Data Demo", () => {
  it("mengisi Admin, Pelanggan, audio, dan Pembelian di ketiga status secara idempoten", { timeout: 120_000 }, async () => {
    await jalankanSeed(pool, ctx.config, () => {});
    const setelahPertama = await hitungDataDemo();
    const audioPertama = await hitungBerkasAudio();

    await jalankanSeed(pool, ctx.config, () => {});
    const setelahKedua = await hitungDataDemo();
    const audioKedua = await hitungBerkasAudio();

    expect(setelahKedua).toEqual(setelahPertama);
    expect(audioKedua).toEqual(audioPertama);
    expect(audioKedua).toEqual({ mp3: 10, trial: 10 });
    expect(setelahKedua).toEqual({
      admin: 1,
      pelanggan: 3,
      pelangganAktif: 2,
      pelangganNonaktif: 1,
      genre: 5,
      lagu: 10,
      laguBerTrial: 10,
      menunggu: 1,
      lunas: 3,
      gagal: 2,
      itemMenunggu: 1,
      itemLunas: 6,
      itemGagal: 3,
    });

    const { rows: pembelian } = await pool.query<{
      kode_order: string;
      status: string;
      total: number;
      dibayar_pada: Date | null;
      jumlah_item: number;
      total_item: number;
    }>(
      `SELECT p.kode_order, p.status, p.total, p.dibayar_pada,
              count(ip.lagu_id)::integer AS jumlah_item,
              COALESCE(sum(ip.harga), 0)::integer AS total_item
       FROM pembelian p
       LEFT JOIN item_pembelian ip ON ip.pembelian_id = p.id
       GROUP BY p.id
       ORDER BY p.kode_order`,
    );

    expect(pembelian.length).toBe(6);
    for (const baris of pembelian) {
      expect(baris.total).toBe(baris.total_item);
      expect(baris.jumlah_item).toBeGreaterThan(0);
      if (baris.status === "LUNAS") {
        expect(baris.dibayar_pada).toBeInstanceOf(Date);
      } else {
        expect(baris.dibayar_pada).toBeNull();
      }
    }

    // Harga Item Pembelian adalah snapshot harga saat seed, bukan hasil
    // membaca ulang harga Lagu dari katalog.
    const { rows: itemCahaya } = await pool.query<{
      harga: number;
      harga_katalog: number;
    }>(
      `SELECT ip.harga, l.harga AS harga_katalog
       FROM item_pembelian ip
       JOIN pembelian p ON p.id = ip.pembelian_id
       JOIN lagu l ON l.id = ip.lagu_id
       WHERE p.kode_order = 'MP-DEMO-LUNAS-1' AND l.judul = 'Cahaya Pagi'`,
    );
    expect(itemCahaya).toEqual([{ harga: 25000, harga_katalog: 25000 }]);
  });

  it("menyiapkan audio orisinal dan Trial di bawah 30 detik untuk setiap Lagu", { timeout: 120_000 }, async () => {
    await jalankanSeed(pool, ctx.config, () => {});

    const { rows } = await pool.query<{
      id: number;
      judul: string;
      file_mp3: string | null;
      file_trial: string | null;
    }>("SELECT id, judul, file_mp3, file_trial FROM lagu ORDER BY id");

    expect(rows).toHaveLength(10);
    for (const lagu of rows) {
      expect(lagu.file_mp3).toBeTruthy();
      expect(lagu.file_trial).toBeTruthy();
      const mp3 = await stat(pathAudio(ctx.audioDir, lagu.file_mp3!));
      const trial = await stat(pathAudio(ctx.audioDir, lagu.file_trial!));
      expect(mp3.size).toBeGreaterThan(0);
      expect(trial.size).toBeGreaterThan(0);
      expect(await durasiAudio(pathAudio(ctx.audioDir, lagu.file_trial!))).toBeLessThanOrEqual(
        30,
      );
    }

    const trialRes = await request(app)
      .get(`/api/lagu/${rows[0]!.id}/trial`)
      .expect(200);
    expect(trialRes.headers["content-type"]).toContain("audio/mpeg");
    expect(trialRes.body.length).toBeGreaterThan(0);
  });

  it("menjual Lagu kepada Pelanggan yang bisa login dan mengunduhnya", { timeout: 120_000 }, async () => {
    await jalankanSeed(pool, ctx.config, () => {});

    const budi = PELANGGAN_SEED.find((pelanggan) => pelanggan.aktif)!;
    const agen = await masuk(budi.email, budi.password);

    const laguSayaRes = await agen.get("/api/lagu-saya").expect(200);
    const laguSaya = daftarLaguSayaResponseSchema.parse(laguSayaRes.body);
    expect(laguSaya.data.map((lagu) => lagu.judul).sort()).toEqual([
      "Cahaya Pagi",
      "Jalan Pulang",
      "Kota Tua",
      "Rindu Senja",
    ]);

    const diunduh = laguSaya.data.find((lagu) => lagu.judul === "Cahaya Pagi")!;
    const unduhan = await agen
      .get(`/api/lagu/${diunduh.id}/unduh`)
      .expect(200);
    expect(unduhan.headers["content-type"]).toContain("audio/mpeg");
    expect(unduhan.headers["content-disposition"]).toContain(
      "Rina Prasetya - Cahaya Pagi.mp3",
    );
    expect(unduhan.body.length).toBeGreaterThan(0);
  });

  it("menolak login Pelanggan nonaktif dan tetap bisa diaktifkan Admin", { timeout: 120_000 }, async () => {
    await jalankanSeed(pool, ctx.config, () => {});

    const nonaktif = PELANGGAN_SEED.find((pelanggan) => !pelanggan.aktif)!;
    await request(app)
      .post("/api/auth/login")
      .send({ email: nonaktif.email, password: nonaktif.password })
      .expect(403);

    const admin = await masuk(ctx.config.adminEmail, ctx.config.adminPassword);
    const daftar = await admin
      .get("/api/admin/pelanggan")
      .query({ cari: nonaktif.email })
      .expect(200);
    const pelanggan = daftar.body.data.find(
      (baris: { email: string }) => baris.email === nonaktif.email,
    );
    expect(pelanggan.aktif).toBe(false);

    await admin
      .patch(`/api/admin/pelanggan/${pelanggan.id}/aktif`)
      .send({ aktif: true })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: nonaktif.email, password: nonaktif.password })
      .expect(200);
  });

  it("menampilkan baris Laporan Penjualan dari Pembelian Lunas Data Demo", { timeout: 120_000 }, async () => {
    await jalankanSeed(pool, ctx.config, () => {});

    const admin = await masuk(ctx.config.adminEmail, ctx.config.adminPassword);
    const hariIni = tanggalHariIni();
    const laporanRes = await admin
      .get("/api/admin/laporan")
      .query({ dari: hariIni, sampai: hariIni })
      .expect(200);
    const laporan = laporanResponseSchema.parse(laporanRes.body);

    expect(laporan.data).toHaveLength(6);
    expect(laporan.total).toBe(55000 + 57000 + 43000);
    expect(laporan.data.map((baris) => baris.judul).sort()).toEqual([
      "Cahaya Pagi",
      "Hujan di Bandung",
      "Jalan Pulang",
      "Kota Tua",
      "Rindu Senja",
      "Sawah dan Bulan",
    ].sort());
    expect(new Set(laporan.data.map((baris) => baris.pelanggan))).toEqual(
      new Set(["Budi Santoso", "Siti Rahmawati"]),
    );
  });
});

async function hitungBerkasAudio() {
  const mp3 = await readdir(path.join(ctx.audioDir, "mp3"));
  const trial = await readdir(path.join(ctx.audioDir, "trial"));
  return {
    mp3: mp3.filter((berkas) => berkas.endsWith(".mp3")).length,
    trial: trial.filter((berkas) => berkas.endsWith(".mp3")).length,
  };
}

async function hitungDataDemo() {
  const hitung = async (sql: string) => {
    const { rows } = await pool.query<{ jumlah: number }>(sql);
    return rows[0]!.jumlah;
  };

  return {
    admin: await hitung("SELECT count(*)::integer AS jumlah FROM akun WHERE peran = 'ADMIN'"),
    pelanggan: await hitung("SELECT count(*)::integer AS jumlah FROM akun WHERE peran = 'PELANGGAN'"),
    pelangganAktif: await hitung("SELECT count(*)::integer AS jumlah FROM akun WHERE peran = 'PELANGGAN' AND aktif"),
    pelangganNonaktif: await hitung("SELECT count(*)::integer AS jumlah FROM akun WHERE peran = 'PELANGGAN' AND NOT aktif"),
    genre: await hitung("SELECT count(*)::integer AS jumlah FROM genre"),
    lagu: await hitung("SELECT count(*)::integer AS jumlah FROM lagu"),
    laguBerTrial: await hitung("SELECT count(*)::integer AS jumlah FROM lagu WHERE file_mp3 IS NOT NULL AND file_trial IS NOT NULL"),
    menunggu: await hitung("SELECT count(*)::integer AS jumlah FROM pembelian WHERE status = 'MENUNGGU_PEMBAYARAN'"),
    lunas: await hitung("SELECT count(*)::integer AS jumlah FROM pembelian WHERE status = 'LUNAS'"),
    gagal: await hitung("SELECT count(*)::integer AS jumlah FROM pembelian WHERE status = 'GAGAL'"),
    itemMenunggu: await hitung("SELECT count(*)::integer AS jumlah FROM item_pembelian ip JOIN pembelian p ON p.id = ip.pembelian_id WHERE p.status = 'MENUNGGU_PEMBAYARAN'"),
    itemLunas: await hitung("SELECT count(*)::integer AS jumlah FROM item_pembelian ip JOIN pembelian p ON p.id = ip.pembelian_id WHERE p.status = 'LUNAS'"),
    itemGagal: await hitung("SELECT count(*)::integer AS jumlah FROM item_pembelian ip JOIN pembelian p ON p.id = ip.pembelian_id WHERE p.status = 'GAGAL'"),
  };
}

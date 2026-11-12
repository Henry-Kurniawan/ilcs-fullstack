import pg from "pg";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarGenreResponseSchema,
  daftarLaguResponseSchema,
  galatResponseSchema,
  laguResponseSchema,
} from "@musicpedia/shared";
import { createApp } from "../src/app.ts";
import { testDatabaseUrl } from "./global-setup.ts";

const databaseUrl = testDatabaseUrl();
const pool = new pg.Pool({ connectionString: databaseUrl });
const app = createApp({ pool, config: { port: 0, databaseUrl } });

afterAll(() => pool.end());

beforeEach(async () => {
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

interface FixtureLagu {
  judul: string;
  artis: string;
  genreId: number;
  pencipta?: string;
  labelRekaman?: string;
  tanggalRilis?: string;
  harga?: number;
  tersembunyi?: boolean;
}

async function buatLagu(lagu: FixtureLagu): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lagu
       (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga, tersembunyi)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      lagu.judul,
      lagu.artis,
      lagu.genreId,
      lagu.pencipta ?? "Pencipta Uji",
      lagu.labelRekaman ?? "Label Uji",
      lagu.tanggalRilis ?? "2024-01-01",
      lagu.harga ?? 15000,
      lagu.tersembunyi ?? false,
    ],
  );
  return rows[0]!.id;
}

describe("GET /api/lagu", () => {
  it("menampilkan Lagu yang tidak disembunyikan dengan urutan Terbaru", async () => {
    const pop = await buatGenre("Pop");
    await buatLagu({
      judul: "Lama",
      artis: "Artis Lama",
      genreId: pop,
      tanggalRilis: "2020-01-01",
      harga: 9000,
    });
    await buatLagu({
      judul: "Baru",
      artis: "Artis Baru",
      genreId: pop,
      pencipta: "Pencipta Baru",
      labelRekaman: "Label Baru",
      tanggalRilis: "2024-05-01",
      harga: 25000,
    });
    await buatLagu({
      judul: "Rahasia",
      artis: "Artis Rahasia",
      genreId: pop,
      tanggalRilis: "2025-01-01",
      tersembunyi: true,
    });

    const res = await request(app).get("/api/lagu").expect(200);
    const body = daftarLaguResponseSchema.parse(res.body);

    expect(body.data.map((lagu) => lagu.judul)).toEqual(["Baru", "Lama"]);
    expect(body.data[0]).toEqual({
      id: expect.any(Number),
      judul: "Baru",
      artis: "Artis Baru",
      genre: { id: pop, nama: "Pop" },
      pencipta: "Pencipta Baru",
      labelRekaman: "Label Baru",
      tanggalRilis: "2024-05-01",
      harga: 25000,
    });
    expect(body.meta).toEqual({
      halaman: 1,
      ukuran: 12,
      total: 2,
      totalHalaman: 1,
    });
  });

  it("mencari Lagu berdasarkan judul atau Artis tanpa peka huruf besar-kecil", async () => {
    const pop = await buatGenre("Pop");
    await buatLagu({
      judul: "Senja di Jakarta",
      artis: "Rina Prasetya",
      genreId: pop,
      tanggalRilis: "2024-03-01",
    });
    await buatLagu({
      judul: "Pagi Cerah",
      artis: "Band Senja",
      genreId: pop,
      tanggalRilis: "2024-02-01",
    });
    await buatLagu({
      judul: "Malam Sunyi",
      artis: "Artis Lain",
      genreId: pop,
      tanggalRilis: "2024-01-01",
    });

    const res = await request(app)
      .get("/api/lagu")
      .query({ cari: "SENJA" })
      .expect(200);
    const body = daftarLaguResponseSchema.parse(res.body);

    expect(body.data.map((lagu) => lagu.judul)).toEqual([
      "Senja di Jakarta",
      "Pagi Cerah",
    ]);
    expect(body.meta.total).toBe(2);
  });

  it("memfilter Lagu berdasarkan genre", async () => {
    const pop = await buatGenre("Pop");
    const jazz = await buatGenre("Jazz");
    await buatLagu({ judul: "Pop Satu", artis: "Artis Pop", genreId: pop });
    await buatLagu({ judul: "Jazz Satu", artis: "Artis Jazz", genreId: jazz });
    await buatLagu({ judul: "Jazz Dua", artis: "Artis Jazz Lain", genreId: jazz });

    const res = await request(app)
      .get("/api/lagu")
      .query({ genre: jazz })
      .expect(200);
    const body = daftarLaguResponseSchema.parse(res.body);

    expect(body.data.map((lagu) => lagu.judul).sort()).toEqual([
      "Jazz Dua",
      "Jazz Satu",
    ]);
    expect(body.meta.total).toBe(2);
    expect(body.data.every((lagu) => lagu.genre.id === jazz)).toBe(true);
  });

  it("membagi daftar Lagu per halaman dengan meta yang benar", async () => {
    const pop = await buatGenre("Pop");
    const tanggal = [
      ["Lagu A", "2024-05-01"],
      ["Lagu B", "2024-04-01"],
      ["Lagu C", "2024-03-01"],
      ["Lagu D", "2024-02-01"],
      ["Lagu E", "2024-01-01"],
    ] as const;
    for (const [judul, tanggalRilis] of tanggal) {
      await buatLagu({ judul, artis: "Artis Uji", genreId: pop, tanggalRilis });
    }

    const res = await request(app)
      .get("/api/lagu")
      .query({ halaman: 2, ukuran: 2 })
      .expect(200);
    const body = daftarLaguResponseSchema.parse(res.body);

    expect(body.data.map((lagu) => lagu.judul)).toEqual(["Lagu C", "Lagu D"]);
    expect(body.meta).toEqual({
      halaman: 2,
      ukuran: 2,
      total: 5,
      totalHalaman: 3,
    });
  });

  it("menolak parameter yang tidak valid", async () => {
    const res = await request(app)
      .get("/api/lagu")
      .query({ genre: "bukan-angka" })
      .expect(400);

    expect(galatResponseSchema.parse(res.body).pesan).toBeTruthy();
  });
});

describe("GET /api/genre", () => {
  it("menampilkan daftar genre berurutan berdasarkan nama", async () => {
    await buatGenre("Rock");
    await buatGenre("Jazz");
    await buatGenre("Dangdut");

    const res = await request(app).get("/api/genre").expect(200);
    const body = daftarGenreResponseSchema.parse(res.body);

    expect(body.data.map((genre) => genre.nama)).toEqual([
      "Dangdut",
      "Jazz",
      "Rock",
    ]);
  });
});

describe("GET /api/lagu/:id", () => {
  it("menampilkan detail Lagu lengkap", async () => {
    const pop = await buatGenre("Pop");
    const id = await buatLagu({
      judul: "Detail Lagu",
      artis: "Artis Detail",
      genreId: pop,
      pencipta: "Pencipta Detail",
      labelRekaman: "Label Detail",
      tanggalRilis: "2023-08-17",
      harga: 42000,
    });

    const res = await request(app).get(`/api/lagu/${id}`).expect(200);
    const body = laguResponseSchema.parse(res.body);

    expect(body.data).toEqual({
      id,
      judul: "Detail Lagu",
      artis: "Artis Detail",
      genre: { id: pop, nama: "Pop" },
      pencipta: "Pencipta Detail",
      labelRekaman: "Label Detail",
      tanggalRilis: "2023-08-17",
      harga: 42000,
    });
  });

  it("menjawab 404 untuk Lagu tersembunyi dan Lagu yang tidak ada", async () => {
    const pop = await buatGenre("Pop");
    const tersembunyi = await buatLagu({
      judul: "Lagu Tersembunyi",
      artis: "Artis Uji",
      genreId: pop,
      tersembunyi: true,
    });

    const resTersembunyi = await request(app)
      .get(`/api/lagu/${tersembunyi}`)
      .expect(404);
    expect(galatResponseSchema.parse(resTersembunyi.body)).toEqual({
      pesan: "Lagu tidak ditemukan",
    });

    const resTidakAda = await request(app).get("/api/lagu/999999").expect(404);
    expect(galatResponseSchema.parse(resTidakAda.body)).toEqual({
      pesan: "Lagu tidak ditemukan",
    });
  });
});

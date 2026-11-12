import pg from "pg";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarGenreResponseSchema,
  daftarLaguResponseSchema,
} from "@musicpedia/shared";
import { createApp } from "../src/app.ts";
import { seedKatalog } from "../src/seed.ts";
import { testDatabaseUrl } from "./global-setup.ts";

const databaseUrl = testDatabaseUrl();
const pool = new pg.Pool({ connectionString: databaseUrl });
const app = createApp({ pool, config: { port: 0, databaseUrl } });

afterAll(() => pool.end());

beforeEach(async () => {
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
});

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

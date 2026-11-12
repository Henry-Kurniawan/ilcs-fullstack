import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarGenreResponseSchema,
  daftarLaguResponseSchema,
} from "@musicpedia/shared";
import { jalankanSeed, seedKatalog } from "../src/seed.ts";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

afterAll(() => ctx.close());

beforeEach(async () => {
  await ctx.reset();
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

  it("menjalankan langkah Admin lalu katalog", async () => {
    await jalankanSeed(pool, ctx.config, () => {});

    const { rows } = await pool.query<{
      email: string;
      peran: string;
    }>("SELECT email, peran FROM akun");
    expect(rows).toEqual([
      { email: ctx.config.adminEmail, peran: "ADMIN" },
    ]);

    const laguRes = await request(app)
      .get("/api/lagu")
      .query({ ukuran: 100 })
      .expect(200);
    expect(daftarLaguResponseSchema.parse(laguRes.body).meta.total).toBe(10);
  });
});

import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarGenreResponseSchema,
  errorResponseSchema,
  genreResponseSchema,
} from "@musicpedia/shared";
import { seedAdmin } from "../src/seed.ts";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

afterAll(() => ctx.close());

const admin = { email: "admin@musikapedia.id", password: "rahasia-admin" };
const pelanggan = { email: "siti@example.com", password: "rahasia123" };

beforeEach(async () => {
  await ctx.reset();
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
  await seedAdmin(pool, admin);
});

async function masukAdmin() {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(admin).expect(200);
  return agent;
}

describe("Kelola Genre oleh Admin", () => {
  it("menambah, mengubah, dan menghapus genre", async () => {
    const agent = await masukAdmin();

    const tambah = await agent
      .post("/api/admin/genre")
      .send({ nama: "  Pop  " })
      .expect(201);
    const genre = genreResponseSchema.parse(tambah.body).data;
    expect(genre.nama).toBe("Pop");

    const ubah = await agent
      .patch(`/api/admin/genre/${genre.id}`)
      .send({ nama: "Pop Indonesia" })
      .expect(200);
    expect(genreResponseSchema.parse(ubah.body).data).toEqual({
      id: genre.id,
      nama: "Pop Indonesia",
    });

    const daftar = await request(app).get("/api/genre").expect(200);
    expect(
      daftarGenreResponseSchema.parse(daftar.body).data.map((item) => item.nama),
    ).toEqual(["Pop Indonesia"]);

    await agent.delete(`/api/admin/genre/${genre.id}`).expect(204);

    const kosong = await request(app).get("/api/genre").expect(200);
    expect(daftarGenreResponseSchema.parse(kosong.body).data).toEqual([]);
  });

  it("menolak nama genre yang sudah ada", async () => {
    const agent = await masukAdmin();
    await agent.post("/api/admin/genre").send({ nama: "Jazz" }).expect(201);

    const res = await agent
      .post("/api/admin/genre")
      .send({ nama: "Jazz" })
      .expect(409);

    expect(errorResponseSchema.parse(res.body).error).toBe(
      "Genre dengan nama itu sudah ada.",
    );
  });

  it("menolak menghapus genre yang masih dipakai Lagu dengan pesan jelas", async () => {
    const agent = await masukAdmin();
    const genre = genreResponseSchema.parse(
      (await agent.post("/api/admin/genre").send({ nama: "Rock" }).expect(201))
        .body,
    ).data;

    await pool.query(
      `INSERT INTO lagu
         (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga)
       VALUES ('Lagu Rock', 'Artis Rock', $1, 'Pencipta', 'Label', '2024-01-01', 10000)`,
      [genre.id],
    );

    const res = await agent
      .delete(`/api/admin/genre/${genre.id}`)
      .expect(409);

    expect(errorResponseSchema.parse(res.body).error).toBe(
      "Genre tidak bisa dihapus karena masih dipakai oleh Lagu.",
    );
  });

  it("hanya mengizinkan Admin", async () => {
    const pengunjung = await request(app)
      .post("/api/admin/genre")
      .send({ nama: "Dangdut" })
      .expect(401);
    expect(errorResponseSchema.parse(pengunjung.body).code).toBe("BELUM_MASUK");

    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(pelanggan).expect(201);

    const res = await agent
      .post("/api/admin/genre")
      .send({ nama: "Dangdut" })
      .expect(403);
    expect(errorResponseSchema.parse(res.body).code).toBe("AKSES_DITOLAK");
  });
});

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarLaguAdminResponseSchema,
  daftarLaguResponseSchema,
  errorResponseSchema,
  laguAdminResponseSchema,
  laguResponseSchema,
} from "@musicpedia/shared";
import { seedAdmin } from "../src/seed.ts";
import {
  buatBerkasBukanAudio,
  buatNadaMp3,
  durasiAudio,
} from "./audio-helper.ts";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

afterAll(() => ctx.close());

const admin = { email: "admin@musikapedia.id", password: "rahasia-admin" };
const pelanggan = { email: "siti@example.com", password: "rahasia123" };

let nadaMp3: string;
let bukanAudio: string;

beforeAll(async () => {
  nadaMp3 = await buatNadaMp3(40);
  bukanAudio = await buatBerkasBukanAudio();
});

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

async function buatGenreDb(nama = "Pop"): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO genre (nama) VALUES ($1) RETURNING id",
    [nama],
  );
  return rows[0]!.id;
}

interface DataLaguUji {
  judul?: string;
  artis?: string;
  pencipta?: string;
  labelRekaman?: string;
  tanggalRilis?: string;
  harga?: number;
}

function kirimTambahLagu(
  agent: ReturnType<typeof request.agent>,
  genreId: number,
  data: DataLaguUji = {},
) {
  return agent
    .post("/api/admin/lagu")
    .field("judul", data.judul ?? "Cahaya Pagi")
    .field("artis", data.artis ?? "Rina Prasetya")
    .field("genreId", String(genreId))
    .field("pencipta", data.pencipta ?? "Rina Prasetya")
    .field("labelRekaman", data.labelRekaman ?? "Musika Records")
    .field("tanggalRilis", data.tanggalRilis ?? "2024-09-12")
    .field("harga", String(data.harga ?? 25000))
    .attach("fileMp3", nadaMp3, {
      filename: "nada.mp3",
      contentType: "audio/mpeg",
    });
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

async function durasiDariBody(body: Buffer): Promise<number> {
  const direktori = await mkdtemp(path.join(tmpdir(), "musicpedia-trial-"));
  const berkas = path.join(direktori, "trial.mp3");
  await writeFile(berkas, body);
  return durasiAudio(berkas);
}

describe("Admin menambah dan mengubah Lagu", () => {
  it("menambah Lagu dengan mp3 dan semua field", async () => {
    const agent = await masukAdmin();
    const genreId = await buatGenreDb("Pop");

    const res = await kirimTambahLagu(agent, genreId).expect(201);
    const lagu = laguAdminResponseSchema.parse(res.body).data;

    expect(lagu).toEqual({
      id: expect.any(Number),
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genre: { id: genreId, nama: "Pop" },
      pencipta: "Rina Prasetya",
      labelRekaman: "Musika Records",
      tanggalRilis: "2024-09-12",
      harga: 25000,
      tersembunyi: false,
    });

    const publik = await request(app).get("/api/lagu").expect(200);
    expect(
      daftarLaguResponseSchema
        .parse(publik.body)
        .data.map((item) => item.judul),
    ).toEqual(["Cahaya Pagi"]);
  });

  it("menolak berkas yang bukan audio mp3 valid", async () => {
    const agent = await masukAdmin();

    const res = await agent
      .post("/api/admin/lagu")
      .field("judul", "Bukan Audio")
      .field("artis", "Artis Uji")
      .field("genreId", String(await buatGenreDb()))
      .field("pencipta", "Pencipta")
      .field("labelRekaman", "Label")
      .field("tanggalRilis", "2024-01-01")
      .field("harga", "10000")
      .attach("fileMp3", bukanAudio, {
        filename: "palsu.mp3",
        contentType: "audio/mpeg",
      })
      .expect(400);

    expect(errorResponseSchema.parse(res.body).code).toBe("FILE_TIDAK_VALID");

    const daftar = await agent.get("/api/admin/lagu").expect(200);
    expect(daftarLaguAdminResponseSchema.parse(daftar.body).meta.total).toBe(0);
  });

  it("mengubah data dan harga Lagu tanpa mengganti mp3", async () => {
    const agent = await masukAdmin();
    const lagu = laguAdminResponseSchema.parse(
      (await kirimTambahLagu(agent, await buatGenreDb()).expect(201)).body,
    ).data;

    const res = await agent
      .patch(`/api/admin/lagu/${lagu.id}`)
      .field("judul", "Cahaya Malam")
      .field("harga", "31000")
      .expect(200);

    expect(laguAdminResponseSchema.parse(res.body).data).toMatchObject({
      id: lagu.id,
      judul: "Cahaya Malam",
      harga: 31000,
    });
    expect((await request(app).get(`/api/lagu/${lagu.id}`).expect(200)).body)
      .toMatchObject({ data: { judul: "Cahaya Malam", harga: 31000 } });
  });

  it("mengganti mp3 saat mengubah Lagu dan Trial tetap bisa diputar", async () => {
    const agent = await masukAdmin();
    const lagu = laguAdminResponseSchema.parse(
      (await kirimTambahLagu(agent, await buatGenreDb()).expect(201)).body,
    ).data;

    await agent
      .patch(`/api/admin/lagu/${lagu.id}`)
      .attach("fileMp3", nadaMp3, {
        filename: "nada-baru.mp3",
        contentType: "audio/mpeg",
      })
      .expect(200);

    const trial = await request(app)
      .get(`/api/lagu/${lagu.id}/trial`)
      .expect(200);
    expect(trial.headers["content-type"]).toContain("audio/mpeg");
  });
});

describe("Admin menyembunyikan Lagu", () => {
  it("menyembunyikan dan menampilkan kembali Lagu", async () => {
    const agent = await masukAdmin();
    const lagu = laguAdminResponseSchema.parse(
      (await kirimTambahLagu(agent, await buatGenreDb()).expect(201)).body,
    ).data;

    const sembunyi = await agent
      .patch(`/api/admin/lagu/${lagu.id}/tersembunyi`)
      .send({ tersembunyi: true })
      .expect(200);
    expect(laguAdminResponseSchema.parse(sembunyi.body).data.tersembunyi).toBe(
      true,
    );

    expect((await request(app).get("/api/lagu").expect(200)).body).toMatchObject(
      { meta: { total: 0 } },
    );
    await request(app).get(`/api/lagu/${lagu.id}`).expect(404);
    await request(app).get(`/api/lagu/${lagu.id}/trial`).expect(404);

    const daftar = await agent.get("/api/admin/lagu").expect(200);
    const adminBody = daftarLaguAdminResponseSchema.parse(daftar.body);
    expect(adminBody.data).toHaveLength(1);
    expect(adminBody.data[0]).toMatchObject({
      id: lagu.id,
      tersembunyi: true,
    });

    await agent
      .patch(`/api/admin/lagu/${lagu.id}/tersembunyi`)
      .send({ tersembunyi: false })
      .expect(200);

    const publik = await request(app).get("/api/lagu").expect(200);
    expect(daftarLaguResponseSchema.parse(publik.body).meta.total).toBe(1);
  });

  it("menampilkan Lagu tersembunyi di daftar Admin", async () => {
    const agent = await masukAdmin();
    const genreId = await buatGenreDb();
    await pool.query(
      `INSERT INTO lagu
         (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga, tersembunyi)
       VALUES ('Lagu Lama', 'Artis Lama', $1, 'Pencipta', 'Label', '2020-01-01', 9000, true)`,
      [genreId],
    );

    const res = await agent.get("/api/admin/lagu").expect(200);
    expect(
      daftarLaguAdminResponseSchema
        .parse(res.body)
        .data.map((item) => item.judul),
    ).toEqual(["Lagu Lama"]);
  });
});

describe("Admin menghapus Lagu", () => {
  it("menghapus Lagu yang belum pernah terjual", async () => {
    const agent = await masukAdmin();
    const lagu = laguAdminResponseSchema.parse(
      (await kirimTambahLagu(agent, await buatGenreDb()).expect(201)).body,
    ).data;

    await agent.delete(`/api/admin/lagu/${lagu.id}`).expect(204);
    await agent.get(`/api/admin/lagu/${lagu.id}`).expect(404);
    await request(app).get(`/api/lagu/${lagu.id}`).expect(404);
  });

  it("menolak menghapus Lagu yang sudah ada di Item Pembelian dan menyarankan menyembunyikan", async () => {
    const agent = await masukAdmin();
    const lagu = laguAdminResponseSchema.parse(
      (await kirimTambahLagu(agent, await buatGenreDb()).expect(201)).body,
    ).data;

    const { rows: akun } = await pool.query<{ id: number }>(
      "SELECT id FROM akun WHERE email = $1",
      [admin.email],
    );
    const { rows: pembelian } = await pool.query<{ id: number }>(
      `INSERT INTO pembelian (pelanggan_id, status, total)
       VALUES ($1, 'LUNAS', 25000)
       RETURNING id`,
      [akun[0]!.id],
    );
    await pool.query(
      `INSERT INTO item_pembelian (pembelian_id, lagu_id, harga)
       VALUES ($1, $2, 25000)`,
      [pembelian[0]!.id, lagu.id],
    );

    const res = await agent.delete(`/api/admin/lagu/${lagu.id}`).expect(409);
    const body = errorResponseSchema.parse(res.body);
    expect(body.code).toBe("KONFLIK");
    expect(body.error).toContain("Sembunyikan");

    await agent.get(`/api/admin/lagu/${lagu.id}`).expect(200);
  });
});

describe("Trial Lagu", () => {
  it("membuat Trial berdurasi paling lama 30 detik dari mp3 40 detik", async () => {
    const agent = await masukAdmin();
    const lagu = laguAdminResponseSchema.parse(
      (await kirimTambahLagu(agent, await buatGenreDb()).expect(201)).body,
    ).data;

    const res = await request(app)
      .get(`/api/lagu/${lagu.id}/trial`)
      .buffer(true)
      .parse(ambilBiner())
      .expect(200);

    expect(res.headers["content-type"]).toContain("audio/mpeg");
    expect(res.headers["accept-ranges"]).toBe("bytes");
    expect(res.headers["content-disposition"]).toBeUndefined();

    const durasi = await durasiDariBody(res.body as Buffer);
    expect(durasi).toBeGreaterThan(0);
    expect(durasi).toBeLessThanOrEqual(30);
  });

  it("melayani Range dan tidak menyajikan mp3 penuh lewat endpoint publik", async () => {
    const agent = await masukAdmin();
    const lagu = laguAdminResponseSchema.parse(
      (await kirimTambahLagu(agent, await buatGenreDb()).expect(201)).body,
    ).data;

    const penuh = await request(app)
      .get(`/api/lagu/${lagu.id}/trial`)
      .buffer(true)
      .parse(ambilBiner())
      .expect(200);

    const sebagian = await request(app)
      .get(`/api/lagu/${lagu.id}/trial`)
      .set("Range", "bytes=0-99")
      .buffer(true)
      .parse(ambilBiner())
      .expect(206);

    expect(sebagian.headers["content-range"]).toMatch(
      /^bytes 0-99\/\d+$/,
    );
    expect(sebagian.headers["content-length"]).toBe("100");
    expect((sebagian.body as Buffer).length).toBe(100);
    expect(
      (sebagian.body as Buffer).equals((penuh.body as Buffer).subarray(0, 100)),
    ).toBe(true);

    const sufiks = await request(app)
      .get(`/api/lagu/${lagu.id}/trial`)
      .set("Range", "bytes=-50")
      .buffer(true)
      .parse(ambilBiner())
      .expect(206);
    expect((sufiks.body as Buffer).length).toBe(50);

    const tidakValid = await request(app)
      .get(`/api/lagu/${lagu.id}/trial`)
      .set("Range", "bytes=999999999-")
      .expect(416);
    expect(tidakValid.headers["content-range"]).toMatch(/^bytes \*\/\d+$/);

    for (const jalur of ["mp3", "file", "download"]) {
      await request(app).get(`/api/lagu/${lagu.id}/${jalur}`).expect(404);
    }
    // Unduhan mp3 penuh khusus Pelanggan pemilik, jadi Pengunjung ditolak.
    await request(app).get(`/api/lagu/${lagu.id}/unduh`).expect(401);
  });

  it("menjawab 404 saat Lagu tidak punya Trial", async () => {
    const genreId = await buatGenreDb();
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO lagu
         (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga)
       VALUES ('Tanpa Audio', 'Artis', $1, 'Pencipta', 'Label', '2024-01-01', 10000)
       RETURNING id`,
      [genreId],
    );

    const res = await request(app)
      .get(`/api/lagu/${rows[0]!.id}/trial`)
      .expect(404);
    expect(errorResponseSchema.parse(res.body).code).toBe("TIDAK_DITEMUKAN");
  });
});

describe("Akses Admin Lagu", () => {
  it("hanya mengizinkan Admin", async () => {
    const pengunjung = await request(app).get("/api/admin/lagu").expect(401);
    expect(errorResponseSchema.parse(pengunjung.body).code).toBe("BELUM_MASUK");

    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(pelanggan).expect(201);

    const res = await agent.get("/api/admin/lagu").expect(403);
    expect(errorResponseSchema.parse(res.body).code).toBe("AKSES_DITOLAK");
  });

  it("menampilkan detail Lagu tersembunyi untuk Admin", async () => {
    const agent = await masukAdmin();
    const genreId = await buatGenreDb();
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO lagu
         (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga, tersembunyi)
       VALUES ('Rahasia', 'Artis', $1, 'Pencipta', 'Label', '2024-01-01', 10000, true)
       RETURNING id`,
      [genreId],
    );

    const res = await agent
      .get(`/api/admin/lagu/${rows[0]!.id}`)
      .expect(200);
    expect(laguAdminResponseSchema.parse(res.body).data).toMatchObject({
      judul: "Rahasia",
      tersembunyi: true,
    });
  });
});

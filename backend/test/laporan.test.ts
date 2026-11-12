import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { PDFParse } from "pdf-parse";
import {
  errorResponseSchema,
  laporanResponseSchema,
} from "@musicpedia/shared";
import type { Agent } from "supertest";
import { seedAdmin } from "../src/seed.ts";
import { createTestContext } from "./support.ts";

const ctx = createTestContext();
const { app, pool } = ctx;

const ENDPOINT_LAPORAN = [
  "/api/admin/laporan",
  "/api/admin/laporan/pdf",
  "/api/admin/laporan/excel",
];

afterAll(() => ctx.close());

const admin = { email: "admin@musikapedia.id", password: "rahasia-admin" };
const kredensial = { email: "siti@example.com", password: "rahasia123" };

beforeEach(async () => {
  await ctx.reset();
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
  await seedAdmin(pool, admin);
});

async function buatGenre(nama = "Pop"): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO genre (nama) VALUES ($1) RETURNING id",
    [nama],
  );
  return rows[0]!.id;
}

async function buatLagu(input: {
  judul: string;
  artis: string;
  genreId: number;
  harga: number;
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lagu
       (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga)
     VALUES ($1, $2, $3, 'Pencipta Uji', 'Label Uji', '2024-01-01', $4)
     RETURNING id`,
    [input.judul, input.artis, input.genreId, input.harga],
  );
  return rows[0]!.id;
}

async function daftarPelanggan(nama: string): Promise<number> {
  await request(app).post("/api/auth/register").send(kredensial).expect(201);
  const { rows } = await pool.query<{ id: number }>(
    "UPDATE akun SET nama = $1 WHERE email = $2 RETURNING id",
    [nama, kredensial.email],
  );
  return rows[0]!.id;
}

async function catatPembelian(input: {
  pelangganId: number;
  status: "MENUNGGU_PEMBAYARAN" | "LUNAS" | "GAGAL";
  dibayarPada: string | null;
  item: Array<{ laguId: number; harga: number }>;
}): Promise<number> {
  const total = input.item.reduce((jumlah, baris) => jumlah + baris.harga, 0);
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO pembelian
       (pelanggan_id, status, total, dibayar_pada)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.pelangganId, input.status, total, input.dibayarPada],
  );
  const id = rows[0]!.id;
  for (const baris of input.item) {
    await pool.query(
      `INSERT INTO item_pembelian (pembelian_id, lagu_id, harga)
       VALUES ($1, $2, $3)`,
      [id, baris.laguId, baris.harga],
    );
  }
  return id;
}

async function masukAdmin(): Promise<Agent> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send(admin).expect(200);
  return agent;
}

function tangkapBiner(
  res: request.Response,
  callback: (err: Error | null, body: Buffer) => void,
): void {
  const potongan: Buffer[] = [];
  res.on("data", (bagian: Buffer) => potongan.push(bagian));
  res.on("end", () => callback(null, Buffer.concat(potongan)));
}

describe("GET /api/admin/laporan", () => {
  it("menampilkan Item Pembelian dari Pembelian Lunas dalam rentang tanggal", async () => {
    const genreId = await buatGenre();
    const cahaya = await buatLagu({
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genreId,
      harga: 25000,
    });
    const jalan = await buatLagu({
      judul: "Jalan Pulang",
      artis: "Bara Nusantara",
      genreId,
      harga: 30000,
    });
    const pelangganId = await daftarPelanggan("Siti Rahma");
    await catatPembelian({
      pelangganId,
      status: "LUNAS",
      dibayarPada: "2026-11-05T03:00:00.000Z",
      item: [{ laguId: cahaya, harga: 25000 }],
    });
    await catatPembelian({
      pelangganId,
      status: "LUNAS",
      dibayarPada: "2026-11-06T03:00:00.000Z",
      item: [
        { laguId: jalan, harga: 30000 },
        { laguId: cahaya, harga: 25000 },
      ],
    });
    const agent = await masukAdmin();

    const res = await agent
      .get("/api/admin/laporan")
      .query({ dari: "2026-11-01", sampai: "2026-11-30" })
      .expect(200);
    const body = laporanResponseSchema.parse(res.body);

    expect(body.dari).toBe("2026-11-01");
    expect(body.sampai).toBe("2026-11-30");
    expect(body.total).toBe(80000);
    expect(body.data).toHaveLength(3);
    expect(body.data.map((baris) => baris.judul)).toEqual([
      "Cahaya Pagi",
      "Cahaya Pagi",
      "Jalan Pulang",
    ]);
    // Satu Item Pembelian adalah satu Lagu, jadi total tiap baris = harga.
    for (const baris of body.data) {
      expect(baris.total).toBe(baris.harga);
    }
    expect(body.data[2]).toEqual({
      pembelianId: expect.any(Number),
      tanggalBayar: "2026-11-06T03:00:00.000Z",
      judul: "Jalan Pulang",
      artis: "Bara Nusantara",
      pelanggan: "Siti Rahma",
      harga: 30000,
      total: 30000,
    });
  });

  it("mengabaikan Pembelian yang belum Lunas dan di luar rentang tanggal", async () => {
    const genreId = await buatGenre();
    const laguId = await buatLagu({
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genreId,
      harga: 25000,
    });
    const pelangganId = await daftarPelanggan("Siti Rahma");
    await catatPembelian({
      pelangganId,
      status: "MENUNGGU_PEMBAYARAN",
      dibayarPada: null,
      item: [{ laguId, harga: 25000 }],
    });
    await catatPembelian({
      pelangganId,
      status: "GAGAL",
      dibayarPada: null,
      item: [{ laguId, harga: 25000 }],
    });
    await catatPembelian({
      pelangganId,
      status: "LUNAS",
      dibayarPada: "2026-10-31T03:00:00.000Z",
      item: [{ laguId, harga: 25000 }],
    });
    const agent = await masukAdmin();

    const res = await agent
      .get("/api/admin/laporan")
      .query({ dari: "2026-11-01", sampai: "2026-11-30" })
      .expect(200);
    const body = laporanResponseSchema.parse(res.body);

    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("memakai nama Pelanggan, atau email bila nama belum diisi", async () => {
    const genreId = await buatGenre();
    const laguId = await buatLagu({
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genreId,
      harga: 25000,
    });
    await request(app).post("/api/auth/register").send(kredensial).expect(201);
    const { rows } = await pool.query<{ id: number }>(
      "SELECT id FROM akun WHERE email = $1",
      [kredensial.email],
    );
    await catatPembelian({
      pelangganId: rows[0]!.id,
      status: "LUNAS",
      dibayarPada: "2026-11-05T03:00:00.000Z",
      item: [{ laguId, harga: 25000 }],
    });
    const agent = await masukAdmin();

    const res = await agent
      .get("/api/admin/laporan")
      .query({ dari: "2026-11-01", sampai: "2026-11-30" })
      .expect(200);

    expect(laporanResponseSchema.parse(res.body).data[0]!.pelanggan).toBe(
      kredensial.email,
    );
  });

  it("menolak Pengunjung tanpa sesi", async () => {
    for (const endpoint of ENDPOINT_LAPORAN) {
      const res = await request(app)
        .get(endpoint)
        .query({ dari: "2026-11-01", sampai: "2026-11-30" })
        .expect(401);

      expect(errorResponseSchema.parse(res.body).code).toBe("BELUM_MASUK");
    }
  });

  it("menolak Pelanggan yang sudah masuk", async () => {
    await request(app).post("/api/auth/register").send(kredensial).expect(201);
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send(kredensial)
      .expect(200);

    for (const endpoint of ENDPOINT_LAPORAN) {
      const res = await agent
        .get(endpoint)
        .query({ dari: "2026-11-01", sampai: "2026-11-30" })
        .expect(403);

      expect(errorResponseSchema.parse(res.body).code).toBe("AKSES_DITOLAK");
    }
  });

  it("menolak rentang tanggal yang tidak valid", async () => {
    const agent = await masukAdmin();

    const tanpaTanggal = await agent.get("/api/admin/laporan").expect(400);
    expect(errorResponseSchema.parse(tanpaTanggal.body).code).toBe("VALIDASI");

    const terbalik = await agent
      .get("/api/admin/laporan")
      .query({ dari: "2026-11-30", sampai: "2026-11-01" })
      .expect(400);
    expect(errorResponseSchema.parse(terbalik.body).code).toBe("VALIDASI");
  });
});

describe("Rentang tanggal Laporan Penjualan", () => {
  it("memakai batas hari Asia/Jakarta, bukan zona waktu server", async () => {
    const genreId = await buatGenre();
    const laguId = await buatLagu({
      judul: "Cahaya Pagi",
      artis: "Rina Prasetya",
      genreId,
      harga: 25000,
    });
    const pelangganId = await daftarPelanggan("Siti Rahma");
    // 2026-11-01 23:30 WIB dan 2026-11-02 00:30 WIB. Keduanya jatuh pada
    // 2026-11-01 bila dihitung dengan UTC, jadi tes ini membuktikan batas
    // hari dihitung di Asia/Jakarta.
    await catatPembelian({
      pelangganId,
      status: "LUNAS",
      dibayarPada: "2026-11-01T16:30:00.000Z",
      item: [{ laguId, harga: 25000 }],
    });
    await catatPembelian({
      pelangganId,
      status: "LUNAS",
      dibayarPada: "2026-11-01T17:30:00.000Z",
      item: [{ laguId, harga: 25000 }],
    });
    const agent = await masukAdmin();

    const hariPertama = laporanResponseSchema.parse(
      (
        await agent
          .get("/api/admin/laporan")
          .query({ dari: "2026-11-01", sampai: "2026-11-01" })
          .expect(200)
      ).body,
    );
    expect(hariPertama.data.map((baris) => baris.tanggalBayar)).toEqual([
      "2026-11-01T16:30:00.000Z",
    ]);

    const hariKedua = laporanResponseSchema.parse(
      (
        await agent
          .get("/api/admin/laporan")
          .query({ dari: "2026-11-02", sampai: "2026-11-02" })
          .expect(200)
      ).body,
    );
    expect(hariKedua.data.map((baris) => baris.tanggalBayar)).toEqual([
      "2026-11-01T17:30:00.000Z",
    ]);
  });
});

async function siapkanLaporanContoh(): Promise<void> {
  const genreId = await buatGenre();
  const cahaya = await buatLagu({
    judul: "Cahaya Pagi",
    artis: "Rina Prasetya",
    genreId,
    harga: 25000,
  });
  const gagal = await buatLagu({
    judul: "Lagu Gagal",
    artis: "Artis Gagal",
    genreId,
    harga: 99000,
  });
  const pelangganId = await daftarPelanggan("Siti Rahma");
  await catatPembelian({
    pelangganId,
    status: "LUNAS",
    dibayarPada: "2026-11-05T03:00:00.000Z",
    item: [{ laguId: cahaya, harga: 25000 }],
  });
  await catatPembelian({
    pelangganId,
    status: "GAGAL",
    dibayarPada: null,
    item: [{ laguId: gagal, harga: 99000 }],
  });
}

describe("Ekspor Laporan Penjualan", () => {
  it("mengunduh PDF yang bisa dibuka dan berisi baris Pembelian Lunas", async () => {
    await siapkanLaporanContoh();
    const agent = await masukAdmin();

    const res = await agent
      .get("/api/admin/laporan/pdf")
      .query({ dari: "2026-11-01", sampai: "2026-11-30" })
      .parse(tangkapBiner)
      .expect(200);

    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain(
      "laporan-penjualan-2026-11-01_2026-11-30.pdf",
    );
    expect(res.body.subarray(0, 5).toString()).toBe("%PDF-");

    const parser = new PDFParse({ data: res.body });
    try {
      const teks = (await parser.getText()).text;
      expect(teks).toContain("Laporan Penjualan");
      expect(teks).toContain("Cahaya Pagi");
      expect(teks).toContain("Rina Prasetya");
      expect(teks).toContain("Siti Rahma");
      expect(teks).toContain("05/11/2026");
      expect(teks).toContain("25.000");
      expect(teks).toContain("Total");
      expect(teks).not.toContain("Lagu Gagal");
    } finally {
      await parser.destroy();
    }
  });

  it("mengunduh Excel yang bisa dibuka dan berisi baris Pembelian Lunas", async () => {
    await siapkanLaporanContoh();
    const agent = await masukAdmin();

    const res = await agent
      .get("/api/admin/laporan/excel")
      .query({ dari: "2026-11-01", sampai: "2026-11-30" })
      .parse(tangkapBiner)
      .expect(200);

    expect(res.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain(
      "laporan-penjualan-2026-11-01_2026-11-30.xlsx",
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
    const sheet = workbook.getWorksheet("Laporan Penjualan");
    expect(sheet).toBeDefined();

    expect(sheet!.getRow(1).values).toEqual([
      undefined,
      "Tanggal Bayar",
      "Lagu",
      "Artis",
      "Pelanggan",
      "Harga",
      "Total",
    ]);
    expect(sheet!.getRow(2).getCell(1).text).toBe("05/11/2026 10:00");
    expect(sheet!.getRow(2).getCell(2).value).toBe("Cahaya Pagi");
    expect(sheet!.getRow(2).getCell(3).value).toBe("Rina Prasetya");
    expect(sheet!.getRow(2).getCell(4).value).toBe("Siti Rahma");
    expect(sheet!.getRow(2).getCell(5).value).toBe(25000);
    expect(sheet!.getRow(2).getCell(6).value).toBe(25000);

    const semuaTeks = sheet!.getSheetValues().flat().join(" ");
    expect(semuaTeks).not.toContain("Lagu Gagal");
    expect(sheet!.getRow(3).getCell(6).value).toBe(25000);
  });
});


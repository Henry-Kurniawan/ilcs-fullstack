import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  daftarPembelianResponseSchema,
  errorResponseSchema,
  type Pembelian,
} from "@musicpedia/shared";
import type { Agent } from "supertest";
import { seedAdmin } from "../src/seed.ts";
import { buatGatewayPalsu } from "./payment-gateway-fake.ts";
import { createTestContext } from "./support.ts";

const SERVER_KEY = "server-rahasia-tes";
process.env.MIDTRANS_SERVER_KEY = SERVER_KEY;
process.env.MIDTRANS_CLIENT_KEY = "client-publik-tes";

const gatewayPalsu = buatGatewayPalsu();
const ctx = createTestContext({ paymentGateway: gatewayPalsu.gateway });
const { app, pool } = ctx;

afterAll(() => ctx.close());

const kredensial = { email: "siti@example.com", password: "rahasia123" };
const admin = { email: "admin@musikapedia.id", password: "rahasia-admin" };

beforeEach(async () => {
  await ctx.reset();
  await pool.query("DELETE FROM lagu");
  await pool.query("DELETE FROM genre");
  await seedAdmin(pool, admin);
  gatewayPalsu.permintaan.length = 0;
  gatewayPalsu.aturGagal(false);
  gatewayPalsu.aturStatus("pending");
  gatewayPalsu.aturFraudStatus(null);
});

async function buatGenre(nama = "Pop"): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO genre (nama) VALUES ($1) RETURNING id",
    [nama],
  );
  return rows[0]!.id;
}

async function buatLagu(input: {
  judul?: string;
  genreId: number;
  harga?: number;
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lagu
       (judul, artis, genre_id, pencipta, label_rekaman, tanggal_rilis, harga)
     VALUES ($1, 'Artis Uji', $2, 'Pencipta Uji', 'Label Uji', '2024-01-01', $3)
     RETURNING id`,
    [input.judul ?? "Cahaya Pagi", input.genreId, input.harga ?? 25000],
  );
  return rows[0]!.id;
}

async function buatPelanggan(email = kredensial.email): Promise<void> {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: kredensial.password })
    .expect(201);
}

async function masuk(email = kredensial.email): Promise<Agent> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email, password: kredensial.password })
    .expect(200);
  return agent;
}

interface PembelianUji {
  agent: Agent;
  pembelian: Pembelian;
  laguId: number;
}

async function siapkanPembelian(): Promise<PembelianUji> {
  await buatPelanggan();
  const genreId = await buatGenre();
  const laguId = await buatLagu({ genreId });
  const agent = await masuk();
  await agent.post("/api/keranjang").send({ laguId }).expect(201);
  const res = await agent.post("/api/pembelian").expect(201);
  return { agent, pembelian: res.body.data, laguId };
}

function tandaTangan(
  kodeOrder: string,
  statusCode: string,
  grossAmount: string,
  kunci = SERVER_KEY,
): string {
  return createHash("sha512")
    .update(`${kodeOrder}${statusCode}${grossAmount}${kunci}`)
    .digest("hex");
}

function notifikasiSah(
  kodeOrder: string,
  total: number,
  transactionStatus: string,
  fraudStatus: string | null = null,
): Record<string, unknown> {
  const statusCode = "200";
  const grossAmount = `${total}.00`;
  return {
    order_id: kodeOrder,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: tandaTangan(kodeOrder, statusCode, grossAmount),
    transaction_status: transactionStatus,
    fraud_status: fraudStatus,
  };
}

async function riwayat(agent: Agent): Promise<Pembelian[]> {
  const res = await agent.get("/api/pembelian").expect(200);
  return daftarPembelianResponseSchema.parse(res.body).data;
}

describe("Notifikasi Midtrans", () => {
  it("menandai Pembelian Lunas saat settlement dan mencatat waktu bayar", async () => {
    const { agent, pembelian } = await siapkanPembelian();
    gatewayPalsu.aturStatus("settlement");

    await request(app)
      .post("/api/webhook/midtrans")
      .send(
        notifikasiSah(
          pembelian.kodeOrder,
          pembelian.total,
          "settlement",
          "accept",
        ),
      )
      .expect(200);

    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("LUNAS");
    expect(setelah[0]!.dibayarPada).not.toBeNull();
  });

  it("menolak signature yang salah tanpa mengubah Pembelian", async () => {
    const { agent, pembelian } = await siapkanPembelian();
    gatewayPalsu.aturStatus("settlement");

    const body = notifikasiSah(
      pembelian.kodeOrder,
      pembelian.total,
      "settlement",
      "accept",
    );
    body.signature_key = tandaTangan(
      pembelian.kodeOrder,
      "200",
      `${pembelian.total}.00`,
      "server-key-yang-salah",
    );

    const res = await request(app)
      .post("/api/webhook/midtrans")
      .send(body)
      .expect(401);

    expect(res.body.code).toBe("SIGNATURE_TIDAK_VALID");
    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("MENUNGGU_PEMBAYARAN");
    expect(setelah[0]!.dibayarPada).toBeNull();
  });

  it("menandai Lunas saat capture dengan fraud accept", async () => {
    const { agent, pembelian } = await siapkanPembelian();
    gatewayPalsu.aturStatus("capture");
    gatewayPalsu.aturFraudStatus("accept");

    await request(app)
      .post("/api/webhook/midtrans")
      .send(
        notifikasiSah(
          pembelian.kodeOrder,
          pembelian.total,
          "capture",
          "accept",
        ),
      )
      .expect(200);

    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("LUNAS");
    expect(setelah[0]!.dibayarPada).not.toBeNull();
  });

  it("mengabaikan capture yang masih ditinjau fraud", async () => {
    const { agent, pembelian } = await siapkanPembelian();
    gatewayPalsu.aturStatus("capture");
    gatewayPalsu.aturFraudStatus("challenge");

    await request(app)
      .post("/api/webhook/midtrans")
      .send(
        notifikasiSah(
          pembelian.kodeOrder,
          pembelian.total,
          "capture",
          "challenge",
        ),
      )
      .expect(200);

    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("MENUNGGU_PEMBAYARAN");
  });

  it.each(["deny", "cancel", "expire"])(
    "menandai Gagal saat %s",
    async (statusMidtrans) => {
      const { agent, pembelian } = await siapkanPembelian();
      gatewayPalsu.aturStatus(statusMidtrans);

      await request(app)
        .post("/api/webhook/midtrans")
        .send(
          notifikasiSah(pembelian.kodeOrder, pembelian.total, statusMidtrans),
        )
        .expect(200);

      const setelah = await riwayat(agent);
      expect(setelah[0]!.status).toBe("GAGAL");
      expect(setelah[0]!.dibayarPada).toBeNull();
    },
  );

  it("mengabaikan status pending dan status yang tidak dikenal", async () => {
    const { agent, pembelian } = await siapkanPembelian();

    for (const statusMidtrans of ["pending", "authorize", "refund"]) {
      gatewayPalsu.aturStatus(statusMidtrans);
      await request(app)
        .post("/api/webhook/midtrans")
        .send(
          notifikasiSah(pembelian.kodeOrder, pembelian.total, statusMidtrans),
        )
        .expect(200);
    }

    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("MENUNGGU_PEMBAYARAN");
    expect(setelah[0]!.dibayarPada).toBeNull();
  });

  it("tidak mempercayai isi notifikasi: status dicek ulang ke Status API", async () => {
    const { agent, pembelian } = await siapkanPembelian();
    gatewayPalsu.aturStatus("pending");

    await request(app)
      .post("/api/webhook/midtrans")
      .send(
        notifikasiSah(
          pembelian.kodeOrder,
          pembelian.total,
          "settlement",
          "accept",
        ),
      )
      .expect(200);

    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("MENUNGGU_PEMBAYARAN");
  });

  it("mengabaikan notifikasi terlambat setelah Pembelian Lunas", async () => {
    const { agent, pembelian } = await siapkanPembelian();
    gatewayPalsu.aturStatus("settlement");

    await request(app)
      .post("/api/webhook/midtrans")
      .send(
        notifikasiSah(
          pembelian.kodeOrder,
          pembelian.total,
          "settlement",
          "accept",
        ),
      )
      .expect(200);

    const lunas = (await riwayat(agent))[0]!;
    gatewayPalsu.aturStatus("expire");
    await request(app)
      .post("/api/webhook/midtrans")
      .send(notifikasiSah(pembelian.kodeOrder, pembelian.total, "expire"))
      .expect(200);

    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("LUNAS");
    expect(setelah[0]!.dibayarPada).toBe(lunas.dibayarPada);
  });

  it("mengabaikan notifikasi terlambat setelah Pembelian Gagal", async () => {
    const { agent, pembelian } = await siapkanPembelian();
    gatewayPalsu.aturStatus("cancel");

    await request(app)
      .post("/api/webhook/midtrans")
      .send(notifikasiSah(pembelian.kodeOrder, pembelian.total, "cancel"))
      .expect(200);

    gatewayPalsu.aturStatus("settlement");
    await request(app)
      .post("/api/webhook/midtrans")
      .send(
        notifikasiSah(
          pembelian.kodeOrder,
          pembelian.total,
          "settlement",
          "accept",
        ),
      )
      .expect(200);

    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("GAGAL");
    expect(setelah[0]!.dibayarPada).toBeNull();
  });

  it("mengabaikan notifikasi untuk kode order yang tidak dikenal", async () => {
    await request(app)
      .post("/api/webhook/midtrans")
      .send(notifikasiSah("MP-tidak-ada", 25000, "settlement", "accept"))
      .expect(200);
  });

  it("tidak mengubah apa pun saat notifikasi Lunas dikirim berulang", async () => {
    const { agent, pembelian } = await siapkanPembelian();
    gatewayPalsu.aturStatus("settlement");
    const body = notifikasiSah(
      pembelian.kodeOrder,
      pembelian.total,
      "settlement",
      "accept",
    );

    await request(app).post("/api/webhook/midtrans").send(body).expect(200);
    const pertama = (await riwayat(agent))[0]!;
    await request(app).post("/api/webhook/midtrans").send(body).expect(200);

    const setelah = await riwayat(agent);
    expect(setelah[0]!.status).toBe("LUNAS");
    expect(setelah[0]!.dibayarPada).toBe(pertama.dibayarPada);
  });
});

describe("Kepemilikan Lagu setelah Lunas", () => {
  it("menolak Lagu yang sudah Lunas dimasukkan lagi ke Keranjang atau di-checkout", async () => {
    const { agent, pembelian, laguId } = await siapkanPembelian();
    gatewayPalsu.aturStatus("settlement");
    await request(app)
      .post("/api/webhook/midtrans")
      .send(
        notifikasiSah(
          pembelian.kodeOrder,
          pembelian.total,
          "settlement",
          "accept",
        ),
      )
      .expect(200);

    const tambah = await agent
      .post("/api/keranjang")
      .send({ laguId })
      .expect(409);
    expect(errorResponseSchema.parse(tambah.body).code).toBe(
      "LAGU_SUDAH_DIMILIKI",
    );

    // Keranjang yang lolos sebelum Pembelian Lunas pun ditolak saat checkout.
    const { rows } = await pool.query<{ id: number }>(
      "SELECT id FROM akun WHERE email = $1",
      [kredensial.email],
    );
    await pool.query(
      "INSERT INTO keranjang (pelanggan_id, lagu_id) VALUES ($1, $2)",
      [rows[0]!.id, laguId],
    );
    const checkout = await agent.post("/api/pembelian").expect(409);
    expect(errorResponseSchema.parse(checkout.body).code).toBe(
      "LAGU_SUDAH_DIMILIKI",
    );
    expect(gatewayPalsu.permintaan).toHaveLength(1);
  });
});

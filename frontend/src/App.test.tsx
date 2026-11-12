// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App.tsx";

type AkunUji = {
  id: number;
  email: string;
  nama: string;
  telepon: string | null;
  peran: "PELANGGAN" | "ADMIN";
  aktif: boolean;
};

const lagu = {
  id: 7,
  judul: "Cahaya Pagi",
  artis: "Rina Prasetya",
  genre: { id: 1, nama: "Pop" },
  pencipta: "Budi Santoso",
  labelRekaman: "Musika Records",
  tanggalRilis: "2024-09-12",
  harga: 25000,
};

const laguAdmin = { ...lagu, tersembunyi: true };

const pembelianUji = [
  {
    id: 21,
    kodeOrder: "MP-21",
    status: "MENUNGGU_PEMBAYARAN",
    total: lagu.harga,
    dibuatPada: "2026-11-11T02:00:00.000Z",
    dibayarPada: null,
    kedaluwarsaPada: "2026-11-12T02:00:00.000Z",
    itemPembelian: [
      {
        laguId: lagu.id,
        judul: lagu.judul,
        artis: lagu.artis,
        harga: lagu.harga,
      },
    ],
  },
  {
    id: 22,
    kodeOrder: "MP-22",
    status: "LUNAS",
    total: lagu.harga,
    dibuatPada: "2026-11-01T02:00:00.000Z",
    dibayarPada: "2026-11-01T02:05:00.000Z",
    kedaluwarsaPada: "2026-11-02T02:00:00.000Z",
    itemPembelian: [
      {
        laguId: lagu.id,
        judul: lagu.judul,
        artis: lagu.artis,
        harga: lagu.harga,
      },
    ],
  },
];

const pelanggan = {
  id: 9,
  email: "siti@example.com",
  nama: "Siti Rahma",
  aktif: true,
};

const laporanPenjualan = {
  dari: "2026-11-01",
  sampai: "2026-11-30",
  total: lagu.harga,
  data: [
    {
      pembelianId: 22,
      tanggalBayar: "2026-11-05T03:00:00.000Z",
      judul: lagu.judul,
      artis: lagu.artis,
      pelanggan: pelanggan.nama,
      harga: lagu.harga,
      total: lagu.harga,
    },
  ],
};

function stubFetch(akun: AkunUji | null = null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.startsWith("/api/auth/me")
        ? { akun }
        : url.startsWith("/api/admin/laporan")
          ? laporanPenjualan
          : url.startsWith("/api/admin/lagu")
          ? {
              data: [laguAdmin],
              meta: { halaman: 1, ukuran: 50, total: 1, totalHalaman: 1 },
            }
          : url.startsWith("/api/keranjang")
            ? {
                data: { items: [lagu], total: lagu.harga, jumlah: 1 },
              }
            : url.startsWith("/api/pembelian")
              ? { data: pembelianUji }
              : url.startsWith("/api/lagu-saya")
              ? { data: [lagu] }
              : url.startsWith("/api/konfigurasi")
                ? {
                    midtransClientKey: "client-publik",
                    midtransSnapUrl:
                      "https://app.sandbox.midtrans.com/snap/snap.js",
                  }
                : url.startsWith("/api/genre")
            ? { data: [lagu.genre] }
            : url.startsWith("/api/admin/pelanggan")
              ? {
                  data: [pelanggan],
                  meta: { halaman: 1, ukuran: 20, total: 1, totalHalaman: 1 },
                }
              : url === `/api/lagu/${lagu.id}`
                ? { data: lagu }
                : {
                    data: [lagu],
                    meta: { halaman: 1, ukuran: 12, total: 1, totalHalaman: 1 },
                  };
      return { ok: true, status: 200, json: async () => body } as Response;
    }),
  );
}

function renderRute(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("menampilkan katalog dengan kotak cari, filter genre, dan tautan masuk untuk Pengunjung", async () => {
  stubFetch(null);
  renderRute("/");

  expect(screen.getByRole("heading", { name: "Katalog Lagu" })).toBeTruthy();
  expect(screen.getByPlaceholderText("Cari judul atau Artis")).toBeTruthy();
  expect(screen.getByLabelText("Genre")).toBeTruthy();
  expect(screen.getByLabelText("Urutan")).toBeTruthy();
  expect(screen.getByRole("option", { name: "Terlaris" })).toBeTruthy();
  expect(await screen.findByRole("link", { name: "Masuk" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Daftar" })).toBeTruthy();
  expect((await screen.findByText("Cahaya Pagi")).textContent).toBe(
    "Cahaya Pagi",
  );
  expect(screen.getByText(/25\.000/)).toBeTruthy();
});

it("menampilkan halaman detail Lagu", async () => {
  stubFetch(null);
  renderRute(`/lagu/${lagu.id}`);

  expect(
    (await screen.findByRole("heading", { name: "Cahaya Pagi" })).textContent,
  ).toBe("Cahaya Pagi");
  expect(screen.getByText("Musika Records")).toBeTruthy();
  expect(screen.getByText("Rina Prasetya")).toBeTruthy();
});

it("menampilkan halaman registrasi", async () => {
  stubFetch(null);
  renderRute("/registrasi");

  expect(await screen.findByRole("heading", { name: "Daftar" })).toBeTruthy();
  expect(screen.getByLabelText("Email")).toBeTruthy();
  expect(screen.getByLabelText("Kata sandi")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Daftar" })).toBeTruthy();
});

it("menampilkan halaman login", async () => {
  stubFetch(null);
  renderRute("/masuk");

  expect(await screen.findByRole("heading", { name: "Masuk" })).toBeTruthy();
  expect(screen.getByLabelText("Email")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Masuk" })).toBeTruthy();
});

it("menampilkan email dan tombol keluar saat Pelanggan sudah masuk", async () => {
  stubFetch({
    id: 1,
    email: "siti@example.com",
    nama: "Siti Rahma",
    telepon: null,
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/");

  expect(await screen.findByText("siti@example.com")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Keluar" })).toBeTruthy();
});

it("menutup area Admin bagi Pengunjung", async () => {
  stubFetch(null);
  renderRute("/admin/lagu");

  expect(
    await screen.findByRole("heading", { name: "Halaman ini khusus Admin" }),
  ).toBeTruthy();
});

it("menampilkan daftar Lagu termasuk yang disembunyikan untuk Admin", async () => {
  stubFetch({
    id: 2,
    email: "admin@musicpedia.id",
    nama: "Admin Musikapedia",
    telepon: null,
    peran: "ADMIN",
    aktif: true,
  });
  renderRute("/admin/lagu");

  expect(await screen.findByRole("heading", { name: "Kelola Lagu" })).toBeTruthy();
  expect(await screen.findByText("Cahaya Pagi")).toBeTruthy();
  expect(screen.getByText("Disembunyikan")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Tampilkan" })).toBeTruthy();
});

it("menampilkan jumlah Lagu di indikator Keranjang pada header", async () => {
  stubFetch({
    id: 1,
    email: "siti@example.com",
    nama: "Siti Rahma",
    telepon: null,
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/");

  expect(
    await screen.findByRole("link", { name: "Keranjang, 1 Lagu" }),
  ).toBeTruthy();
});

it("menampilkan halaman Keranjang Pelanggan", async () => {
  stubFetch({
    id: 1,
    email: "siti@example.com",
    nama: "Siti Rahma",
    telepon: null,
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/keranjang");

  expect(
    await screen.findByRole("heading", { name: "Keranjang" }),
  ).toBeTruthy();
  expect(await screen.findByText("Cahaya Pagi")).toBeTruthy();
  expect(screen.getByText("Rina Prasetya")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Hapus" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Checkout dan bayar" })).toBeTruthy();
  expect(screen.getByText(/^Total/).textContent).toContain("25.000");
});

it("menampilkan riwayat Pembelian dengan status dan aksi melanjutkan", async () => {
  stubFetch({
    id: 1,
    email: "siti@example.com",
    nama: "Siti Rahma",
    telepon: null,
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/pembelian");

  expect(
    await screen.findByRole("heading", { name: "Riwayat Pembelian" }),
  ).toBeTruthy();
  expect(await screen.findByText("Menunggu Pembayaran")).toBeTruthy();
  expect(screen.getByText("Lunas")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Lanjutkan pembayaran" }),
  ).toBeTruthy();
  expect(screen.getAllByText(/^Total/)).toHaveLength(2);
  expect(screen.getAllByText(/^Total/)[0]!.textContent).toContain("25.000");
});

it("mengarahkan Pengunjung ke login saat menambah Lagu ke Keranjang", async () => {
  stubFetch(null);
  renderRute("/");

  const tombol = await screen.findByRole("button", {
    name: "Tambah ke Keranjang",
  });
  fireEvent.click(tombol);

  expect(await screen.findByRole("heading", { name: "Masuk" })).toBeTruthy();
});

it("menampilkan halaman profil Pelanggan", async () => {  stubFetch({
    id: 1,
    email: "siti@example.com",
    nama: "Siti Rahma",
    telepon: null,
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/profil");

  expect(await screen.findByRole("heading", { name: "Profil" })).toBeTruthy();
  expect(screen.getByLabelText("Nama")).toBeTruthy();
  expect(screen.getByLabelText("Telepon")).toBeTruthy();
  expect(screen.getByDisplayValue("Siti Rahma")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Simpan" })).toBeTruthy();
  expect(screen.getByLabelText("Kata sandi lama")).toBeTruthy();
  expect(screen.getByLabelText("Kata sandi baru")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ganti kata sandi" })).toBeTruthy();
});
it("menampilkan area Admin Pelanggan bagi Admin", async () => {
  stubFetch({
    id: 1,
    email: "admin@musicpedia.id",
    nama: "",
    telepon: null,
    peran: "ADMIN",
    aktif: true,
  });
  renderRute("/admin/pelanggan");

  expect(await screen.findByRole("heading", { name: "Pelanggan" })).toBeTruthy();
  expect(screen.getByPlaceholderText("Cari nama atau email")).toBeTruthy();
  expect(await screen.findByText("siti@example.com")).toBeTruthy();
  expect(screen.getByText("Siti Rahma")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ubah" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Nonaktifkan" })).toBeTruthy();
});

it("menutup area Admin Pelanggan bagi Pelanggan", async () => {
  stubFetch({
    id: 2,
    email: "siti@example.com",
    nama: "Siti Rahma",
    telepon: null,
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/admin/pelanggan");

  expect(
    await screen.findByRole("heading", { name: "Halaman ini khusus Admin" }),
  ).toBeTruthy();
});

it("menampilkan Laporan Penjualan dengan tabel dan ekspor untuk Admin", async () => {
  stubFetch({
    id: 2,
    email: "admin@musicpedia.id",
    nama: "Admin Musikapedia",
    telepon: null,
    peran: "ADMIN",
    aktif: true,
  });
  renderRute("/admin/laporan");

  expect(
    await screen.findByRole("heading", { name: "Laporan Penjualan" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Dari tanggal")).toBeTruthy();
  expect(screen.getByLabelText("Sampai tanggal")).toBeTruthy();
  expect(await screen.findByText("Cahaya Pagi")).toBeTruthy();
  expect(screen.getByText("Rina Prasetya")).toBeTruthy();
  expect(screen.getByText("Siti Rahma")).toBeTruthy();
  expect(screen.getByText("05/11/2026 10:00")).toBeTruthy();
  expect(screen.getByText(/^Total:/).textContent).toContain("25.000");
  expect(screen.getByRole("link", { name: "Ekspor PDF" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Ekspor Excel" })).toBeTruthy();
  expect(
    screen.getAllByRole("link", { name: "Laporan" }).length,
  ).toBeGreaterThan(0);
});

it("menampilkan halaman Lagu Saya dengan tombol unduh", async () => {
  stubFetch({
    id: 1,
    email: "siti@example.com",
    nama: "Siti Rahma",
    telepon: null,
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/lagu-saya");

  expect(
    await screen.findByRole("heading", { name: "Lagu Saya" }),
  ).toBeTruthy();
  expect(await screen.findByText("Cahaya Pagi")).toBeTruthy();
  expect(screen.getByText("Rina Prasetya")).toBeTruthy();

  const unduh = screen.getByRole("link", { name: "Unduh mp3" });
  expect(unduh.getAttribute("href")).toBe(`/api/lagu/${lagu.id}/unduh`);
});

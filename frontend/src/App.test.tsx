// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App.tsx";

type AkunUji = {
  id: number;
  email: string;
  nama: string;
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

function stubFetch(akun: AkunUji | null = null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.startsWith("/api/auth/me")
        ? { akun }
        : url.startsWith("/api/keranjang")
          ? {
              data: { items: [lagu], total: lagu.harga, jumlah: 1 },
            }
          : url.startsWith("/api/genre")
            ? { data: [lagu.genre] }
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
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/");

  expect(await screen.findByText("siti@example.com")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Keluar" })).toBeTruthy();
});

it("menampilkan jumlah Lagu di indikator Keranjang pada header", async () => {
  stubFetch({
    id: 1,
    email: "siti@example.com",
    nama: "Siti Rahma",
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
  expect(screen.getByText(/^Total/).textContent).toContain("25.000");
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

it("menampilkan halaman profil Pelanggan", async () => {
  stubFetch({
    id: 1,
    email: "siti@example.com",
    nama: "Siti Rahma",
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/profil");

  expect(await screen.findByRole("heading", { name: "Profil" })).toBeTruthy();
  expect(screen.getByLabelText("Nama")).toBeTruthy();
  expect(screen.getByDisplayValue("Siti Rahma")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Simpan" })).toBeTruthy();
  expect(screen.getByLabelText("Kata sandi lama")).toBeTruthy();
  expect(screen.getByLabelText("Kata sandi baru")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ganti kata sandi" })).toBeTruthy();
});

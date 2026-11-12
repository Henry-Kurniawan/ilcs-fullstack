// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App.tsx";

type AkunUji = {
  id: number;
  email: string;
  peran: "PELANGGAN" | "ADMIN";
  aktif: boolean;
};

function stubSesi(akun: AkunUji | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ akun }),
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

it("menampilkan beranda dengan tautan masuk dan daftar untuk Pengunjung", async () => {
  stubSesi(null);
  renderRute("/");

  expect(screen.getByRole("heading", { name: "MusicPedia" })).toBeTruthy();
  expect(await screen.findByRole("link", { name: "Masuk" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Daftar" })).toBeTruthy();
});

it("menampilkan halaman registrasi", async () => {
  stubSesi(null);
  renderRute("/registrasi");

  expect(
    await screen.findByRole("heading", { name: "Daftar" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Email")).toBeTruthy();
  expect(screen.getByLabelText("Kata sandi")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Daftar" })).toBeTruthy();
});

it("menampilkan halaman login", async () => {
  stubSesi(null);
  renderRute("/masuk");

  expect(await screen.findByRole("heading", { name: "Masuk" })).toBeTruthy();
  expect(screen.getByLabelText("Email")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Masuk" })).toBeTruthy();
});

it("menampilkan email dan tombol keluar saat Pelanggan sudah masuk", async () => {
  stubSesi({
    id: 1,
    email: "siti@example.com",
    peran: "PELANGGAN",
    aktif: true,
  });
  renderRute("/");

  expect(await screen.findByText("siti@example.com")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Keluar" })).toBeTruthy();
});

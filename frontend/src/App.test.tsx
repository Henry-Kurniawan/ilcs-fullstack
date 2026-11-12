// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App.tsx";

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

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.startsWith("/api/genre")
        ? { data: [lagu.genre] }
        : url === `/api/lagu/${lagu.id}`
          ? { data: lagu }
          : {
              data: [lagu],
              meta: { halaman: 1, ukuran: 12, total: 1, totalHalaman: 1 },
            };
      return { ok: true, json: async () => body } as Response;
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("merender halaman katalog dengan kotak cari, filter genre, dan daftar Lagu", async () => {
  stubFetch();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: "Katalog Lagu" }),
  ).toBeTruthy();
  expect(screen.getByPlaceholderText("Cari judul atau Artis")).toBeTruthy();
  expect(screen.getByLabelText("Genre")).toBeTruthy();
  expect(screen.getByLabelText("Urutan")).toBeTruthy();
  expect((await screen.findByText("Cahaya Pagi")).textContent).toBe(
    "Cahaya Pagi",
  );
  expect(screen.getByText(/25\.000/)).toBeTruthy();
});

it("merender halaman detail Lagu", async () => {
  stubFetch();
  render(
    <MemoryRouter initialEntries={[`/lagu/${lagu.id}`]}>
      <App />
    </MemoryRouter>,
  );

  expect(
    (await screen.findByRole("heading", { name: "Cahaya Pagi" })).textContent,
  ).toBe("Cahaya Pagi");
  expect(screen.getByText("Musika Records")).toBeTruthy();
  expect(screen.getByText("Rina Prasetya")).toBeTruthy();
});

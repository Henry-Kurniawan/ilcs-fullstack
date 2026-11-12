// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("merender rute utama dan menampilkan status health", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok", database: "up" }) }),
  );
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "MusicPedia" })).toBeTruthy();
  expect((await screen.findByText("ok")).textContent).toBe("ok");
});

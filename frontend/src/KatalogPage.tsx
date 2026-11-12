import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import {
  daftarGenreResponseSchema,
  daftarLaguResponseSchema,
  type DaftarLaguResponse,
  type Genre,
  type UrutanLagu,
} from "@musicpedia/shared";
import { apiJson } from "./api.ts";
import { formatRupiah, formatTanggal } from "./format.ts";
import { TambahKeranjangButton } from "./components/TambahKeranjangButton.tsx";

type Status = "memuat" | "siap" | "gagal";

export function KatalogPage() {
  const [genreList, setGenreList] = useState<Genre[]>([]);
  const [cariInput, setCariInput] = useState("");
  const [cari, setCari] = useState("");
  const [genre, setGenre] = useState("");
  const [urutan, setUrutan] = useState<UrutanLagu>("terbaru");
  const [halaman, setHalaman] = useState(1);
  const [hasil, setHasil] = useState<DaftarLaguResponse | null>(null);
  const [status, setStatus] = useState<Status>("memuat");

  useEffect(() => {
    const controller = new AbortController();
    apiJson("/api/genre", daftarGenreResponseSchema, {
      signal: controller.signal,
    })
      .then((body) => setGenreList(body.data))
      .catch(() => {
        if (!controller.signal.aborted) setGenreList([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (cari) params.set("cari", cari);
    if (genre) params.set("genre", genre);
    params.set("urutan", urutan);
    params.set("halaman", String(halaman));

    setStatus("memuat");
    apiJson(`/api/lagu?${params.toString()}`, daftarLaguResponseSchema, {
      signal: controller.signal,
    })
      .then((body) => {
        setHasil(body);
        setStatus("siap");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("gagal");
      });
    return () => controller.abort();
  }, [cari, genre, urutan, halaman]);

  function kirimCari(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCari(cariInput.trim());
    setHalaman(1);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Katalog Lagu</h1>
        <p className="mt-2 text-stone-600">
          Temukan Lagu berdasarkan judul atau Artis, lalu buka detailnya.
        </p>
      </div>

      <form
        onSubmit={kirimCari}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="cari" className="sr-only">
            Cari Lagu
          </label>
          <input
            id="cari"
            type="search"
            value={cariInput}
            onChange={(event) => setCariInput(event.target.value)}
            placeholder="Cari judul atau Artis"
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Cari
        </button>
      </form>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="genre" className="mb-1 block text-sm font-medium">
            Genre
          </label>
          <select
            id="genre"
            value={genre}
            onChange={(event) => {
              setGenre(event.target.value);
              setHalaman(1);
            }}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Semua genre</option>
            {genreList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="urutan" className="mb-1 block text-sm font-medium">
            Urutan
          </label>
          <select
            id="urutan"
            value={urutan}
            onChange={(event) => {
              setUrutan(event.target.value as UrutanLagu);
              setHalaman(1);
            }}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="terbaru">Terbaru</option>
            <option value="terlaris">Terlaris</option>
          </select>
        </div>
      </div>

      <section className="mt-8" aria-live="polite">
        {status === "memuat" && (
          <p className="text-sm text-stone-600">Memuat katalog…</p>
        )}
        {status === "gagal" && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gagal memuat katalog. Coba muat ulang halaman.
          </p>
        )}
        {status === "siap" && hasil && hasil.data.length === 0 && (
          <p className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">
            Tidak ada Lagu yang cocok dengan pencarian.
          </p>
        )}
        {status === "siap" && hasil && hasil.data.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hasil.data.map((lagu) => (
              <li key={lagu.id}>
                <article className="h-full rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    {lagu.genre.nama}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    <Link
                      to={`/lagu/${lagu.id}`}
                      className="hover:text-amber-700 hover:underline"
                    >
                      {lagu.judul}
                    </Link>
                  </h2>
                  <p className="text-sm text-stone-600">{lagu.artis}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <span className="text-stone-500">
                      {formatTanggal(lagu.tanggalRilis)}
                    </span>
                    <span className="font-semibold text-stone-900">
                      {formatRupiah(lagu.harga)}
                    </span>
                  </div>
                  <TambahKeranjangButton laguId={lagu.id} ringkas />
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hasil && hasil.meta.totalHalaman > 1 && (
        <nav
          aria-label="Paginasi"
          className="mt-6 flex flex-wrap items-center justify-between gap-3"
        >
          <button
            type="button"
            onClick={() => setHalaman(halaman - 1)}
            disabled={halaman <= 1}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-stone-600">
            Halaman {hasil.meta.halaman} dari {hasil.meta.totalHalaman}
          </span>
          <button
            type="button"
            onClick={() => setHalaman(halaman + 1)}
            disabled={halaman >= hasil.meta.totalHalaman}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Berikutnya
          </button>
        </nav>
      )}
    </main>
  );
}

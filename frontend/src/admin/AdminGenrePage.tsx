import { useCallback, useEffect, useState, type FormEvent } from "react";
import { daftarGenreResponseSchema, type Genre } from "@musicpedia/shared";
import { pesanKesalahan } from "../api.ts";
import { NavigasiAdmin } from "./NavigasiAdmin.tsx";

type Status = "memuat" | "siap" | "gagal";

const kelasInput =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";

export function AdminGenrePage() {
  const [daftar, setDaftar] = useState<Genre[]>([]);
  const [status, setStatus] = useState<Status>("memuat");
  const [pesan, setPesan] = useState<string | null>(null);
  const [namaBaru, setNamaBaru] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [namaEdit, setNamaEdit] = useState("");
  const [mengirim, setMengirim] = useState(false);

  const muat = useCallback(async () => {
    setStatus("memuat");
    try {
      const res = await fetch("/api/genre");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDaftar(daftarGenreResponseSchema.parse(await res.json()).data);
      setStatus("siap");
    } catch {
      setStatus("gagal");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function tambah(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPesan(null);
    setMengirim(true);
    try {
      const res = await fetch("/api/admin/genre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: namaBaru }),
      });
      if (!res.ok) {
        setPesan(await pesanKesalahan(res));
        return;
      }
      setNamaBaru("");
      await muat();
    } catch {
      setPesan("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setMengirim(false);
    }
  }

  async function simpanUbah(id: number) {
    setPesan(null);
    setMengirim(true);
    try {
      const res = await fetch(`/api/admin/genre/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: namaEdit }),
      });
      if (!res.ok) {
        setPesan(await pesanKesalahan(res));
        return;
      }
      setEditId(null);
      setNamaEdit("");
      await muat();
    } catch {
      setPesan("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setMengirim(false);
    }
  }

  async function hapus(genre: Genre) {
    if (!window.confirm(`Hapus genre "${genre.nama}"?`)) return;
    setPesan(null);
    try {
      const res = await fetch(`/api/admin/genre/${genre.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setPesan(await pesanKesalahan(res));
        return;
      }
      await muat();
    } catch {
      setPesan("Tidak bisa menghubungi server. Coba lagi.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Kelola Genre</h1>
      <p className="mt-2 text-slate-600">
        Genre dipakai sebagai filter katalog. Genre yang masih dipakai Lagu
        tidak bisa dihapus.
      </p>

      <NavigasiAdmin aktif="genre" />

      {pesan ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {pesan}
        </p>
      ) : null}

      <form
        onSubmit={tambah}
        className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="namaGenre" className="block text-sm font-medium">
            Nama genre baru
          </label>
          <input
            id="namaGenre"
            value={namaBaru}
            onChange={(event) => setNamaBaru(event.target.value)}
            required
            className={`mt-1 ${kelasInput}`}
          />
        </div>
        <button
          type="submit"
          disabled={mengirim}
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
        >
          Tambah Genre
        </button>
      </form>

      <section className="mt-6" aria-live="polite">
        {status === "memuat" && (
          <p className="text-sm text-slate-600">Memuat genre…</p>
        )}
        {status === "gagal" && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gagal memuat genre. Coba muat ulang halaman.
          </p>
        )}
        {status === "siap" && daftar.length === 0 && (
          <p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Belum ada genre.
          </p>
        )}
        {status === "siap" && daftar.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {daftar.map((genre) => (
              <li
                key={genre.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                {editId === genre.id ? (
                  <>
                    <input
                      value={namaEdit}
                      onChange={(event) => setNamaEdit(event.target.value)}
                      aria-label={`Nama genre ${genre.nama}`}
                      className={kelasInput}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={mengirim}
                        onClick={() => simpanUbah(genre.id)}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
                      >
                        Batal
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{genre.nama}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(genre.id);
                          setNamaEdit(genre.nama);
                        }}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => hapus(genre)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import {
  daftarPelangganResponseSchema,
  pelangganResponseSchema,
  updatePelangganRequestSchema,
  type DaftarPelangganResponse,
  type Pelanggan,
} from "@musicpedia/shared";
import { apiJson, pesanDariError } from "../api.ts";
import { useAuth } from "../auth/AuthContext.tsx";

type Status = "memuat" | "siap" | "gagal";

const kelasInput = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2";

export function AdminPelangganPage() {
  const { akun, memuat } = useAuth();
  const [cariInput, setCariInput] = useState("");
  const [cari, setCari] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [hasil, setHasil] = useState<DaftarPelangganResponse | null>(null);
  const [status, setStatus] = useState<Status>("memuat");
  const [sunting, setSunting] = useState<Pelanggan | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [memprosesId, setMemprosesId] = useState<number | null>(null);

  useEffect(() => {
    if (akun?.peran !== "ADMIN") return;

    const controller = new AbortController();
    const params = new URLSearchParams({ halaman: String(halaman) });
    if (cari) params.set("cari", cari);

    setStatus("memuat");
    apiJson(
      `/api/admin/pelanggan?${params.toString()}`,
      daftarPelangganResponseSchema,
      { signal: controller.signal },
    )
      .then((body) => {
        setHasil(body);
        setStatus("siap");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("gagal");
      });

    return () => controller.abort();
  }, [akun?.peran, cari, halaman]);

  if (memuat) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-slate-600">Memuat…</p>
      </main>
    );
  }

  if (!akun) return <Navigate to="/masuk" replace />;
  if (akun.peran !== "ADMIN") return <Navigate to="/" replace />;

  function kirimCari(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCari(cariInput.trim());
    setHalaman(1);
  }

  function perbaruiBaris(pelanggan: Pelanggan) {
    setHasil((lama) =>
      lama
        ? {
            ...lama,
            data: lama.data.map((baris) =>
              baris.id === pelanggan.id ? pelanggan : baris,
            ),
          }
        : lama,
    );
  }

  async function simpanSuntingan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sunting) return;
    setPesan(null);

    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = updatePelangganRequestSchema.safeParse(data);
    if (!parsed.success) {
      setPesan(parsed.error.issues[0]?.message ?? "Data tidak valid.");
      return;
    }

    setMenyimpan(true);
    try {
      const body = await apiJson(
        `/api/admin/pelanggan/${sunting.id}`,
        pelangganResponseSchema,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      perbaruiBaris(body.data);
      setSunting(null);
      setPesan("Data Pelanggan tersimpan.");
    } catch (error) {
      setPesan(
        pesanDariError(error, "Tidak bisa menghubungi server. Coba lagi."),
      );
    } finally {
      setMenyimpan(false);
    }
  }

  async function ubahStatus(pelanggan: Pelanggan, aktif: boolean) {
    setPesan(null);
    setMemprosesId(pelanggan.id);
    try {
      const body = await apiJson(
        `/api/admin/pelanggan/${pelanggan.id}/aktif`,
        pelangganResponseSchema,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aktif }),
        },
      );
      perbaruiBaris(body.data);
      setPesan(
        aktif
          ? "Pelanggan diaktifkan kembali."
          : "Pelanggan dinonaktifkan dan sesinya langsung berhenti berlaku.",
      );
    } catch (error) {
      setPesan(
        pesanDariError(error, "Tidak bisa menghubungi server. Coba lagi."),
      );
    } finally {
      setMemprosesId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Pelanggan</h1>
        <p className="mt-2 text-stone-600">
          Cari dan ubah data Pelanggan, atau nonaktifkan akunnya. Pelanggan
          tidak pernah dihapus.
        </p>
      </div>

      <form
        onSubmit={kirimCari}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="cariPelanggan" className="sr-only">
            Cari Pelanggan
          </label>
          <input
            id="cariPelanggan"
            type="search"
            value={cariInput}
            onChange={(event) => setCariInput(event.target.value)}
            placeholder="Cari nama atau email"
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

      {sunting ? (
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Ubah data Pelanggan</h2>
          <form
            key={sunting.id}
            onSubmit={simpanSuntingan}
            className="mt-4 space-y-4"
          >
            <div>
              <label htmlFor="namaPelanggan" className="block text-sm font-medium">
                Nama
              </label>
              <input
                id="namaPelanggan"
                name="nama"
                type="text"
                defaultValue={sunting.nama}
                maxLength={100}
                className={kelasInput}
              />
            </div>
            <div>
              <label
                htmlFor="emailPelanggan"
                className="block text-sm font-medium"
              >
                Email
              </label>
              <input
                id="emailPelanggan"
                name="email"
                type="email"
                defaultValue={sunting.email}
                className={kelasInput}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={menyimpan}
                className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {menyimpan ? "Menyimpan…" : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => setSunting(null)}
                className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {pesan ? (
        <p
          role="status"
          className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700"
        >
          {pesan}
        </p>
      ) : null}

      <section className="mt-8" aria-live="polite">
        {status === "memuat" && (
          <p className="text-sm text-stone-600">Memuat daftar Pelanggan…</p>
        )}
        {status === "gagal" && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gagal memuat daftar Pelanggan. Coba muat ulang halaman.
          </p>
        )}
        {status === "siap" && hasil && hasil.data.length === 0 && (
          <p className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">
            Tidak ada Pelanggan yang cocok dengan pencarian.
          </p>
        )}
        {status === "siap" && hasil && hasil.data.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Nama
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {hasil.data.map((pelanggan) => (
                  <tr key={pelanggan.id}>
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {pelanggan.nama || "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {pelanggan.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          pelanggan.aktif
                            ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
                            : "rounded-full bg-stone-200 px-2 py-1 text-xs font-semibold text-stone-700"
                        }
                      >
                        {pelanggan.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPesan(null);
                            setSunting(pelanggan);
                          }}
                          className="rounded-md border border-stone-300 px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          disabled={memprosesId === pelanggan.id}
                          onClick={() => ubahStatus(pelanggan, !pelanggan.aktif)}
                          className="rounded-md border border-stone-300 px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
                        >
                          {pelanggan.aktif ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

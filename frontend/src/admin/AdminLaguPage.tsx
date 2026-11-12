import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  daftarLaguAdminResponseSchema,
  type LaguAdmin,
} from "@musicpedia/shared";
import { apiFetch, apiJson, pesanDariError } from "../api.ts";
import { formatRupiah, formatTanggal } from "../format.ts";
import { NavigasiAdmin } from "./NavigasiAdmin.tsx";

type Status = "memuat" | "siap" | "gagal";

export function AdminLaguPage() {
  const [daftar, setDaftar] = useState<LaguAdmin[]>([]);
  const [status, setStatus] = useState<Status>("memuat");
  const [pesan, setPesan] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setStatus("memuat");
    try {
      const body = await apiJson(
        "/api/admin/lagu?ukuran=200",
        daftarLaguAdminResponseSchema,
      );
      setDaftar(body.data);
      setStatus("siap");
    } catch {
      setStatus("gagal");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function ubahTersembunyi(lagu: LaguAdmin) {
    setPesan(null);
    try {
      await apiFetch(`/api/admin/lagu/${lagu.id}/tersembunyi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tersembunyi: !lagu.tersembunyi }),
      });
      await muat();
    } catch (error) {
      setPesan(
        pesanDariError(error, "Tidak bisa menghubungi server. Coba lagi."),
      );
    }
  }

  async function hapusLagu(lagu: LaguAdmin) {
    if (
      !window.confirm(
        `Hapus Lagu "${lagu.judul}"? Lagu yang pernah terjual tidak bisa dihapus.`,
      )
    ) {
      return;
    }
    setPesan(null);
    try {
      await apiFetch(`/api/admin/lagu/${lagu.id}`, {
        method: "DELETE",
      });
      await muat();
    } catch (error) {
      setPesan(
        pesanDariError(error, "Tidak bisa menghubungi server. Coba lagi."),
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Lagu</h1>
          <p className="mt-2 text-slate-600">
            Tambah, ubah, sembunyikan, dan hapus Lagu beserta Trial-nya.
          </p>
        </div>
        <Link
          to="/admin/lagu/baru"
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Tambah Lagu
        </Link>
      </div>

      <NavigasiAdmin aktif="lagu" />

      {pesan ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {pesan}
        </p>
      ) : null}

      <section className="mt-6" aria-live="polite">
        {status === "memuat" && (
          <p className="text-sm text-slate-600">Memuat daftar Lagu…</p>
        )}
        {status === "gagal" && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gagal memuat daftar Lagu. Coba muat ulang halaman.
          </p>
        )}
        {status === "siap" && daftar.length === 0 && (
          <p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Belum ada Lagu. Tambahkan Lagu pertama.
          </p>
        )}
        {status === "siap" && daftar.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-4 py-3">Genre</th>
                  <th className="px-4 py-3">Tanggal rilis</th>
                  <th className="px-4 py-3">Harga</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((lagu) => (
                  <tr key={lagu.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{lagu.judul}</p>
                      <p className="text-slate-500">{lagu.artis}</p>
                    </td>
                    <td className="px-4 py-3">{lagu.genre.nama}</td>
                    <td className="px-4 py-3">
                      {formatTanggal(lagu.tanggalRilis)}
                    </td>
                    <td className="px-4 py-3">{formatRupiah(lagu.harga)}</td>
                    <td className="px-4 py-3">
                      {lagu.tersembunyi ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                          Disembunyikan
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                          Tampil
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/admin/lagu/${lagu.id}/ubah`}
                          className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Ubah
                        </Link>
                        <button
                          type="button"
                          onClick={() => ubahTersembunyi(lagu)}
                          className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {lagu.tersembunyi ? "Tampilkan" : "Sembunyikan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => hapusLagu(lagu)}
                          className="rounded-md border border-red-200 px-2 py-1 font-medium text-red-700 hover:bg-red-50"
                        >
                          Hapus
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
    </main>
  );
}

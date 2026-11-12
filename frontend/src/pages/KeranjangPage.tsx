import { useState } from "react";
import { Link, Navigate } from "react-router";
import { formatRupiah } from "../format.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { useKeranjang } from "../keranjang/KeranjangContext.tsx";

export function KeranjangPage() {
  const { akun, memuat: memuatAkun } = useAuth();
  const { keranjang, memuat, hapus } = useKeranjang();
  const [menghapus, setMenghapus] = useState<number | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  if (memuatAkun) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-stone-600">Memuat Keranjang…</p>
      </main>
    );
  }

  if (!akun) {
    return (
      <Navigate
        to={`/masuk?lanjut=${encodeURIComponent("/keranjang")}`}
        replace
      />
    );
  }

  async function hapusLagu(laguId: number) {
    setMenghapus(laguId);
    setPesan(null);
    try {
      await hapus(laguId);
    } catch (error) {
      setPesan(
        error instanceof Error
          ? error.message
          : "Gagal menghapus Lagu dari Keranjang.",
      );
    } finally {
      setMenghapus(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Keranjang</h1>
      <p className="mt-2 text-stone-600">
        Lagu yang Anda pilih sebelum checkout. Total dihitung dari harga Lagu
        saat ini.
      </p>

      {pesan ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {pesan}
        </p>
      ) : null}

      {memuat && !keranjang ? (
        <p className="mt-6 text-sm text-stone-600">Memuat Keranjang…</p>
      ) : !keranjang || keranjang.items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-600">Keranjang Anda masih kosong.</p>
          <Link
            to="/"
            className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline"
          >
            Jelajahi katalog Lagu
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {keranjang.items.map((lagu) => (
              <li
                key={lagu.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    {lagu.genre.nama}
                  </p>
                  <h2 className="text-lg font-semibold">
                    <Link
                      to={`/lagu/${lagu.id}`}
                      className="hover:text-amber-700 hover:underline"
                    >
                      {lagu.judul}
                    </Link>
                  </h2>
                  <p className="text-sm text-stone-600">{lagu.artis}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{formatRupiah(lagu.harga)}</span>
                  <button
                    type="button"
                    onClick={() => void hapusLagu(lagu.id)}
                    disabled={menghapus === lagu.id}
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
                  >
                    {menghapus === lagu.id ? "Menghapus…" : "Hapus"}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4">
            <span className="text-sm text-stone-600">
              {keranjang.jumlah} Lagu
            </span>
            <span className="text-lg font-bold">
              Total {formatRupiah(keranjang.total)}
            </span>
          </div>

          <Link
            to="/"
            className="mt-4 inline-block text-sm font-medium text-amber-700 hover:underline"
          >
            ← Lanjut jelajahi katalog
          </Link>
        </>
      )}
    </main>
  );
}

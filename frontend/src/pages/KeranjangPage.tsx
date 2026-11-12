import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { pembelianCheckoutResponseSchema } from "@musicpedia/shared";
import { pesanKesalahan } from "../api.ts";
import { formatRupiah } from "../format.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { useKeranjang } from "../keranjang/KeranjangContext.tsx";
import { bukaSnap } from "../pembelian/snap.ts";

export function KeranjangPage() {
  const { akun, memuat: memuatAkun } = useAuth();
  const { keranjang, memuat, hapus, segarkan } = useKeranjang();
  const navigate = useNavigate();
  const [menghapus, setMenghapus] = useState<number | null>(null);
  const [checkout, setCheckout] = useState(false);
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

  async function checkoutKeranjang() {
    setCheckout(true);
    setPesan(null);
    try {
      const res = await fetch("/api/pembelian", { method: "POST" });
      if (!res.ok) {
        setPesan(await pesanKesalahan(res));
        return;
      }
      const data = pembelianCheckoutResponseSchema.parse(
        await res.json(),
      ).data;
      await segarkan();

      // Keranjang sudah menjadi satu Pembelian Menunggu Pembayaran. Snap
      // dibuka dengan token yang tersimpan; bila ditutup, Pembelian tetap ada
      // dan bisa dilanjutkan dari riwayat.
      await bukaSnap(data.tokenSnap, {
        onSuccess: () => navigate("/pembelian"),
        onPending: () => navigate("/pembelian"),
        onError: () => {
          setPesan("Pembayaran gagal. Silakan coba lagi dari riwayat Pembelian.");
        },
        onClose: () => navigate("/pembelian"),
      });
    } catch (error) {
      setPesan(
        error instanceof Error
          ? error.message
          : "Gagal memulai pembayaran.",
      );
    } finally {
      setCheckout(false);
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
            <span className="text-sm text-stone-600">
              {keranjang.jumlah} Lagu
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-lg font-bold">
                Total {formatRupiah(keranjang.total)}
              </span>
              <button
                type="button"
                onClick={() => void checkoutKeranjang()}
                disabled={checkout}
                className="rounded-md bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {checkout ? "Membuka pembayaran…" : "Checkout dan bayar"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            Semua Lagu di Keranjang dibayar dalam satu Pembelian lewat Midtrans.
          </p>

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

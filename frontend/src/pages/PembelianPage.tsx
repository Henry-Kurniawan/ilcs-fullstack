import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  daftarPembelianResponseSchema,
  pembelianCheckoutResponseSchema,
  type Pembelian,
  type StatusPembelian,
} from "@musicpedia/shared";
import { pesanKesalahan } from "../api.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { formatRupiah, formatTanggalWaktu } from "../format.ts";
import { bukaSnap } from "../pembelian/snap.ts";

const LABEL_STATUS: Record<StatusPembelian, string> = {
  MENUNGGU_PEMBAYARAN: "Menunggu Pembayaran",
  LUNAS: "Lunas",
  GAGAL: "Gagal",
};

const WARNA_STATUS: Record<StatusPembelian, string> = {
  MENUNGGU_PEMBAYARAN: "bg-amber-100 text-amber-800",
  LUNAS: "bg-emerald-100 text-emerald-800",
  GAGAL: "bg-red-100 text-red-700",
};

export function PembelianPage() {
  const { akun, memuat: memuatAkun } = useAuth();
  const [pembelian, setPembelian] = useState<Pembelian[] | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [melanjutkan, setMelanjutkan] = useState<number | null>(null);

  const segarkan = useCallback(async () => {
    setMemuat(true);
    try {
      const res = await fetch("/api/pembelian");
      if (!res.ok) {
        setPesan(await pesanKesalahan(res));
        return;
      }
      setPembelian(
        daftarPembelianResponseSchema.parse(await res.json()).data,
      );
    } catch {
      setPesan("Tidak bisa memuat riwayat Pembelian. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    if (akun?.peran === "PELANGGAN") {
      void segarkan();
    }
  }, [akun, segarkan]);

  if (memuatAkun) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-stone-600">Memuat riwayat Pembelian…</p>
      </main>
    );
  }

  if (!akun) {
    return (
      <Navigate
        to={`/masuk?lanjut=${encodeURIComponent("/pembelian")}`}
        replace
      />
    );
  }

  async function lanjutkanPembayaran(id: number) {
    setMelanjutkan(id);
    setPesan(null);
    try {
      const res = await fetch(`/api/pembelian/${id}/lanjutkan`, {
        method: "POST",
      });
      if (!res.ok) {
        setPesan(await pesanKesalahan(res));
        return;
      }
      const data = pembelianCheckoutResponseSchema.parse(
        await res.json(),
      ).data;
      await bukaSnap(data.tokenSnap, {
        onSuccess: () => void segarkan(),
        onPending: () => void segarkan(),
        onError: () => {
          setPesan("Pembayaran gagal. Silakan coba lagi.");
        },
        onClose: () => void segarkan(),
      });
    } catch (error) {
      setPesan(
        error instanceof Error
          ? error.message
          : "Gagal membuka halaman pembayaran.",
      );
    } finally {
      setMelanjutkan(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Riwayat Pembelian</h1>
      <p className="mt-2 text-stone-600">
        Semua Pembelian Anda beserta statusnya. Pembelian Menunggu Pembayaran
        bisa dilanjutkan tanpa checkout ulang.
      </p>

      {pesan ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {pesan}
        </p>
      ) : null}

      {memuat && !pembelian ? (
        <p className="mt-6 text-sm text-stone-600">
          Memuat riwayat Pembelian…
        </p>
      ) : !pembelian || pembelian.length === 0 ? (
        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-600">Belum ada Pembelian.</p>
          <Link
            to="/"
            className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline"
          >
            Jelajahi katalog Lagu
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {pembelian.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-stone-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    Pembelian #{item.id}
                  </h2>
                  <p className="text-sm text-stone-600">
                    Dibuat {formatTanggalWaktu(item.dibuatPada)}
                  </p>
                  {item.dibayarPada ? (
                    <p className="text-sm text-stone-600">
                      Dibayar {formatTanggalWaktu(item.dibayarPada)}
                    </p>
                  ) : null}
                  {item.status === "MENUNGGU_PEMBAYARAN" ? (
                    <p className="text-sm text-stone-600">
                      Bayar sebelum{" "}
                      {formatTanggalWaktu(item.kedaluwarsaPada)}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${WARNA_STATUS[item.status]}`}
                >
                  {LABEL_STATUS[item.status]}
                </span>
              </div>

              <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
                {item.itemPembelian.map((lagu) => (
                  <li
                    key={lagu.laguId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="font-medium">{lagu.judul}</p>
                      <p className="text-sm text-stone-600">{lagu.artis}</p>
                    </div>
                    <span className="text-sm">{formatRupiah(lagu.harga)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
                <span className="font-semibold">
                  Total {formatRupiah(item.total)}
                </span>
                {item.status === "MENUNGGU_PEMBAYARAN" ? (
                  <button
                    type="button"
                    onClick={() => void lanjutkanPembayaran(item.id)}
                    disabled={melanjutkan === item.id}
                    className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    {melanjutkan === item.id
                      ? "Membuka pembayaran…"
                      : "Lanjutkan pembayaran"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

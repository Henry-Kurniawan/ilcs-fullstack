import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  daftarLaguSayaResponseSchema,
  type Lagu,
} from "@musicpedia/shared";
import { pesanKesalahan } from "../api.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { formatTanggal } from "../format.ts";

type Status = "memuat" | "siap" | "gagal";

export function LaguSayaPage() {
  const { akun, memuat: memuatAkun } = useAuth();
  const [lagu, setLagu] = useState<Lagu[] | null>(null);
  const [status, setStatus] = useState<Status>("memuat");
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (akun?.peran !== "PELANGGAN") return;
    const controller = new AbortController();
    setStatus("memuat");
    fetch("/api/lagu-saya", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          setPesan(await pesanKesalahan(res));
          setStatus("gagal");
          return;
        }
        setLagu(daftarLaguSayaResponseSchema.parse(await res.json()).data);
        setStatus("siap");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPesan("Tidak bisa memuat Lagu Saya. Coba lagi.");
          setStatus("gagal");
        }
      });
    return () => controller.abort();
  }, [akun]);

  if (memuatAkun) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-stone-600">Memuat Lagu Saya…</p>
      </main>
    );
  }

  if (!akun) {
    return (
      <Navigate
        to={`/masuk?lanjut=${encodeURIComponent("/lagu-saya")}`}
        replace
      />
    );
  }

  if (akun.peran !== "PELANGGAN") {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Lagu Saya</h1>
      <p className="mt-2 text-stone-600">
        Semua Lagu yang Anda miliki dari Pembelian Lunas. Unduhan bisa diulang
        tanpa batas, termasuk untuk Lagu yang sudah tidak tampil di katalog.
      </p>

      {pesan ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {pesan}
        </p>
      ) : null}

      {status === "memuat" && !lagu ? (
        <p className="mt-6 text-sm text-stone-600">Memuat Lagu Saya…</p>
      ) : !lagu || lagu.length === 0 ? (
        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-600">
            Belum ada Lagu yang Anda miliki.
          </p>
          <Link
            to="/"
            className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline"
          >
            Jelajahi katalog Lagu
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {lagu.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  {item.genre.nama}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{item.judul}</h2>
                <p className="text-sm text-stone-600">{item.artis}</p>
                <p className="text-xs text-stone-500">
                  Rilis {formatTanggal(item.tanggalRilis)}
                </p>
              </div>
              <a
                href={`/api/lagu/${item.id}/unduh`}
                download
                className="inline-flex items-center justify-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Unduh mp3
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

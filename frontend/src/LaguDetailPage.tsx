import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { laguResponseSchema, type Lagu } from "@musicpedia/shared";
import { formatRupiah, formatTanggal } from "./format.ts";
import { TambahKeranjangButton } from "./components/TambahKeranjangButton.tsx";

type Status = "memuat" | "siap" | "tidak-ada" | "gagal";

export function LaguDetailPage() {
  const { id } = useParams();
  const [lagu, setLagu] = useState<Lagu | null>(null);
  const [status, setStatus] = useState<Status>("memuat");
  const [trialGagal, setTrialGagal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("memuat");
    fetch(`/api/lagu/${id ?? ""}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) {
          setStatus("tidak-ada");
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body) => {
        if (body === null) return;
        setLagu(laguResponseSchema.parse(body).data);
        setStatus("siap");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("gagal");
      });
    return () => controller.abort();
  }, [id]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/"
        className="text-sm font-medium text-amber-700 hover:underline"
      >
        ← Kembali ke katalog
      </Link>

      {status === "memuat" && (
        <p className="mt-6 text-sm text-stone-600">Memuat detail Lagu…</p>
      )}
      {status === "gagal" && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat detail Lagu. Coba muat ulang halaman.
        </p>
      )}
      {status === "tidak-ada" && (
        <p className="mt-6 rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">
          Lagu tidak ditemukan.
        </p>
      )}

      {status === "siap" && lagu && (
        <article className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            {lagu.genre.nama}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {lagu.judul}
          </h1>
          <p className="mt-1 text-lg text-stone-600">{lagu.artis}</p>

          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Pencipta
              </dt>
              <dd className="mt-1 text-sm">{lagu.pencipta}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Label Rekaman
              </dt>
              <dd className="mt-1 text-sm">{lagu.labelRekaman}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Tanggal rilis
              </dt>
              <dd className="mt-1 text-sm">{formatTanggal(lagu.tanggalRilis)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Harga
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatRupiah(lagu.harga)}
              </dd>
            </div>
          </dl>

          <TambahKeranjangButton laguId={lagu.id} />

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Trial 30 detik
            </h2>
            {trialGagal ? (
              <p className="mt-2 text-sm text-slate-600">
                Trial tidak tersedia untuk Lagu ini.
              </p>
            ) : (
              <>
                <audio
                  className="mt-3 w-full"
                  controls
                  preload="metadata"
                  controlsList="nodownload"
                  src={`/api/lagu/${lagu.id}/trial`}
                  onError={() => setTrialGagal(true)}
                >
                  Peramban Anda tidak mendukung pemutar audio.
                </audio>
                <p className="mt-2 text-xs text-slate-500">
                  Trial hanya untuk didengarkan, tidak bisa diunduh.
                </p>
              </>
            )}
          </section>
        </article>
      )}
    </main>
  );
}

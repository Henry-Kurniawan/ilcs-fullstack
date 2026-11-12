import { useEffect, useState, type FormEvent } from "react";
import {
  formatTanggalBayarJakarta,
  laporanResponseSchema,
  type LaporanResponse,
} from "@musicpedia/shared";
import { apiJson } from "../api.ts";
import { formatRupiah } from "../format.ts";
import { NavigasiAdmin } from "./NavigasiAdmin.tsx";

type Status = "memuat" | "siap" | "gagal";

const kelasInput =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";

function rentangBulanIni(): { dari: string; sampai: string } {
  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [tahun, bulan] = hariIni.split("-") as [string, string];
  const hariTerakhir = new Date(
    Date.UTC(Number(tahun), Number(bulan), 0),
  ).getUTCDate();
  return {
    dari: `${tahun}-${bulan}-01`,
    sampai: `${tahun}-${bulan}-${String(hariTerakhir).padStart(2, "0")}`,
  };
}

export function AdminLaporanPage() {
  const [dari, setDari] = useState(() => rentangBulanIni().dari);
  const [sampai, setSampai] = useState(() => rentangBulanIni().sampai);
  const [rentang, setRentang] = useState(rentangBulanIni);
  const [laporan, setLaporan] = useState<LaporanResponse | null>(null);
  const [status, setStatus] = useState<Status>("memuat");
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      dari: rentang.dari,
      sampai: rentang.sampai,
    });

    setStatus("memuat");
    apiJson(`/api/admin/laporan?${params.toString()}`, laporanResponseSchema, {
      signal: controller.signal,
    })
      .then((body) => {
        setLaporan(body);
        setStatus("siap");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("gagal");
      });

    return () => controller.abort();
  }, [rentang]);

  function terapkan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dari > sampai) {
      setPesan("Tanggal awal tidak boleh melewati tanggal akhir.");
      return;
    }
    setPesan(null);
    setRentang({ dari, sampai });
  }

  const paramsEkspor = new URLSearchParams({
    dari: rentang.dari,
    sampai: rentang.sampai,
  }).toString();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Laporan Penjualan</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Rekap Pembelian Lunas pada rentang tanggal, dihitung dengan waktu bayar
        zona Asia/Jakarta.
      </p>

      <NavigasiAdmin aktif="laporan" />

      <form
        onSubmit={terapkan}
        className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="dariTanggal" className="block text-sm font-medium">
            Dari tanggal
          </label>
          <input
            id="dariTanggal"
            type="date"
            required
            value={dari}
            onChange={(event) => setDari(event.target.value)}
            className={kelasInput}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="sampaiTanggal" className="block text-sm font-medium">
            Sampai tanggal
          </label>
          <input
            id="sampaiTanggal"
            type="date"
            required
            value={sampai}
            onChange={(event) => setSampai(event.target.value)}
            className={kelasInput}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Terapkan
        </button>
      </form>

      {pesan ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {pesan}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`/api/admin/laporan/pdf?${paramsEkspor}`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Ekspor PDF
        </a>
        <a
          href={`/api/admin/laporan/excel?${paramsEkspor}`}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Ekspor Excel
        </a>
      </div>

      <section className="mt-6" aria-live="polite">
        {status === "memuat" && (
          <p className="text-sm text-slate-600">Memuat Laporan Penjualan…</p>
        )}
        {status === "gagal" && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gagal memuat Laporan Penjualan. Coba muat ulang halaman.
          </p>
        )}
        {status === "siap" && laporan && laporan.data.length === 0 && (
          <p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Tidak ada Pembelian Lunas pada rentang tanggal ini.
          </p>
        )}
        {status === "siap" && laporan && laporan.data.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Tanggal Bayar
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Lagu
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Artis
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Pelanggan
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Harga
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {laporan.data.map((baris, indeks) => (
                    <tr
                      key={`${baris.pembelianId}-${baris.judul}-${indeks}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatTanggalBayarJakarta(baris.tanggalBayar)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {baris.judul}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{baris.artis}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {baris.pelanggan}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-900">
                        {formatRupiah(baris.harga)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-900">
                        {formatRupiah(baris.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-right text-lg font-semibold">
              Total:{" "}
              <span className="tabular-nums">
                {formatRupiah(laporan.total)}
              </span>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

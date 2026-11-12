import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  daftarGenreResponseSchema,
  laguAdminResponseSchema,
  type Genre,
  type LaguAdmin,
} from "@musicpedia/shared";
import {
  apiFetch,
  apiJson,
  KesalahanApi,
  pesanDariError,
} from "../api.ts";
import { NavigasiAdmin } from "./NavigasiAdmin.tsx";

type Status = "memuat" | "siap" | "tidak-ada" | "gagal";

const kelasInput =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";

export function AdminLaguFormPage() {
  const { id } = useParams();
  const modeUbah = Boolean(id);
  const navigate = useNavigate();

  const [lagu, setLagu] = useState<LaguAdmin | null>(null);
  const [genre, setGenre] = useState<Genre[]>([]);
  const [status, setStatus] = useState<Status>("memuat");
  const [pesan, setPesan] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function muat() {
      try {
        const [bodyGenre, bodyLagu] = await Promise.all([
          apiJson("/api/genre", daftarGenreResponseSchema, {
            signal: controller.signal,
          }),
          modeUbah
            ? apiJson(`/api/admin/lagu/${id ?? ""}`, laguAdminResponseSchema, {
                signal: controller.signal,
              })
            : Promise.resolve(null),
        ]);

        setGenre(bodyGenre.data);
        if (bodyLagu) {
          setLagu(bodyLagu.data);
        }
        setStatus("siap");
      } catch (error) {
        if (controller.signal.aborted) return;
        if (
          modeUbah &&
          error instanceof KesalahanApi &&
          error.status === 404
        ) {
          setStatus("tidak-ada");
          return;
        }
        setStatus("gagal");
      }
    }

    void muat();
    return () => controller.abort();
  }, [id, modeUbah]);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPesan(null);

    const data = new FormData(event.currentTarget);
    data.set("tersembunyi", data.has("tersembunyi") ? "true" : "false");
    const berkas = data.get("fileMp3");
    if (!(berkas instanceof File) || berkas.size === 0) {
      data.delete("fileMp3");
    }

    setMengirim(true);
    try {
      await apiFetch(
        modeUbah ? `/api/admin/lagu/${id ?? ""}` : "/api/admin/lagu",
        { method: modeUbah ? "PATCH" : "POST", body: data },
      );
      navigate("/admin/lagu");
    } catch (error) {
      setPesan(
        pesanDariError(error, "Tidak bisa menghubungi server. Coba lagi."),
      );
    } finally {
      setMengirim(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/admin/lagu"
        className="text-sm font-medium text-amber-700 hover:underline"
      >
        ← Kembali ke daftar Lagu
      </Link>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {modeUbah ? "Ubah Lagu" : "Tambah Lagu"}
      </h1>
      <p className="mt-2 text-slate-600">
        {modeUbah
          ? "Perbarui data Lagu. Unggah mp3 baru hanya bila ingin menggantinya."
          : "Unggah mp3; Trial 30 detik dibuat otomatis dari berkas itu."}
      </p>

      <NavigasiAdmin aktif="lagu" />

      {status === "memuat" && (
        <p className="mt-6 text-sm text-slate-600">Memuat data…</p>
      )}
      {status === "tidak-ada" && (
        <p className="mt-6 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Lagu tidak ditemukan.
        </p>
      )}
      {status === "gagal" && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat data Lagu. Coba muat ulang halaman.
        </p>
      )}

      {status === "siap" && (
        <form
          onSubmit={kirim}
          className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="judul" className="block text-sm font-medium">
                Judul
              </label>
              <input
                id="judul"
                name="judul"
                required
                defaultValue={lagu?.judul ?? ""}
                className={kelasInput}
              />
            </div>
            <div>
              <label htmlFor="artis" className="block text-sm font-medium">
                Artis
              </label>
              <input
                id="artis"
                name="artis"
                required
                defaultValue={lagu?.artis ?? ""}
                className={kelasInput}
              />
            </div>
            <div>
              <label htmlFor="genreId" className="block text-sm font-medium">
                Genre
              </label>
              <select
                id="genreId"
                name="genreId"
                required
                defaultValue={lagu ? String(lagu.genre.id) : ""}
                className={kelasInput}
              >
                <option value="">Pilih genre</option>
                {genre.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pencipta" className="block text-sm font-medium">
                Pencipta
              </label>
              <input
                id="pencipta"
                name="pencipta"
                required
                defaultValue={lagu?.pencipta ?? ""}
                className={kelasInput}
              />
            </div>
            <div>
              <label
                htmlFor="labelRekaman"
                className="block text-sm font-medium"
              >
                Label Rekaman
              </label>
              <input
                id="labelRekaman"
                name="labelRekaman"
                required
                defaultValue={lagu?.labelRekaman ?? ""}
                className={kelasInput}
              />
            </div>
            <div>
              <label
                htmlFor="tanggalRilis"
                className="block text-sm font-medium"
              >
                Tanggal rilis
              </label>
              <input
                id="tanggalRilis"
                name="tanggalRilis"
                type="date"
                required
                defaultValue={lagu?.tanggalRilis ?? ""}
                className={kelasInput}
              />
            </div>
            <div>
              <label htmlFor="harga" className="block text-sm font-medium">
                Harga (rupiah)
              </label>
              <input
                id="harga"
                name="harga"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={lagu?.harga ?? ""}
                className={kelasInput}
              />
            </div>
            <div>
              <label htmlFor="fileMp3" className="block text-sm font-medium">
                {modeUbah ? "Ganti mp3 (opsional)" : "File mp3"}
              </label>
              <input
                id="fileMp3"
                name="fileMp3"
                type="file"
                accept="audio/mpeg,.mp3"
                required={!modeUbah}
                className={kelasInput}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="tersembunyi"
              defaultChecked={lagu?.tersembunyi ?? false}
              className="h-4 w-4 rounded border-slate-300"
            />
            Sembunyikan dari katalog
          </label>

          {pesan ? (
            <p
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {pesan}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={mengirim}
            className="w-full rounded-md bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 disabled:opacity-60 sm:w-auto"
          >
            {mengirim ? "Menyimpan…" : "Simpan Lagu"}
          </button>
        </form>
      )}
    </main>
  );
}

import { useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import {
  ubahPasswordRequestSchema,
  updateProfilRequestSchema,
} from "@musicpedia/shared";
import { apiFetch, pesanDariError } from "../api.ts";
import { useAuth } from "../auth/AuthContext.tsx";

const kelasInput = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2";

export function ProfilePage() {
  const { akun, memuat, segarkan } = useAuth();
  const [pesanProfil, setPesanProfil] = useState<string | null>(null);
  const [pesanPassword, setPesanPassword] = useState<string | null>(null);
  const [menyimpanProfil, setMenyimpanProfil] = useState(false);
  const [menggantiPassword, setMenggantiPassword] = useState(false);

  if (memuat) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-slate-600">Memuat…</p>
      </main>
    );
  }

  if (!akun) {
    return <Navigate to="/masuk" replace />;
  }

  async function simpanProfil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPesanProfil(null);

    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = updateProfilRequestSchema.safeParse(data);
    if (!parsed.success) {
      setPesanProfil(parsed.error.issues[0]?.message ?? "Data tidak valid.");
      return;
    }

    setMenyimpanProfil(true);
    try {
      await apiFetch("/api/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      await segarkan();
      setPesanProfil("Profil tersimpan.");
    } catch (error) {
      setPesanProfil(
        pesanDariError(error, "Tidak bisa menghubungi server. Coba lagi."),
      );
    } finally {
      setMenyimpanProfil(false);
    }
  }

  async function gantiPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPesanPassword(null);
    const form = event.currentTarget;

    const data = Object.fromEntries(new FormData(form));
    const parsed = ubahPasswordRequestSchema.safeParse(data);
    if (!parsed.success) {
      setPesanPassword(parsed.error.issues[0]?.message ?? "Data tidak valid.");
      return;
    }

    setMenggantiPassword(true);
    try {
      await apiFetch("/api/profil/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      form.reset();
      setPesanPassword("Kata sandi berhasil diganti.");
    } catch (error) {
      setPesanPassword(
        pesanDariError(error, "Tidak bisa menghubungi server. Coba lagi."),
      );
    } finally {
      setMenggantiPassword(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Profil</h1>
      <p className="mt-2 text-slate-600">
        Kelola data pribadi dan kata sandi akun Pelanggan Anda.
      </p>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Data pribadi</h2>

        <form onSubmit={simpanProfil} className="mt-5 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={akun.email}
              readOnly
              disabled
              className={`${kelasInput} bg-slate-100 text-slate-500`}
            />
            <p className="mt-1 text-sm text-slate-500">
              Email tidak dapat diubah.
            </p>
          </div>

          <div>
            <label htmlFor="nama" className="block text-sm font-medium">
              Nama
            </label>
            <input
              key={akun.nama}
              id="nama"
              name="nama"
              type="text"
              autoComplete="name"
              defaultValue={akun.nama}
              required
              maxLength={100}
              className={kelasInput}
            />
          </div>

          {pesanProfil ? (
            <p
              role="status"
              className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700"
            >
              {pesanProfil}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={menyimpanProfil}
            className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {menyimpanProfil ? "Menyimpan…" : "Simpan"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Ganti kata sandi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Masukkan kata sandi lama untuk memastikan akun ini benar milik Anda.
        </p>

        <form onSubmit={gantiPassword} className="mt-5 space-y-5">
          <div>
            <label htmlFor="passwordLama" className="block text-sm font-medium">
              Kata sandi lama
            </label>
            <input
              id="passwordLama"
              name="passwordLama"
              type="password"
              autoComplete="current-password"
              required
              className={kelasInput}
            />
          </div>

          <div>
            <label htmlFor="passwordBaru" className="block text-sm font-medium">
              Kata sandi baru
            </label>
            <input
              id="passwordBaru"
              name="passwordBaru"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={kelasInput}
            />
            <p className="mt-1 text-sm text-slate-500">Minimal 8 karakter.</p>
          </div>

          {pesanPassword ? (
            <p
              role="status"
              className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700"
            >
              {pesanPassword}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={menggantiPassword}
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {menggantiPassword ? "Memproses…" : "Ganti kata sandi"}
          </button>
        </form>
      </section>
    </main>
  );
}

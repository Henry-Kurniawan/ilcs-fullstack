import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { registerRequestSchema } from "@musicpedia/shared";
import { apiFetch, pesanDariError } from "../api.ts";
import { useAuth } from "../auth/AuthContext.tsx";

export function RegisterPage() {
  const { segarkan } = useAuth();
  const navigate = useNavigate();
  const [pesan, setPesan] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPesan(null);

    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = registerRequestSchema.safeParse(data);
    if (!parsed.success) {
      setPesan(parsed.error.issues[0]?.message ?? "Data tidak valid.");
      return;
    }

    setMengirim(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      await segarkan();
      navigate("/");
    } catch (error) {
      setPesan(
        pesanDariError(error, "Tidak bisa menghubungi server. Coba lagi."),
      );
    } finally {
      setMengirim(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-bold">Daftar</h1>
      <p className="mt-2 text-slate-600">
        Buat akun Pelanggan untuk membeli dan mengunduh Lagu.
      </p>

      <form onSubmit={kirim} className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Kata sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <p className="mt-1 text-sm text-slate-500">Minimal 8 karakter.</p>
        </div>

        {pesan ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {pesan}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={mengirim}
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {mengirim ? "Memproses…" : "Daftar"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Sudah punya akun?{" "}
        <Link to="/masuk" className="font-medium text-slate-900 hover:underline">
          Masuk
        </Link>
      </p>
    </main>
  );
}

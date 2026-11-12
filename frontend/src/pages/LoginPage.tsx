import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { loginRequestSchema } from "@musicpedia/shared";
import { pesanKesalahan } from "../api.ts";
import { useAuth } from "../auth/AuthContext.tsx";

export function LoginPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pesan, setPesan] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  function tujuanSetelahMasuk(): string {
    const lanjut = searchParams.get("lanjut");
    if (lanjut && lanjut.startsWith("/") && !lanjut.startsWith("//")) {
      return lanjut;
    }
    return "/";
  }

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPesan(null);

    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = loginRequestSchema.safeParse(data);
    if (!parsed.success) {
      setPesan(parsed.error.issues[0]?.message ?? "Data tidak valid.");
      return;
    }

    setMengirim(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        setPesan(await pesanKesalahan(res));
        return;
      }
      await refresh();
      navigate(tujuanSetelahMasuk());
    } catch {
      setPesan("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-bold">Masuk</h1>
      <p className="mt-2 text-slate-600">
        Masuk untuk mengakses Keranjang dan Lagu milik Anda.
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
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
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
          {mengirim ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Belum punya akun?{" "}
        <Link to="/registrasi" className="font-medium text-slate-900 hover:underline">
          Daftar
        </Link>
      </p>
    </main>
  );
}

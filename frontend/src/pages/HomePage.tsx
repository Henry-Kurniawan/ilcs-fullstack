import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";

export function HomePage() {
  const { akun } = useAuth();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight">MusicPedia</h1>
      <p className="mt-3 text-lg text-slate-600">
        Toko Lagu digital PT Musika Indonesia. Cari, dengarkan Trial, lalu
        miliki mp3-nya.
      </p>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-semibold">Katalog Lagu</h2>
        <p className="mt-2 text-slate-600">
          Katalog dan pencarian Lagu akan segera tersedia di sini.
        </p>
        {akun ? null : (
          <p className="mt-6">
            <Link
              to="/registrasi"
              className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
            >
              Daftar sebagai Pelanggan
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}

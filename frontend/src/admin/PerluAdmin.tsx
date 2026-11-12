import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";

export function PerluAdmin({ children }: { children: ReactNode }) {
  const { akun, memuat } = useAuth();

  if (memuat) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-slate-600">Memuat…</p>
      </main>
    );
  }

  if (akun?.peran !== "ADMIN") {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Halaman ini khusus Admin</h1>
        <p className="mt-2 text-slate-600">
          Masuk dengan akun Admin untuk mengelola katalog MusicPedia.
        </p>
        <Link
          to="/masuk"
          className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          Masuk
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}

import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";

export function Header() {
  const { akun, memuat, logout } = useAuth();
  const navigate = useNavigate();

  async function keluar() {
    await logout();
    navigate("/");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="text-xl font-bold text-slate-900">
          MusicPedia
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {memuat ? null : akun ? (
            <>
              {akun.peran === "ADMIN" ? (
                <Link
                  to="/admin/pelanggan"
                  className="font-medium text-slate-700 hover:underline"
                >
                  Pelanggan
                </Link>
              ) : null}
              <Link
                to="/profil"
                className="font-medium text-slate-700 hover:underline"
              >
                Profil
              </Link>
              <span className="text-slate-600">{akun.email}</span>
              <button
                type="button"
                onClick={keluar}
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
              >
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link to="/masuk" className="font-medium text-slate-700 hover:underline">
                Masuk
              </Link>
              <Link
                to="/registrasi"
                className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
              >
                Daftar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

import { Link } from "react-router";

export function NavigasiAdmin({
  aktif,
}: {
  aktif: "lagu" | "genre" | "laporan";
}) {
  const kelas = (nama: "lagu" | "genre" | "laporan") =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      aktif === nama
        ? "bg-slate-900 text-white"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Navigasi Admin">
      <Link to="/admin/lagu" className={kelas("lagu")}>
        Lagu
      </Link>
      <Link to="/admin/genre" className={kelas("genre")}>
        Genre
      </Link>
      <Link to="/admin/laporan" className={kelas("laporan")}>
        Laporan
      </Link>
    </nav>
  );
}

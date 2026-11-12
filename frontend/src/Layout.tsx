import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight">
            MusicPedia
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

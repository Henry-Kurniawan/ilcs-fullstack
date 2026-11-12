import { Outlet } from "react-router";
import { Header } from "./components/Header.tsx";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <footer className="border-t border-slate-200 px-6 py-4 text-center text-sm text-slate-500">
        MusicPedia — PT Musika Indonesia
      </footer>
    </div>
  );
}

import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";
import { useKeranjang } from "../keranjang/KeranjangContext.tsx";

export function TambahKeranjangButton({
  laguId,
  ringkas = false,
}: {
  laguId: number;
  ringkas?: boolean;
}) {
  const { akun } = useAuth();
  const { tambah } = useKeranjang();
  const navigate = useNavigate();
  const location = useLocation();
  const [mengirim, setMengirim] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  if (akun?.peran === "ADMIN") return null;

  async function klik() {
    if (!akun) {
      const tujuan = `${location.pathname}${location.search}`;
      navigate(`/masuk?lanjut=${encodeURIComponent(tujuan)}`);
      return;
    }

    setMengirim(true);
    setPesan(null);
    try {
      await tambah(laguId);
      setPesan("Ditambahkan ke Keranjang.");
    } catch (error) {
      setPesan(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan Lagu ke Keranjang.",
      );
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className={ringkas ? "mt-3" : "mt-6"}>
      <button
        type="button"
        onClick={klik}
        disabled={mengirim}
        className={
          ringkas
            ? "w-full rounded-md border border-amber-700 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
            : "rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
        }
      >
        {mengirim ? "Menambahkan…" : "Tambah ke Keranjang"}
      </button>
      {pesan ? (
        <p role="status" className="mt-2 text-xs text-stone-600">
          {pesan}
        </p>
      ) : null}
    </div>
  );
}

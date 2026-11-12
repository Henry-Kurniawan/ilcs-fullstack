import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  keranjangResponseSchema,
  type Keranjang,
} from "@musicpedia/shared";
import { pesanKesalahan } from "../api.ts";
import { useAuth } from "../auth/AuthContext.tsx";

interface KeranjangState {
  keranjang: Keranjang | null;
  memuat: boolean;
  segarkan: () => Promise<void>;
  tambah: (laguId: number) => Promise<void>;
  hapus: (laguId: number) => Promise<void>;
}

const KeranjangContext = createContext<KeranjangState | null>(null);

export function KeranjangProvider({ children }: { children: ReactNode }) {
  const { akun } = useAuth();
  const [keranjang, setKeranjang] = useState<Keranjang | null>(null);
  const [memuat, setMemuat] = useState(false);

  const segarkan = useCallback(async () => {
    if (!akun || akun.peran !== "PELANGGAN") {
      setKeranjang(null);
      return;
    }

    setMemuat(true);
    try {
      const res = await fetch("/api/keranjang");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = keranjangResponseSchema.parse(await res.json());
      setKeranjang(body.data);
    } catch {
      setKeranjang(null);
    } finally {
      setMemuat(false);
    }
  }, [akun]);

  useEffect(() => {
    void segarkan();
  }, [segarkan]);

  const tambah = useCallback(async (laguId: number) => {
    const res = await fetch("/api/keranjang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laguId }),
    });
    if (!res.ok) {
      throw new Error(await pesanKesalahan(res));
    }
    const body = keranjangResponseSchema.parse(await res.json());
    setKeranjang(body.data);
  }, []);

  const hapus = useCallback(async (laguId: number) => {
    const res = await fetch(`/api/keranjang/${laguId}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(await pesanKesalahan(res));
    }
    const body = keranjangResponseSchema.parse(await res.json());
    setKeranjang(body.data);
  }, []);

  return (
    <KeranjangContext.Provider
      value={{ keranjang, memuat, segarkan, tambah, hapus }}
    >
      {children}
    </KeranjangContext.Provider>
  );
}

export function useKeranjang(): KeranjangState {
  const context = useContext(KeranjangContext);
  if (!context) {
    throw new Error("useKeranjang harus dipakai di dalam KeranjangProvider");
  }
  return context;
}

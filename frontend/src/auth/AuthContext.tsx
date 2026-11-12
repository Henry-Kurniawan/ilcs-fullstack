import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { meResponseSchema, type Akun } from "@musicpedia/shared";

interface AuthState {
  akun: Akun | null;
  memuat: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [akun, setAkun] = useState<Akun | null>(null);
  const [memuat, setMemuat] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = meResponseSchema.parse(await res.json());
      setAkun(body.akun);
    } catch {
      setAkun(null);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAkun(null);
  }, []);

  return (
    <AuthContext.Provider value={{ akun, memuat, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }
  return context;
}

import { Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { KatalogPage } from "./KatalogPage.tsx";
import { LaguDetailPage } from "./LaguDetailPage.tsx";
import { Layout } from "./Layout.tsx";
import { KeranjangProvider } from "./keranjang/KeranjangContext.tsx";
import { KeranjangPage } from "./pages/KeranjangPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

export function App() {
  return (
    <AuthProvider>
      <KeranjangProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<KatalogPage />} />
            <Route path="lagu/:id" element={<LaguDetailPage />} />
            <Route path="keranjang" element={<KeranjangPage />} />
            <Route path="registrasi" element={<RegisterPage />} />
            <Route path="masuk" element={<LoginPage />} />
          </Route>
        </Routes>
      </KeranjangProvider>
    </AuthProvider>
  );
}

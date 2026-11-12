import { Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { KatalogPage } from "./KatalogPage.tsx";
import { LaguDetailPage } from "./LaguDetailPage.tsx";
import { Layout } from "./Layout.tsx";
import { AdminPelangganPage } from "./pages/AdminPelangganPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<KatalogPage />} />
          <Route path="lagu/:id" element={<LaguDetailPage />} />
          <Route path="registrasi" element={<RegisterPage />} />
          <Route path="masuk" element={<LoginPage />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="admin/pelanggan" element={<AdminPelangganPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

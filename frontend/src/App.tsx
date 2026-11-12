import { Route, Routes } from "react-router";
import { AdminGenrePage } from "./admin/AdminGenrePage.tsx";
import { AdminLaguFormPage } from "./admin/AdminLaguFormPage.tsx";
import { AdminLaguPage } from "./admin/AdminLaguPage.tsx";
import { PerluAdmin } from "./admin/PerluAdmin.tsx";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { KatalogPage } from "./KatalogPage.tsx";
import { LaguDetailPage } from "./LaguDetailPage.tsx";
import { Layout } from "./Layout.tsx";
import { KeranjangProvider } from "./keranjang/KeranjangContext.tsx";
import { KeranjangPage } from "./pages/KeranjangPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
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
            <Route path="profil" element={<ProfilePage />} />
            <Route
              path="admin/lagu"
              element={
                <PerluAdmin>
                  <AdminLaguPage />
                </PerluAdmin>
              }
            />
            <Route
              path="admin/lagu/baru"
              element={
                <PerluAdmin>
                  <AdminLaguFormPage />
                </PerluAdmin>
              }
            />
            <Route
              path="admin/lagu/:id/ubah"
              element={
                <PerluAdmin>
                  <AdminLaguFormPage />
                </PerluAdmin>
              }
            />
            <Route
              path="admin/genre"
              element={
                <PerluAdmin>
                  <AdminGenrePage />
                </PerluAdmin>
              }
            />
          </Route>
        </Routes>
      </KeranjangProvider>
    </AuthProvider>
  );
}

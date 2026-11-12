import { Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { Layout } from "./Layout.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="registrasi" element={<RegisterPage />} />
          <Route path="masuk" element={<LoginPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
